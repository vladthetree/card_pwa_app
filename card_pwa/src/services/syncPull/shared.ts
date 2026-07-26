/**
 * AI_CONTEXT:
 * Role: Endpoint/error-logging helpers and sync-meta bookkeeping (cursor, applied-op
 * ids, table-presence checks, selected-deck snapshot filtering) shared by every
 * syncPull phase.
 * Used by: handshake.ts, snapshot.ts, bootstrapUpload.ts, apply.ts, deltaPull.ts.
 * Important: readCursor/writeCursor and the applied-op-id set migrate from a legacy
 * localStorage format to db.syncMeta on first read — keep both paths in sync.
 */
import { db, type CardRecord, type DeckRecord, type ReviewRecord } from '../../db'
import { logError } from '../errorLog'
import { buildAuthHeaders, getSyncConfig } from '../syncConfig'
import { profileScopeId } from '../profileService'
import {
  isReviewDeck,
  isReviewDeckId,
  readReviewDecksEnabledFromStorage,
} from '../../utils/reviewDecks'
import { filterDecksWithActiveCardsOrDescendants } from '../../utils/deckContentScope'

export const SYNC_META_CURSOR_KEY = 'sync-cursor'
export const SYNC_META_APPLIED_OP_IDS_KEY = 'sync-applied-op-ids'
export const SYNC_META_APPLIED_OP_IDS_MAX = 500
const LEGACY_CURSOR_KEY = 'card-pwa-sync-last-cursor'
const LEGACY_APPLIED_OP_IDS_KEY = 'card-pwa-sync-applied-op-ids'
export const SYNC_META_LAST_PULL_KEY = 'sync-last-pull-at'
export const SYNC_META_LAST_PUSH_KEY = 'sync-last-push-at'
export const SYNC_META_BOOTSTRAP_KEY = 'bootstrap-completed-at'

export function getSyncAuthHeaders(): Record<string, string> {
  return buildAuthHeaders(getSyncConfig())
}

export function describeSyncApiTarget(target: string): string {
  try {
    const base = typeof window === 'undefined' ? 'http://card-pwa.local' : window.location.origin
    const url = new URL(target, base)
    return `${url.pathname}${url.search}`
  } catch {
    return target.replace(/^https?:\/\/[^/]+/i, '')
  }
}

export function stringifySyncException(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

export function logSyncApiFailure(action: string, target: string, reason: string, details?: string): void {
  logError(
    'sync-api',
    `Sync API failed: ${action}`,
    [
      `target: ${describeSyncApiTarget(target)}`,
      `reason: ${reason}`,
      details,
    ].filter(Boolean).join('\n'),
  )
}

export function syncResponseError(data: { ok?: boolean; error?: string }): string | null {
  if (data.ok === false) return data.error ?? 'api_not_ok'
  return null
}

export function hasSyncMetaTable(): boolean {
  return Boolean((db as unknown as { syncMeta?: unknown }).syncMeta)
}

export function hasShuffleCollectionsTable(): boolean {
  return Boolean((db as unknown as { shuffleCollections?: unknown }).shuffleCollections)
}

function readLegacyCursor(): number {
  const legacyRaw = localStorage.getItem(LEGACY_CURSOR_KEY)
  const legacyParsed = Number(legacyRaw)
  return Number.isFinite(legacyParsed) && legacyParsed >= 0 ? legacyParsed : 0
}

export async function readCursor(): Promise<number> {
  if (!hasSyncMetaTable()) {
    return readLegacyCursor()
  }

  try {
    const entry = await db.syncMeta.get(SYNC_META_CURSOR_KEY)
    const parsed = Number(entry?.value)
    if (Number.isFinite(parsed) && parsed >= 0) return parsed

    const legacyParsed = readLegacyCursor()
    if (Number.isFinite(legacyParsed) && legacyParsed >= 0) {
      await db.syncMeta.put({ key: SYNC_META_CURSOR_KEY, value: legacyParsed, updatedAt: Date.now() })
      localStorage.removeItem(LEGACY_CURSOR_KEY)
      return legacyParsed
    }

    return 0
  } catch {
    return 0
  }
}

export async function writeCursor(cursor: number): Promise<void> {
  if (!hasSyncMetaTable()) {
    localStorage.setItem(LEGACY_CURSOR_KEY, String(cursor))
    return
  }

  try {
    await db.syncMeta.put({ key: SYNC_META_CURSOR_KEY, value: cursor, updatedAt: Date.now() })
  } catch {
    localStorage.setItem(LEGACY_CURSOR_KEY, String(cursor))
  }
}

export async function readAppliedOpIds(): Promise<Set<string>> {
  if (!hasSyncMetaTable()) {
    try {
      const legacyRaw = localStorage.getItem(LEGACY_APPLIED_OP_IDS_KEY)
      if (!legacyRaw) return new Set<string>()
      const legacyParsed = JSON.parse(legacyRaw)
      if (!Array.isArray(legacyParsed)) return new Set<string>()
      return new Set(legacyParsed.filter((entry): entry is string => typeof entry === 'string'))
    } catch {
      return new Set<string>()
    }
  }

  try {
    const entry = await db.syncMeta.get(SYNC_META_APPLIED_OP_IDS_KEY)
    const parsed = entry?.value
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((entry): entry is string => typeof entry === 'string'))
    }

    const legacyRaw = localStorage.getItem(LEGACY_APPLIED_OP_IDS_KEY)
    if (!legacyRaw) return new Set<string>()

    const legacyParsed = JSON.parse(legacyRaw)
    if (!Array.isArray(legacyParsed)) return new Set<string>()

    const migrated = new Set(legacyParsed.filter((entry): entry is string => typeof entry === 'string'))
    await writeAppliedOpIds(migrated)
    localStorage.removeItem(LEGACY_APPLIED_OP_IDS_KEY)
    return migrated
  } catch {
    return new Set<string>()
  }
}

