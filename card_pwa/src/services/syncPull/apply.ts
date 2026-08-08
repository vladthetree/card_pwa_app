/**
 * AI_CONTEXT:
 * Role: Applies a single pulled operation (or a worker-resolved batch of many) to the
 * local Dexie DB — deck/card CRUD, reviews, progress reset, shuffle collections,
 * video notes, exam-date sync. The reps-first / LWW conflict rules live here.
 * Used by: deltaPull.ts, once per operation in the pull loop (or in bulk via the
 * sync-applier worker when useSyncWorker is enabled and every op supports it).
 * Important: shouldApplyIncomingCardState is the reps-first rule — an incoming card
 * state is only accepted if its reps have caught up, or (on a tie) it is not older.
 * Do not add a delete/update path that bypasses it silently.
 * Warning: for every op type in supportsWorkerResolution() (operationResolver.ts),
 * this file's conflict/ownership logic is duplicated there for the worker path. A
 * fix here (e.g. the review.undo cardId ownership check) must be mirrored there too
 * — that exact divergence was a real bug, caught by operationResolver.test.ts.
 */
import { db, type CardRecord, type DeckRecord, type ReviewRecord, type ShuffleCollectionRecord } from '../../db'
import { buildResetCardRecord } from '../../db/queries/reviews'
import type { SyncOperationType } from '../syncQueue'
import { createWorker } from '../../utils/workers/workerPool'
import { normalizeDeck } from '../../utils/normalize/deck'
import { normalizeCard, normalizeCardUpdates } from '../../utils/normalize/card'
import { normalizeShuffleCollection } from '../../utils/normalize/shuffleCollection'
import { normalizeVideoNote } from '../../utils/normalize/videoNote'
import {
  resolveOperations,
  type OperationDiff,
  type ResolverOperation,
} from '../../utils/sync/operationResolver'
import { EXAM_DATE_SYNCED_EVENT, STORAGE_KEYS } from '../../constants/appIdentity'
import { normalizeExamDateIso, normalizeExamDateUpdatedAt } from '../../contexts/SettingsContext'
import { getLearnerExamPlan, saveDraftLearnerExamPlan } from '../../db/queries/learningUnits'
import { hasShuffleCollectionsTable } from './shared'
import { isSupportedExamLanguage } from '../../utils/learningPlan'
import {
  isAuthoritativeCardContentOperation,
  pickAuthoritativeCardContentUpdates,
} from '../../utils/sync/cardContentAuthority'

export interface PulledOperation {
  id: number
  opId: string
  type: SyncOperationType
  payload: unknown
  /** Server-side clientTimestamp – used as fallback for LWW on deletes */
  clientTimestamp?: number
  sourceClient?: string
  createdAt?: number
}

const syncApplier = createWorker<
  {
    operations: ResolverOperation[]
    existing: { cards: CardRecord[]; decks: DeckRecord[]; shuffleCollections: ShuffleCollectionRecord[]; reviews: ReviewRecord[] }
    fallbackTs: number
  },
  OperationDiff
>(
  () => new Worker(new URL('../../utils/workers/sync-applier.worker.ts', import.meta.url), { type: 'module' }),
  (payload) => resolveOperations(payload),
)

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

async function applyCardCreate(op: PulledOperation) {
  const card = normalizeCard(op.payload)
  if (!card) return

  const existing = await db.cards.get(card.id)
  if (existing && isAuthoritativeCardContentOperation(op)) {
    const contentUpdates = pickAuthoritativeCardContentUpdates(card)
    if (Object.keys(contentUpdates).length > 0) {
      await db.cards.update(card.id, contentUpdates)
    }
    return
  }
  if (existing && !shouldApplyIncomingCardState(existing, card, card.updatedAt ?? card.createdAt ?? 0)) return

  await db.cards.put(card)
}

