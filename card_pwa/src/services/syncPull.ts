/**
 * AI_CONTEXT:
 * Role: Pull/bootstrap engine for linked profiles; downloads server deltas/snapshots, normalizes payloads, resolves operations, and applies local DB changes.
 * Used by: syncCoordinator after pending local operations are flushed.
 * Important: Pull must respect selected deck scope, applied op IDs, local sync meta, and worker fallbacks for heavy normalization/resolution.
 */
import { db, type CardRecord, type DeckRecord, type ReviewRecord, type ShuffleCollectionRecord } from '../db'
import { buildResetCardRecord } from '../db/queries/reviews'
import type { SyncOperationType } from './syncQueue'
import { flushSyncQueue, getSyncQueuePendingCount } from './syncQueue'
import { createWorker } from '../utils/workers/workerPool'
import { normalizeDeck } from '../utils/normalize/deck'
import { normalizeCard, normalizeCardUpdates } from '../utils/normalize/card'
import { normalizeShuffleCollection } from '../utils/normalize/shuffleCollection'
import { normalizeVideoNote } from '../utils/normalize/videoNote'
import {
  normalizeSnapshotPayload,
  type SnapshotNormalizeRequest,
  type SnapshotNormalizeResult,
} from '../utils/normalize/snapshot'
import {
  resolveOperations,
  supportsWorkerResolution,
  type OperationDiff,
  type ResolverOperation,
} from '../utils/sync/operationResolver'
import {
  getSyncBaseEndpoint,
  getSyncConfig,
  buildAuthHeaders,
  buildOpId,
  getOrCreateSyncClientId,
  fetchWithTimeout,
} from './syncConfig'
import { profileScopeId, readSelectedDeckIds } from './profileService'
import {
  isReviewDeck,
  isReviewDeckId,
  readReviewDecksEnabledFromStorage,
} from '../utils/reviewDecks'
import { filterDecksWithActiveCardsOrDescendants } from '../utils/deckContentScope'
import { logError } from './errorLog'
import { EXAM_DATE_SYNCED_EVENT, STORAGE_KEYS } from '../constants/appIdentity'
import { normalizeExamDateIso, normalizeExamDateUpdatedAt } from '../contexts/SettingsContext'
import { getLearnerExamPlan, saveDraftLearnerExamPlan } from '../db/queries/learningUnits'

const SYNC_META_CURSOR_KEY = 'sync-cursor'
const SYNC_META_APPLIED_OP_IDS_KEY = 'sync-applied-op-ids'
const SYNC_META_APPLIED_OP_IDS_MAX = 500
const LEGACY_CURSOR_KEY = 'card-pwa-sync-last-cursor'
const LEGACY_APPLIED_OP_IDS_KEY = 'card-pwa-sync-applied-op-ids'
const SYNC_META_LAST_PULL_KEY = 'sync-last-pull-at'
const SYNC_META_LAST_PUSH_KEY = 'sync-last-push-at'
const SYNC_META_BOOTSTRAP_KEY = 'bootstrap-completed-at'

function getSyncAuthHeaders(): Record<string, string> {
  return buildAuthHeaders(getSyncConfig())
}

function describeSyncApiTarget(target: string): string {
  try {
    const base = typeof window === 'undefined' ? 'http://card-pwa.local' : window.location.origin
    const url = new URL(target, base)
    return `${url.pathname}${url.search}`
  } catch {
    return target.replace(/^https?:\/\/[^/]+/i, '')
  }
}