export async function writeAppliedOpIds(opIds: Set<string>): Promise<void> {
  const limited = Array.from(opIds).slice(-SYNC_META_APPLIED_OP_IDS_MAX)

  if (!hasSyncMetaTable()) {
    localStorage.setItem(LEGACY_APPLIED_OP_IDS_KEY, JSON.stringify(limited))
    return
  }

  try {
    await db.syncMeta.put({ key: SYNC_META_APPLIED_OP_IDS_KEY, value: limited, updatedAt: Date.now() })
  } catch {
    localStorage.setItem(LEGACY_APPLIED_OP_IDS_KEY, JSON.stringify(limited))
  }
}

export async function clearAppliedOpIds(): Promise<void> {
  localStorage.removeItem(LEGACY_APPLIED_OP_IDS_KEY)
  if (!hasSyncMetaTable()) return

  await db.syncMeta.delete(SYNC_META_APPLIED_OP_IDS_KEY).catch(() => {
    // best effort
  })
}

export async function resetSyncPullState(): Promise<void> {
  localStorage.removeItem(LEGACY_CURSOR_KEY)
  localStorage.removeItem(LEGACY_APPLIED_OP_IDS_KEY)
  if (hasSyncMetaTable()) {
    try {
      await db.syncMeta.delete(SYNC_META_CURSOR_KEY)
    } catch {
      // best effort
    }
    try {
      await db.syncMeta.delete(SYNC_META_BOOTSTRAP_KEY)
    } catch {
      // best effort
    }
  }
  await clearAppliedOpIds()
}

export async function writeSyncMetaTimestamp(key: string): Promise<void> {
  if (!hasSyncMetaTable()) return
  try {
    await db.syncMeta.put({ key, value: Date.now(), updatedAt: Date.now() })
  } catch {
    // best effort
  }
}

export async function getLocalCounts() {
  const activeProfileId = profileScopeId((await db.profile.get('current')) ?? null)
  const [cards, decks, reviews, videoNotes] = await Promise.all([
    db.cards.filter(card => !card.isDeleted).count(),
    db.decks.filter(deck => !deck.isDeleted).count(),
    db.reviews.count(),
    db.videoNotes2.where('profileId').equals(activeProfileId).count(),
  ])
  return { cards, decks, reviews, videoNotes }
}

export function filterSnapshotBySelectedDecks(
  selectedDecks: Set<string> | null,
  decks: DeckRecord[],
  cards: CardRecord[],
  reviews: Omit<ReviewRecord, 'id'>[],
): { decks: DeckRecord[]; cards: CardRecord[]; reviews: Omit<ReviewRecord, 'id'>[] } {
  const showReviewDecks = readReviewDecksEnabledFromStorage()

  if (!selectedDecks) {
    if (showReviewDecks) {
      return {
        decks: filterDecksWithActiveCardsOrDescendants(decks, cards),
        cards,
        reviews,
      }
    }

    const filteredDecks = decks.filter(deck => !isReviewDeck(deck))
    const filteredCards = cards.filter(card => !isReviewDeckId(card.deckId))
    const allowedCardIds = new Set(filteredCards.map(card => card.id))
    const filteredReviews = reviews.filter(review => allowedCardIds.has(review.cardId))
    return {
      decks: filterDecksWithActiveCardsOrDescendants(filteredDecks, filteredCards),
      cards: filteredCards,
      reviews: filteredReviews,
    }
  }

  const filteredDecks = decks.filter(deck => {
    if (!showReviewDecks && isReviewDeck(deck)) return false
    return selectedDecks.has(deck.id)
  })
  const allowedDeckIds = new Set(filteredDecks.map(deck => deck.id))
  const filteredCards = cards.filter(card => allowedDeckIds.has(card.deckId))
  const allowedCardIds = new Set(filteredCards.map(card => card.id))
  const filteredReviews = reviews.filter(review => allowedCardIds.has(review.cardId))

  return {
    decks: filterDecksWithActiveCardsOrDescendants(filteredDecks, filteredCards),
    cards: filteredCards,
    reviews: filteredReviews,
  }
}