async function applyCardUpdate(op: PulledOperation) {
  if (!op.payload || typeof op.payload !== 'object') return
  const value = op.payload as { cardId?: string; updates?: Partial<CardRecord>; update?: Partial<CardRecord>; timestamp?: number }
  const cardId = value.cardId ? String(value.cardId) : ''
  const rawUpdates = value.updates && typeof value.updates === 'object' ? value.updates : value.update
  if (!cardId || !rawUpdates) return

  const normalizedUpdates = normalizeCardUpdates(rawUpdates)
  if (Object.keys(normalizedUpdates).length === 0) return

  const existing = await db.cards.get(cardId)
  if (existing && isAuthoritativeCardContentOperation(op)) {
    const contentUpdates = pickAuthoritativeCardContentUpdates(normalizedUpdates)
    if (Object.keys(contentUpdates).length > 0) {
      await db.cards.update(cardId, contentUpdates)
    }
    return
  }
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
    sessionRunId?: unknown
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
    ...(typeof value.sessionRunId === 'string' && value.sessionRunId.trim()
      ? { sessionRunId: value.sessionRunId.trim() }
      : {}),
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

  const incomingExamLanguage = isSupportedExamLanguage(value.examLanguage)
    ? value.examLanguage
    : undefined
  const incomingWeeklyMinutes = Number(value.weeklyMinutesAvailable)
  const incomingLearningDays = Number(value.learningDaysPerWeek)
  const incomingBufferDays = Number(value.bufferDays)
  const incomingUiLanguage = value.uiLanguage === 'en' || value.uiLanguage === 'de'
    ? value.uiLanguage
    : undefined

  await saveDraftLearnerExamPlan({
    profileId,
    now: updatedAt,
    examDateIso,
    uiLanguage: incomingUiLanguage
      ?? existingPlan?.uiLanguage
      ?? (stored.language === 'en' ? 'en' : 'de'),
    ...(incomingExamLanguage !== undefined ? { examLanguage: incomingExamLanguage } : {}),
    ...(Number.isInteger(incomingWeeklyMinutes) && incomingWeeklyMinutes >= 30 && incomingWeeklyMinutes <= 4_800
      ? { weeklyMinutesAvailable: incomingWeeklyMinutes }
      : {}),
    ...(Number.isInteger(incomingLearningDays) && incomingLearningDays >= 1 && incomingLearningDays <= 7
      ? { learningDaysPerWeek: incomingLearningDays }
      : {}),
    ...(Number.isInteger(incomingBufferDays) && incomingBufferDays >= 0 && incomingBufferDays <= 60
      ? { bufferDays: incomingBufferDays }
      : {}),
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

export async function applyOperation(op: PulledOperation) {
  const fallbackTs = Number(op.clientTimestamp ?? 0)

  switch (op.type) {
    case 'deck.create':
      await applyDeckCreate(op.payload)
      return
    case 'deck.delete':
      await applyDeckDelete(op.payload, fallbackTs, { force: op.sourceClient === 'server-maintenance-publisher' })
      return
    case 'card.create':
      await applyCardCreate(op)
      return
    case 'card.update':
      await applyCardUpdate(op)
      return
    case 'card.schedule.forceTomorrow':
      await applyCardUpdate(op)
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

export function isSyncWorkerEnabled(): boolean {
  try {
    return localStorage.getItem('useSyncWorker') === '1'
  } catch {
    return false
  }
}

function collectTouchedIds(operations: PulledOperation[]): { cardIds: string[]; deckIds: string[]; reviewIds: number[] } {
  const cardIds = new Set<string>()
  const deckIds = new Set<string>()
  const reviewIds = new Set<number>()

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
    if (operation.type === 'review.undo') {
      const reviewId = Number(value.reviewId)
      if (Number.isFinite(reviewId) && reviewId > 0) {
        reviewIds.add(reviewId)
      }
    }
  }

  return {
    cardIds: Array.from(cardIds),
    deckIds: Array.from(deckIds),
    reviewIds: Array.from(reviewIds),
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

export async function applyOperationsWithWorker(operations: PulledOperation[], fallbackTs: number): Promise<void> {
  const touched = collectTouchedIds(operations)
  const [existingCardsRaw, existingDecksRaw, existingShuffleCollections, existingReviewsRaw] = await Promise.all([
    touched.cardIds.length > 0
      ? db.cards.bulkGet(touched.cardIds)
      : Promise.resolve([] as Array<CardRecord | undefined>),
    touched.deckIds.length > 0
      ? db.decks.bulkGet(touched.deckIds)
      : Promise.resolve([] as Array<DeckRecord | undefined>),
    hasShuffleCollectionsTable()
      ? db.shuffleCollections.toArray()
      : Promise.resolve([] as ShuffleCollectionRecord[]),
    touched.reviewIds.length > 0
      ? db.reviews.bulkGet(touched.reviewIds)
      : Promise.resolve([] as Array<ReviewRecord | undefined>),
  ])

  const existingCards: CardRecord[] = existingCardsRaw.filter((entry): entry is CardRecord => entry !== undefined)
  const existingDecks: DeckRecord[] = existingDecksRaw.filter((entry): entry is DeckRecord => entry !== undefined)
  const existingReviews: ReviewRecord[] = existingReviewsRaw.filter((entry): entry is ReviewRecord => entry !== undefined)

  const diff = await syncApplier.run({
    operations,
    existing: {
      cards: existingCards,
      decks: existingDecks,
      shuffleCollections: existingShuffleCollections,
      reviews: existingReviews,
    },
    fallbackTs,
  })

  await applyOperationDiff(diff)
}