function stringifySyncException(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function logSyncApiFailure(action: string, target: string, reason: string, details?: string): void {
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

function syncResponseError(data: { ok?: boolean; error?: string }): string | null {
  if (data.ok === false) return data.error ?? 'api_not_ok'
  return null
}

function hasSyncMetaTable(): boolean {
  return Boolean((db as unknown as { syncMeta?: unknown }).syncMeta)
}

function hasShuffleCollectionsTable(): boolean {
  return Boolean((db as unknown as { shuffleCollections?: unknown }).shuffleCollections)
}

function readLegacyCursor(): number {
  const legacyRaw = localStorage.getItem(LEGACY_CURSOR_KEY)
  const legacyParsed = Number(legacyRaw)
  return Number.isFinite(legacyParsed) && legacyParsed >= 0 ? legacyParsed : 0
}

interface PulledOperation {
  id: number
  opId: string
  type: SyncOperationType
  payload: unknown
  /** Server-side clientTimestamp – used as fallback for LWW on deletes */
  clientTimestamp?: number
  sourceClient?: string
  createdAt?: number
}

interface PullResponse {
  ok?: boolean
  operations?: PulledOperation[]
  nextCursor?: number
  hasMore?: boolean
}

interface HandshakeResponse {
  ok?: boolean
  needsSnapshot?: boolean
  needsClientBootstrapUpload?: boolean
  serverCursor?: number
  bootstrapUploadCapabilities?: {
    reviews?: boolean
    videoNotes?: boolean
  }
  serverCounts?: {
    decks?: number
    cards?: number
    reviews?: number
    videoNotes?: number
  }
}

interface SnapshotResponse {
  ok?: boolean
  cursor?: number
  decks?: unknown[]
  cards?: unknown[]
  reviews?: unknown[]
  shuffleCollections?: unknown[]
  videoNotes?: unknown[]
}

interface BootstrapUploadResponse {
  ok?: boolean
  serverCursor?: number
}

const snapshotNormalizer = createWorker<SnapshotNormalizeRequest, SnapshotNormalizeResult>(
  () => new Worker(new URL('../utils/workers/snapshot-normalizer.worker.ts', import.meta.url), { type: 'module' }),
  (payload) => normalizeSnapshotPayload(payload),
)

const syncApplier = createWorker<
  {
    operations: ResolverOperation[]
    existing: { cards: CardRecord[]; decks: DeckRecord[]; shuffleCollections: ShuffleCollectionRecord[] }
    fallbackTs: number
  },
  OperationDiff
>(
  () => new Worker(new URL('../utils/workers/sync-applier.worker.ts', import.meta.url), { type: 'module' }),
  (payload) => resolveOperations(payload),
)

async function readSelectedDeckFilter(): Promise<Set<string> | null> {
  try {
    const profile = await db.profile.get('current')
    if (!profile || profile.mode !== 'linked' || !profile.userId) return null
    const selected = readSelectedDeckIds(profile.userId)
    const decks = (await db.decks.toArray()).filter(deck => !deck.isDeleted)
    const showReviewDecks = readReviewDecksEnabledFromStorage()

    if (selected === null) {
      return null
    }

    if (selected.length === 0) return new Set() // explicitly empty → sync nothing

    const visibleSelected = showReviewDecks
      ? selected
      : selected.filter(id => {
          const deck = decks.find(item => item.id === id)
          return deck ? !isReviewDeck(deck) : !isReviewDeckId(id)
        })
    return expandDeckIdsWithDescendants(decks, new Set(visibleSelected))
  } catch {
    return null
  }
}

function expandDeckIdsWithDescendants(
  decks: Array<{ id: string; parentDeckId?: string | null }>,
  selectedDeckIds: Set<string>,
): Set<string> {
  const childrenByParent = new Map<string, Array<{ id: string }>>()
  const activeIds = new Set(decks.map(deck => deck.id))
  for (const deck of decks) {
    if (!deck.parentDeckId || !activeIds.has(deck.parentDeckId)) continue
    const bucket = childrenByParent.get(deck.parentDeckId) ?? []
    bucket.push(deck)
    childrenByParent.set(deck.parentDeckId, bucket)
  }

  const expanded = new Set<string>()
  const stack = Array.from(selectedDeckIds)
  while (stack.length > 0) {
    const deckId = stack.pop()
    if (!deckId || expanded.has(deckId)) continue
    expanded.add(deckId)
    for (const child of childrenByParent.get(deckId) ?? []) stack.push(child.id)
  }
  return expanded
}

function filterSnapshotBySelectedDecks(
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

function operationTargetsReviewDeck(op: PulledOperation): boolean {
  if (!op.payload || typeof op.payload !== 'object') return false
  const payload = op.payload as Record<string, unknown>
  const directDeckId = payload.deckId
  if (typeof directDeckId === 'string' && isReviewDeckId(directDeckId)) return true

  const id = payload.id
  if (op.type === 'deck.create' && typeof id === 'string' && isReviewDeckId(id)) return true

  return false
}

async function shouldApplyOperationForSelectedDecks(op: PulledOperation, selectedDecks: Set<string> | null): Promise<boolean> {
  if (!readReviewDecksEnabledFromStorage() && operationTargetsReviewDeck(op)) return false
  if (!selectedDecks) return true
  if (op.type === 'deck.create') {
    const id = (op.payload as Record<string, unknown>)?.id
    return typeof id !== 'string' || !id || selectedDecks.has(id)
  }
  if (op.type === 'shuffleCollection.upsert' || op.type === 'shuffleCollection.delete') return true
  if (op.type === 'videoNote.upsert' || op.type === 'videoNote.delete') return true
  if (!op.payload || typeof op.payload !== 'object') return true

  const payload = op.payload as Record<string, unknown>
  const directDeckId = payload.deckId
  if (typeof directDeckId === 'string' && directDeckId) {
    return selectedDecks.has(directDeckId)
  }

  const cardId = payload.cardId ?? payload.id
  if (typeof cardId === 'string' && cardId) {
    const existing = await db.cards.get(cardId)
    return !existing || selectedDecks.has(existing.deckId)
  }

  return true
}

// ─── Endpoint helpers ──────────────────────────────────────────────────

function getPullEndpoint() {
  const base = getSyncBaseEndpoint()
  return base ? `${base}/pull` : null
}

function getHandshakeEndpoint() {
  const base = getSyncBaseEndpoint()
  return base ? `${base}/handshake` : null
}

function getSnapshotEndpoint() {
  const base = getSyncBaseEndpoint()
  return base ? `${base}/snapshot` : null
}

function getBootstrapUploadEndpoint() {
  const base = getSyncBaseEndpoint()
  return base ? `${base}/bootstrap/upload` : null
}

// ─── Cursor / applied-op bookkeeping ───────────────────────────────────

async function readCursor(): Promise<number> {
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

async function writeCursor(cursor: number): Promise<void> {
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

async function readAppliedOpIds(): Promise<Set<string>> {
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

async function writeAppliedOpIds(opIds: Set<string>): Promise<void> {
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

async function clearAppliedOpIds(): Promise<void> {
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

// ─── Operation appliers (reps-first for card state, LWW for deletes) ───────

function shouldApplyIncomingCardState(
  existing: Pick<CardRecord, 'createdAt' | 'updatedAt' | 'reps'> | undefined,
  incoming: Partial<CardRecord>,
  fallbackTimestamp = 0,
): boolean {
  if (!existing) return true

  const localReps = Number.isFinite(existing.reps) ? Number(existing.reps) : 0
  const incomingReps = Number.isFinite(incoming.reps) ? Number(incoming.reps) : localReps

  if (incomingReps !== localReps) {
    return incomingReps > localReps
  }

  const localTs = Number(existing.updatedAt ?? existing.createdAt ?? 0)
  const incomingTs = Number(incoming.updatedAt ?? incoming.createdAt ?? fallbackTimestamp ?? 0)

  if (!Number.isFinite(incomingTs) || incomingTs <= 0) return true
  return incomingTs >= localTs
}

async function applyDeckCreate(payload: unknown) {
  const deck = normalizeDeck(payload)
  if (!deck) return

  const existing = await db.decks.get(deck.id)
  if (existing) {
    const localTs = existing.updatedAt ?? existing.createdAt
    const incomingTs = deck.updatedAt ?? deck.createdAt
    if (localTs > incomingTs) return
  }

  await db.decks.put(deck)
}

async function applyDeckDelete(payload: unknown, fallbackTs = 0, options: { force?: boolean } = {}) {
  if (!payload || typeof payload !== 'object') return
  const value = payload as { deckId?: string; timestamp?: number; deletedAt?: number }
  const deckId = value.deckId ? String(value.deckId) : ''
  if (!deckId) return

  // ── LWW guard: skip delete if local deck is newer ──
  // fallbackTs comes from the pull response's clientTimestamp field
  const deleteTs = Number(value.deletedAt ?? value.timestamp ?? fallbackTs ?? 0)
  if (!options.force && deleteTs > 0) {
    const existing = await db.decks.get(deckId)
    if (existing) {
      const localTs = existing.updatedAt ?? existing.createdAt
      if (localTs > deleteTs) return // local is newer → ignore remote delete
    }
  }

  const cardIds = (await db.cards.where('deckId').equals(deckId).toArray()).map(card => card.id)
  if (cardIds.length > 0) {
    await db.reviews.where('cardId').anyOf(cardIds).delete()
    await db.cardStats.bulkDelete(cardIds)
  }

  await db.activeSessions.bulkDelete([deckId])
  await db.deckProgress.bulkDelete([deckId])
  await db.cards.where('deckId').equals(deckId).delete()
  await db.decks.delete(deckId)
}

async function applyCardCreate(payload: unknown) {
  const card = normalizeCard(payload)
  if (!card) return

  const existing = await db.cards.get(card.id)
  if (existing && !shouldApplyIncomingCardState(existing, card, card.updatedAt ?? card.createdAt ?? 0)) return

  await db.cards.put(card)
}

async function applyCardUpdate(payload: unknown) {
  if (!payload || typeof payload !== 'object') return
  const value = payload as { cardId?: string; updates?: Partial<CardRecord>; update?: Partial<CardRecord>; timestamp?: number }
  const cardId = value.cardId ? String(value.cardId) : ''
  const rawUpdates = value.updates && typeof value.updates === 'object' ? value.updates : value.update
  if (!cardId || !rawUpdates) return

  const normalizedUpdates = normalizeCardUpdates(rawUpdates)
  if (Object.keys(normalizedUpdates).length === 0) return

  const existing = await db.cards.get(cardId)
  if (existing && !shouldApplyIncomingCardState(existing, normalizedUpdates, Number(value.timestamp ?? 0))) return

  await db.cards.update(cardId, normalizedUpdates)
}

async function applyCardDelete(payload: unknown, fallbackTs = 0) {
  if (!payload || typeof payload !== 'object') return
  const value = payload as { cardId?: string; timestamp?: number; deletedAt?: number }
  const cardId = value.cardId ? String(value.cardId) : ''
  if (!cardId) return

  // ── LWW guard: skip delete if local card is newer ──
  const deleteTs = Number(value.deletedAt ?? value.timestamp ?? fallbackTs ?? 0)
  if (deleteTs > 0) {
    const existing = await db.cards.get(cardId)
    if (existing) {
      const localTs = existing.updatedAt ?? existing.createdAt
      if (localTs > deleteTs) return // local is newer → ignore remote delete
    }
  }

  await db.reviews.where('cardId').equals(cardId).delete()
  const now = Date.now()
  await db.cards.update(cardId, { isDeleted: true, deletedAt: now, updatedAt: now })
}

async function applyReview(op: PulledOperation) {
  const payload = op.payload
  if (!payload || typeof payload !== 'object') return
  const value = payload as {
    cardId?: string
    rating?: 1 | 2 | 3 | 4
    timeMs?: number
    timestamp?: number
    updated?: Partial<CardRecord>
    answer?: { selected?: unknown; correct?: unknown; wasCorrect?: unknown }
  }

  const cardId = value.cardId ? String(value.cardId) : ''
  if (!cardId) return

  const existing = await db.cards.get(cardId)
  if (!existing) {
    // Prevent orphan review rows when the referenced card does not exist locally.
    return
  }

  if (value.updated && typeof value.updated === 'object') {
    if (shouldApplyIncomingCardState(existing, value.updated as Partial<CardRecord>, Number(value.timestamp ?? 0))) {
      await db.cards.update(cardId, value.updated)
    }
  }

  const rating = Number(value.rating)
  const normalizedRating = [1, 2, 3, 4].includes(rating) ? (rating as 1 | 2 | 3 | 4) : 3

  // Antwortdetails (gewählte/korrekte Antwort) anderer Geräte mitnehmen —
  // gleiche Zeile, gleiches Prinzip wie beim lokalen recordReview.
  const answer = value.answer && typeof value.answer === 'object' ? value.answer : null
  const answerFields = {
    ...(typeof answer?.selected === 'string' ? { selectedAnswer: answer.selected } : {}),
    ...(typeof answer?.correct === 'string' ? { correctAnswer: answer.correct } : {}),
    ...(typeof answer?.wasCorrect === 'boolean' ? { answerCorrect: answer.wasCorrect } : {}),
  }

  await db.reviews.add({
    opId: op.opId,
    cardId,
    rating: normalizedRating,
    timeMs: Number.isFinite(value.timeMs) ? Number(value.timeMs) : 0,
    timestamp: Number.isFinite(value.timestamp) ? Number(value.timestamp) : Date.now(),
    sourceClient: typeof op.sourceClient === 'string' ? op.sourceClient : undefined,
    createdAt: Number.isFinite(op.createdAt) ? Number(op.createdAt) : undefined,
    ...answerFields,
  })
}

async function applyReviewUndo(payload: unknown) {
  if (!payload || typeof payload !== 'object') return
  const value = payload as { cardId?: string; reviewId?: number; restored?: Partial<CardRecord> }
  const cardId = value.cardId ? String(value.cardId) : ''
  if (!cardId) return

  if (value.restored && typeof value.restored === 'object') {
    await db.cards.update(cardId, value.restored)
  }

  // payload.reviewId ist die LOKALE Auto-Increment-ID des sendenden Geräts —
  // hier zeigt sie fast sicher auf eine andere Zeile. Nur löschen, wenn die
  // Zeile nachweislich zur selben Karte gehört; sonst jüngste Review der Karte.
  const reviewId = Number(value.reviewId)
  if (Number.isFinite(reviewId) && reviewId > 0) {
    const candidate = await db.reviews.get(reviewId)
    if (candidate && candidate.cardId === cardId) {
      await db.reviews.delete(reviewId)
      return
    }
  }

  const latestReview = await db.reviews.where('cardId').equals(cardId).reverse().first()
  if (latestReview?.id !== undefined) {
    await db.reviews.delete(latestReview.id)
  }
}

/** progress.reset: globaler Lernfortschritt-Reset eines anderen Geräts.
 *  Bewusst OHNE reps-first-Guard (der würde reps=0 immer verwerfen) —
 *  stattdessen LWW pro Karte gegen den Reset-Zeitpunkt: Karten, die NACH dem
 *  Reset bereits wieder gelernt wurden, bleiben unangetastet. */
async function applyProgressReset(payload: unknown, fallbackTs = 0) {
  if (!payload || typeof payload !== 'object') return
  const value = payload as { timestamp?: number; due?: number; dueAt?: number }
  const timestamp = Number(value.timestamp ?? fallbackTs ?? 0)
  if (!Number.isFinite(timestamp) || timestamp <= 0) return

  const dueDay = Number.isFinite(value.due) ? Number(value.due) : Math.floor(timestamp / 86_400_000)
  const dueAt = Number.isFinite(value.dueAt) ? Number(value.dueAt) : dueDay * 86_400_000

  await db.transaction('rw', [db.cards, db.reviews, db.cardStats, db.deckProgress, db.activeSessions], async () => {
    const cards = await db.cards.toArray()
    const resetCards = cards
      .filter(card => !card.isDeleted && Number(card.updatedAt ?? card.createdAt ?? 0) <= timestamp)
      .map(card => buildResetCardRecord(card, { timestamp, dueDay, dueAt }))
    if (resetCards.length > 0) {
      await db.cards.bulkPut(resetCards)
    }
    await db.reviews.where('timestamp').belowOrEqual(timestamp).delete()
    await db.cardStats.clear()
    await db.deckProgress.clear()
    await db.activeSessions.clear()
  })
}

async function applyShuffleCollectionUpsert(payload: unknown) {
  const collection = normalizeShuffleCollection(payload)
  if (!collection) return

  await db.shuffleCollections.put({
    ...collection,
    isDeleted: false,
    deletedAt: collection.deletedAt,
  })
}

async function applyShuffleCollectionDelete(payload: unknown) {
  const collection = normalizeShuffleCollection(payload)
  if (!collection) return

  await db.shuffleCollections.put({
    ...collection,
    isDeleted: true,
    deletedAt: collection.deletedAt ?? collection.updatedAt,
  })
}

function readPayloadString(payload: unknown, key: string): string {
  if (!payload || typeof payload !== 'object') return ''
  const value = (payload as Record<string, unknown>)[key]
  return typeof value === 'string' ? value.trim() : ''
}

function readPayloadTimestamp(payload: unknown, keys: string[], fallbackTs = 0): number {
  if (payload && typeof payload === 'object') {
    const value = payload as Record<string, unknown>
    for (const key of keys) {
      const parsed = Number(value[key])
      if (Number.isFinite(parsed) && parsed >= 0) return parsed
    }
  }
  return Number.isFinite(fallbackTs) && fallbackTs >= 0 ? fallbackTs : 0
}

async function applyVideoNoteUpsert(payload: unknown) {
  const note = normalizeVideoNote(payload)
  if (!note) return

  const existing = await db.videoNotes2.get([note.profileId, note.objective])
  if (existing && existing.updatedAt > note.updatedAt) return

  await db.videoNotes2.put(note)
}

async function applyVideoNoteDelete(payload: unknown, fallbackTs = 0) {
  const profileId = readPayloadString(payload, 'profileId') || readPayloadString(payload, 'profile_id')
  const objective = readPayloadString(payload, 'objective')
  if (!profileId || !objective) return

  const deleteTs = readPayloadTimestamp(payload, ['deletedAt', 'deleted_at', 'updatedAt', 'updated_at', 'timestamp'], fallbackTs)
  const existing = await db.videoNotes2.get([profileId, objective])
  if (existing && deleteTs > 0 && existing.updatedAt > deleteTs) return

  await db.videoNotes2.delete([profileId, objective])
}

/**
 * Der profilgescopte Lernplan ist die autoritative Terminquelle. Settings
 * bleibt eine abgeleitete localStorage-Kompatibilitätsansicht für Countdown
 * und bestehende UI-Verbraucher.
 */
async function applyExamDateUpsert(payload: unknown) {
  if (!payload || typeof payload !== 'object') return
  const value = payload as Record<string, unknown>
  const examDateIso = normalizeExamDateIso(value.examDateIso)
  if (value.examDateIso !== null && examDateIso === null) return
  const updatedAt = normalizeExamDateUpdatedAt(value.updatedAt)
  const profileId = typeof value.profileId === 'string' ? value.profileId.trim() : ''
  if (updatedAt === null || !profileId) return

  let stored: Record<string, unknown> = {}
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings)
    stored = raw ? JSON.parse(raw) as Record<string, unknown> : {}
  } catch {
    stored = {}
  }

  const existingUpdatedAt = normalizeExamDateUpdatedAt(stored.examDateUpdatedAt)
  const existingPlan = await getLearnerExamPlan(profileId)
  if (
    (existingUpdatedAt !== null && existingUpdatedAt > updatedAt)
    || (existingPlan && existingPlan.updatedAt > updatedAt)
  ) return

  await saveDraftLearnerExamPlan({
    profileId,
    now: updatedAt,
    examDateIso,
    uiLanguage: existingPlan?.uiLanguage ?? (stored.language === 'en' ? 'en' : 'de'),
  })

  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({
    ...stored,
    examDateIso,
    examDateUpdatedAt: updatedAt,
  }))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EXAM_DATE_SYNCED_EVENT))
  }
}

async function applyOperation(op: PulledOperation) {
  const fallbackTs = Number(op.clientTimestamp ?? 0)

  switch (op.type) {
    case 'deck.create':
      await applyDeckCreate(op.payload)
      return
    case 'deck.delete':
      await applyDeckDelete(op.payload, fallbackTs, { force: op.sourceClient === 'server-maintenance-publisher' })
      return
    case 'card.create':
      await applyCardCreate(op.payload)
      return
    case 'card.update':
      await applyCardUpdate(op.payload)
      return
    case 'card.schedule.forceTomorrow':
      await applyCardUpdate(op.payload)
      return
    case 'card.delete':
      await applyCardDelete(op.payload, fallbackTs)
      return
    case 'review':
      await applyReview(op)
      return
    case 'review.undo':
      await applyReviewUndo(op.payload)
      return
    case 'progress.reset':
      await applyProgressReset(op.payload, fallbackTs)
      return
    case 'shuffleCollection.upsert':
      await applyShuffleCollectionUpsert(op.payload)
      return
    case 'shuffleCollection.delete':
      await applyShuffleCollectionDelete(op.payload)
      return
    case 'videoNote.upsert':
      await applyVideoNoteUpsert(op.payload)
      return
    case 'videoNote.delete':
      await applyVideoNoteDelete(op.payload, fallbackTs)
      return
    case 'examDate.upsert':
      await applyExamDateUpsert(op.payload)
      return
  }
}

function isSyncWorkerEnabled(): boolean {
  try {
    return localStorage.getItem('useSyncWorker') === '1'
  } catch {
    return false
  }
}

function collectTouchedIds(operations: PulledOperation[]): { cardIds: string[]; deckIds: string[] } {
  const cardIds = new Set<string>()
  const deckIds = new Set<string>()

  for (const operation of operations) {
    const payload = operation.payload
    if (!payload || typeof payload !== 'object') continue
    const value = payload as Record<string, unknown>

    const cardId = value.cardId ?? value.id
    if (typeof cardId === 'string' && cardId) {
      cardIds.add(cardId)
    }

    const deckId = value.deckId
    if (typeof deckId === 'string' && deckId) {
      deckIds.add(deckId)
    }

    if (operation.type === 'deck.create' && typeof value.id === 'string' && value.id) {
      deckIds.add(value.id)
    }
    if (operation.type === 'card.create' && typeof value.id === 'string' && value.id) {
      cardIds.add(value.id)
    }
  }

  return {
    cardIds: Array.from(cardIds),
    deckIds: Array.from(deckIds),
  }
}

async function applyOperationDiff(diff: OperationDiff): Promise<void> {
  if (diff.decks.upsert.length > 0) {
    await db.decks.bulkPut(diff.decks.upsert)
  }

  if (diff.decks.delete.length > 0) {
    for (const deckId of diff.decks.delete) {
      await applyDeckDelete({ deckId })
    }
  }

  if (diff.cards.upsert.length > 0) {
    await db.cards.bulkPut(diff.cards.upsert)
  }

  for (const [id, updates] of diff.cards.update) {
    await db.cards.update(id, updates)
  }

  if (diff.reviews.deleteByCardId.length > 0) {
    const uniqueCardIds = Array.from(new Set(diff.reviews.deleteByCardId))
    await db.reviews.where('cardId').anyOf(uniqueCardIds).delete()
  }

  if (diff.reviews.deleteById.length > 0) {
    await db.reviews.bulkDelete(diff.reviews.deleteById)
  }

  if (diff.reviews.deleteLatestByCardId.length > 0) {
    for (const cardId of diff.reviews.deleteLatestByCardId) {
      const latestReview = await db.reviews.where('cardId').equals(cardId).reverse().first()
      if (latestReview?.id !== undefined) {
        await db.reviews.delete(latestReview.id)
      }
    }
  }

  if (diff.cards.delete.length > 0) {
    const now = Date.now()
    for (const cardId of diff.cards.delete) {
      await db.cards.update(cardId, { isDeleted: true, deletedAt: now, updatedAt: now })
    }
  }

  if (diff.reviews.add.length > 0) {
    await db.reviews.bulkAdd(diff.reviews.add)
  }

  if (diff.shuffleCollections.upsert.length > 0) {
    await db.shuffleCollections.bulkPut(diff.shuffleCollections.upsert)
  }

  if (diff.shuffleCollections.delete.length > 0) {
    await db.shuffleCollections.bulkPut(diff.shuffleCollections.delete)
  }
}

async function applyOperationsWithWorker(operations: PulledOperation[], fallbackTs: number): Promise<void> {
  const touched = collectTouchedIds(operations)
  const [existingCardsRaw, existingDecksRaw, existingShuffleCollections] = await Promise.all([
    touched.cardIds.length > 0
      ? db.cards.bulkGet(touched.cardIds)
      : Promise.resolve([] as Array<CardRecord | undefined>),
    touched.deckIds.length > 0
      ? db.decks.bulkGet(touched.deckIds)
      : Promise.resolve([] as Array<DeckRecord | undefined>),
    hasShuffleCollectionsTable()
      ? db.shuffleCollections.toArray()
      : Promise.resolve([] as ShuffleCollectionRecord[]),
  ])

  const existingCards: CardRecord[] = existingCardsRaw.filter((entry): entry is CardRecord => entry !== undefined)
  const existingDecks: DeckRecord[] = existingDecksRaw.filter((entry): entry is DeckRecord => entry !== undefined)

  const diff = await syncApplier.run({
    operations,
    existing: {
      cards: existingCards,
      decks: existingDecks,
      shuffleCollections: existingShuffleCollections,
    },
    fallbackTs,
  })

  await applyOperationDiff(diff)
}

// ─── Bootstrap / Handshake ─────────────────────────────────────────────

async function getLocalCounts() {
  const activeProfileId = profileScopeId((await db.profile.get('current')) ?? null)
  const [cards, decks, reviews, videoNotes] = await Promise.all([
    db.cards.filter(card => !card.isDeleted).count(),
    db.decks.filter(deck => !deck.isDeleted).count(),
    db.reviews.count(),
    db.videoNotes2.where('profileId').equals(activeProfileId).count(),
  ])
  return { cards, decks, reviews, videoNotes }
}

async function runHandshake(clientId: string): Promise<HandshakeResponse | null> {
  const endpoint = getHandshakeEndpoint()
  if (!endpoint) return null

  try {
    const localCounts = await getLocalCounts()

    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getSyncAuthHeaders(),
      },
      body: JSON.stringify({
        clientId,
        lastCursor: await readCursor(),
        localCounts,
      }),
    })

    if (!response.ok) {
      logSyncApiFailure('handshake', endpoint, `http_${response.status}`, `status: ${response.status}`)
      return null
    }
    const data = (await response.json()) as HandshakeResponse & { error?: string }
    const apiError = syncResponseError(data)
    if (apiError) {
      logSyncApiFailure('handshake', endpoint, apiError, `status: ${response.status}`)
      return null
    }
    return data
  } catch (error: unknown) {
    logSyncApiFailure('handshake', endpoint, stringifySyncException(error))
    return null
  }
}

