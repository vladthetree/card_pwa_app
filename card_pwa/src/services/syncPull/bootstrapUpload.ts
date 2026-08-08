/**
 * AI_CONTEXT:
 * Role: One-time upload of this device's local state to a fresh/empty server
 * (handshake's needsClientBootstrapUpload path) — decks, cards, optionally review
 * history, shuffle collections, and video notes, filtered to the selected deck scope.
 * Used by: handshake.ts's bootstrapSyncIfNeeded.
 */
import { db, type ReviewRecord, type ShuffleCollectionRecord } from '../../db'
import { getSyncBaseEndpoint, fetchWithTimeout, buildOpId } from '../syncConfig'
import { profileScopeId } from '../profileService'
import { getSelectedDeckFilter } from '../syncedDeckScope'
import {
  getSyncAuthHeaders,
  logSyncApiFailure,
  stringifySyncException,
  syncResponseError,
  hasShuffleCollectionsTable,
  filterSnapshotBySelectedDecks,
} from './shared'

interface BootstrapUploadResponse {
  ok?: boolean
  serverCursor?: number
}

function getBootstrapUploadEndpoint() {
  const base = getSyncBaseEndpoint()
  return base ? `${base}/bootstrap/upload` : null
}

export async function runBootstrapUpload(
  clientId: string,
  options?: { includeReviews?: boolean },
): Promise<BootstrapUploadResponse | null> {
  const endpoint = getBootstrapUploadEndpoint()
  if (!endpoint) return null

  try {
    const activeProfileId = profileScopeId((await db.profile.get('current')) ?? null)
    const [rawDecks, rawCards, rawReviews, shuffleCollections, videoNotes] = await Promise.all([
      db.decks.toArray(),
      db.cards.toArray(),
      options?.includeReviews ? db.reviews.toArray() : Promise.resolve([] as ReviewRecord[]),
      hasShuffleCollectionsTable()
        ? db.shuffleCollections.toArray()
        : Promise.resolve([] as ShuffleCollectionRecord[]),
      db.videoNotes2.where('profileId').equals(activeProfileId).toArray(),
    ])
    const selectedDecks = await getSelectedDeckFilter()
    const {
      decks,
      cards,
      reviews,
    } = filterSnapshotBySelectedDecks(selectedDecks, rawDecks, rawCards, rawReviews)
    const activeCardIds = new Set(cards.filter(card => !card.isDeleted).map(card => card.id))

    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getSyncAuthHeaders(),
      },
      body: JSON.stringify({
        clientId,
        batchId: buildOpId(),
        sentAt: Date.now(),
        decks: decks.map(deck => ({
          id: deck.id,
          name: deck.name,
          parentDeckId: deck.parentDeckId ?? null,
          createdAt: deck.createdAt,
          updatedAt: deck.updatedAt ?? deck.createdAt,
          source: deck.source,
          isDeleted: Boolean(deck.isDeleted),
          deletedAt: deck.deletedAt,
        })),
        cards: cards.map(card => ({
          id: card.id,
          noteId: card.noteId,
          deckId: card.deckId,
          front: card.front,
          back: card.back,
          tags: card.tags,
          extra: card.extra,
          type: card.type,
          queue: card.queue,
          due: card.due,
          dueAt: card.dueAt,
          interval: card.interval,
          factor: card.factor,
          stability: card.stability,
          difficulty: card.difficulty,
          reps: card.reps,
          lapses: card.lapses,
          algorithm: card.algorithm,
          metadata: card.metadata,
          isDeleted: Boolean(card.isDeleted),
          deletedAt: card.deletedAt,
          createdAt: card.createdAt,
          updatedAt: card.updatedAt ?? card.createdAt,
        })),
        reviews: reviews
          .filter(review => activeCardIds.has(review.cardId))
          .map(review => ({
            opId: review.opId,
            cardId: review.cardId,
            rating: review.rating,
            timeMs: review.timeMs,
            timestamp: review.timestamp,
            sourceClient: review.sourceClient,
            createdAt: review.createdAt,
            sessionRunId: review.sessionRunId,
            // Antwortdetails (flach, wie im Dexie-Record) — der Server
            // akzeptiert flach wie verschachtelt.
            selectedAnswer: review.selectedAnswer,
            correctAnswer: review.correctAnswer,
            answerCorrect: review.answerCorrect,
          })),
        shuffleCollections: shuffleCollections.map(collection => ({
          id: collection.id,
          name: collection.name,
          deckIds: collection.deckIds,
          createdAt: collection.createdAt,
          updatedAt: collection.updatedAt,
          isDeleted: Boolean(collection.isDeleted),
          deletedAt: collection.deletedAt,
        })),
        videoNotes: videoNotes.map(note => ({
          profileId: note.profileId,
          objective: note.objective,
          videoId: note.videoId,
          content: note.content,
          tags: note.tags,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        })),
      }),
    })

    if (!response.ok) {
      logSyncApiFailure('bootstrap upload', endpoint, `http_${response.status}`, `status: ${response.status}`)
      return null
    }
    const data = (await response.json()) as BootstrapUploadResponse & { error?: string }
    const apiError = syncResponseError(data)
    if (apiError) {
      logSyncApiFailure('bootstrap upload', endpoint, apiError, `status: ${response.status}`)
      return data
    }
    return data
  } catch (error: unknown) {
    logSyncApiFailure('bootstrap upload', endpoint, stringifySyncException(error))
    return null
  }
}
