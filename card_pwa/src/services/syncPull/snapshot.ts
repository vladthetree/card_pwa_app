/**
 * AI_CONTEXT:
 * Role: Fetches and applies a full server snapshot (decks/cards/reviews/shuffle
 * collections/video notes) — used for first-time linking and for the cursor-behind
 * recovery path. Normalizes the raw payload in a worker, filters it to the selected
 * deck scope, then replaces local state inside one Dexie transaction.
 * Used by: handshake.ts's bootstrapSyncIfNeeded.
 * Important: an empty snapshot is refused when local data already exists (guards
 * against wiping a device from a transient empty-server response).
 */
import { db } from '../../db'
import { createWorker } from '../../utils/workers/workerPool'
import {
  normalizeSnapshotPayload,
  type SnapshotNormalizeRequest,
  type SnapshotNormalizeResult,
} from '../../utils/normalize/snapshot'
import { getSyncBaseEndpoint, fetchWithTimeout } from '../syncConfig'
import { profileScopeId } from '../profileService'
import { getSelectedDeckFilter } from '../syncedDeckScope'
import {
  getSyncAuthHeaders,
  logSyncApiFailure,
  stringifySyncException,
  syncResponseError,
  getLocalCounts,
  filterSnapshotBySelectedDecks,
  writeCursor,
  clearAppliedOpIds,
} from './shared'

interface SnapshotResponse {
  ok?: boolean
  cursor?: number
  decks?: unknown[]
  cards?: unknown[]
  reviews?: unknown[]
  shuffleCollections?: unknown[]
  videoNotes?: unknown[]
}

function getSnapshotEndpoint() {
  const base = getSyncBaseEndpoint()
  return base ? `${base}/snapshot` : null
}

const snapshotNormalizer = createWorker<SnapshotNormalizeRequest, SnapshotNormalizeResult>(
  () => new Worker(new URL('../../utils/workers/snapshot-normalizer.worker.ts', import.meta.url), { type: 'module' }),
  (payload) => normalizeSnapshotPayload(payload),
)

export async function fetchAndApplySnapshot(clientId: string): Promise<boolean> {
  const endpoint = getSnapshotEndpoint()
  if (!endpoint) return false

  try {
    const query = `${endpoint}?clientId=${encodeURIComponent(clientId)}`
    const response = await fetchWithTimeout(query, {
      headers: {
        ...getSyncAuthHeaders(),
      },
    })
    if (!response.ok) {
      logSyncApiFailure('snapshot', query, `http_${response.status}`, `status: ${response.status}`)
      return false
    }

    const data = (await response.json()) as SnapshotResponse & { error?: string }
    const apiError = syncResponseError(data)
    if (apiError) {
      logSyncApiFailure('snapshot', query, apiError, `status: ${response.status}`)
      return false
    }
    const rawDecks = Array.isArray(data.decks) ? data.decks : []
    const rawCards = Array.isArray(data.cards) ? data.cards : []
    const rawReviews = Array.isArray(data.reviews) ? data.reviews : []
    const rawShuffleCollections = Array.isArray(data.shuffleCollections) ? data.shuffleCollections : []
    const rawVideoNotes = Array.isArray(data.videoNotes) ? data.videoNotes : []

    const { decks, cards, reviews, shuffleCollections, videoNotes } = await snapshotNormalizer.run({
      rawDecks,
      rawCards,
      rawReviews,
      rawShuffleCollections,
      rawVideoNotes,
    })

    const selectedDecks = await getSelectedDeckFilter()
    const filtered = filterSnapshotBySelectedDecks(selectedDecks, decks, cards, reviews)
    const snapshotDecks = filtered.decks
    const snapshotCards = filtered.cards
    const snapshotReviews = filtered.reviews

    const localCounts = await getLocalCounts()
    const snapshotIsEmpty = snapshotDecks.length === 0 && snapshotCards.length === 0
    const localHasData = localCounts.decks > 0 || localCounts.cards > 0

    if (snapshotIsEmpty && localHasData) {
      return false
    }

    const activeProfileId = profileScopeId((await db.profile.get('current')) ?? null)
    const noteProfileIds = Array.from(new Set([activeProfileId, ...videoNotes.map(note => note.profileId)]))

    await db.transaction('rw', [db.decks, db.cards, db.reviews, db.shuffleCollections, db.videoNotes2], async () => {
      if (selectedDecks) {
        const selectedDeckIds = Array.from(selectedDecks)
        const existingSelectedCards = await db.cards.where('deckId').anyOf(selectedDeckIds).toArray()
        const existingCardIds = existingSelectedCards.map(card => card.id)
        if (existingCardIds.length > 0) {
          await db.reviews.where('cardId').anyOf(existingCardIds).delete()
        }
        await db.cards.where('deckId').anyOf(selectedDeckIds).delete()
        await db.decks.where('id').anyOf(selectedDeckIds).delete()
      } else {
        const incomingCardIds = new Set(snapshotCards.map(c => c.id))
        const orphanReviewIds: number[] = []
        await db.reviews.each(review => {
          if (!incomingCardIds.has(review.cardId) && review.id !== undefined) {
            orphanReviewIds.push(review.id)
          }
        })
        if (orphanReviewIds.length > 0) {
          await db.reviews.bulkDelete(orphanReviewIds)
        }
        await db.reviews.clear()

        await db.cards.clear()
        await db.decks.clear()
      }

      if (snapshotDecks.length > 0) {
        await db.decks.bulkPut(snapshotDecks)
      }
      if (snapshotCards.length > 0) {
        await db.cards.bulkPut(snapshotCards)
      }
      if (snapshotReviews.length > 0) {
        await db.reviews.bulkAdd(snapshotReviews)
      }

      await db.shuffleCollections.clear()
      if (shuffleCollections.length > 0) {
        await db.shuffleCollections.bulkPut(shuffleCollections)
      }

      for (const profileId of noteProfileIds) {
        if (profileId) await db.videoNotes2.where('profileId').equals(profileId).delete()
      }
      if (videoNotes.length > 0) {
        await db.videoNotes2.bulkPut(videoNotes)
      }
    })

    if (typeof data.cursor === 'number' && Number.isFinite(data.cursor)) {
      await writeCursor(data.cursor)
    } else {
      await writeCursor(0)
    }

    await clearAppliedOpIds()
    return true
  } catch (error: unknown) {
    logSyncApiFailure('snapshot', endpoint, stringifySyncException(error))
    return false
  }
}