async function fetchAndApplySnapshot(clientId: string): Promise<boolean> {
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

    const selectedDecks = await readSelectedDeckFilter()
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

async function runBootstrapUpload(
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
    const selectedDecks = await readSelectedDeckFilter()
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

async function writeSyncMetaTimestamp(key: string): Promise<void> {
  if (!hasSyncMetaTable()) return
  try {
    await db.syncMeta.put({ key, value: Date.now(), updatedAt: Date.now() })
  } catch {
    // best effort
  }
}

function supportsBootstrapReviewUpload(handshake: HandshakeResponse): boolean {
  return Boolean(handshake.bootstrapUploadCapabilities?.reviews)
}

async function bootstrapSyncIfNeeded(clientId: string): Promise<boolean> {
  const handshake = await runHandshake(clientId)
  if (!handshake) return true

  if (Boolean(handshake.needsClientBootstrapUpload)) {
    const localCounts = await getLocalCounts()
    const includeReviews = localCounts.reviews > 0

    if (includeReviews && !supportsBootstrapReviewUpload(handshake)) {
      console.warn('[syncPull] bootstrap upload aborted because the server does not advertise review-history support')
      return false
    }

    const upload = await runBootstrapUpload(clientId, { includeReviews })
    if (!upload?.ok) return false

    if (typeof upload.serverCursor === 'number' && Number.isFinite(upload.serverCursor)) {
      await writeCursor(upload.serverCursor)
    }

    await writeSyncMetaTimestamp(SYNC_META_BOOTSTRAP_KEY)
    return true
  }

  if (Boolean(handshake.needsSnapshot)) {
    return fetchAndApplySnapshot(clientId)
  }

  if (typeof handshake.serverCursor === 'number' && Number.isFinite(handshake.serverCursor)) {
    const localCursor = await readCursor()
    if (handshake.serverCursor < localCursor) {
      await clearAppliedOpIds()
      return fetchAndApplySnapshot(clientId)
    }
  }

  return true
}

// ─── Delta pull ────────────────────────────────────────────────────────

export async function pullAndApplySyncDeltas(limit = 200) {
  const endpoint = getPullEndpoint()
  if (!endpoint) return

  const pendingBeforeFlush = await getSyncQueuePendingCount()
  if (pendingBeforeFlush > 0 && navigator.onLine) {
    const flushResult = await flushSyncQueue({ limit: 200 })
    if (flushResult.processed > 0) {
      await writeSyncMetaTimestamp(SYNC_META_LAST_PUSH_KEY)
    }
  }

  const pendingAfterFlush = await getSyncQueuePendingCount()
  if (pendingAfterFlush > 0) {
    return
  }

  const clientId = getOrCreateSyncClientId()
  const bootstrapReady = await bootstrapSyncIfNeeded(clientId)
  if (!bootstrapReady) return

  let cursor = await readCursor()
  const appliedOpIds = await readAppliedOpIds()
  const selectedDecks = await readSelectedDeckFilter()

  try {
    for (let page = 0; page < 20; page += 1) {
      const query = `${endpoint}?since=${cursor}&limit=${limit}&clientId=${encodeURIComponent(clientId)}`
      const response = await fetchWithTimeout(query, {
        headers: {
          ...getSyncAuthHeaders(),
        },
      })
      if (!response.ok) {
        logSyncApiFailure('pull deltas', query, `http_${response.status}`, `status: ${response.status}`)
        break
      }

      const data = (await response.json()) as PullResponse & { error?: string }
      const apiError = syncResponseError(data)
      if (apiError) {
        logSyncApiFailure('pull deltas', query, apiError, `status: ${response.status}`)
        break
      }
      const operations = Array.isArray(data.operations) ? data.operations : []

      if (operations.length === 0) {
        if (typeof data.nextCursor === 'number' && Number.isFinite(data.nextCursor)) {
          cursor = data.nextCursor
        }
        break
      }

      const operationsToApply: PulledOperation[] = []

      for (const operation of operations) {
        if (!operation?.opId) continue
        if (appliedOpIds.has(operation.opId)) continue

        const shouldApply = await shouldApplyOperationForSelectedDecks(operation, selectedDecks)
        if (!shouldApply) {
          appliedOpIds.add(operation.opId)
          continue
        }

        operationsToApply.push(operation)
      }

      const useSyncWorker = isSyncWorkerEnabled()
      const canUseSyncWorker = useSyncWorker && operationsToApply.every(op => supportsWorkerResolution(op))

      if (operationsToApply.length > 0) {
        if (canUseSyncWorker) {
          await applyOperationsWithWorker(operationsToApply, Number(data.nextCursor ?? cursor ?? 0))
        } else {
          for (const operation of operationsToApply) {
            await applyOperation(operation)
          }
        }

        for (const operation of operationsToApply) {
          appliedOpIds.add(operation.opId)
        }
      }

      if (typeof data.nextCursor === 'number' && Number.isFinite(data.nextCursor)) {
        cursor = data.nextCursor
      } else {
        const maxSeen = operations.reduce((max, op) => Math.max(max, op.id || 0), cursor)
        cursor = maxSeen
      }

      if (!data.hasMore) break
    }
  } catch (error: unknown) {
    logSyncApiFailure('pull deltas', endpoint, stringifySyncException(error))
    // Network/transient errors should not crash sync runtime.
  }

  await writeCursor(cursor)
  await writeAppliedOpIds(appliedOpIds)
  await writeSyncMetaTimestamp(SYNC_META_LAST_PULL_KEY)
}
