import { db, type CardRecord } from '../../db'
import { calculateCardStateAfterReview, SM2 } from '../../utils/sm2'
import { calculateCardStateAfterReviewFSRS } from '../../utils/fsrs'
import { type AlgorithmParams } from '../../utils/algorithmParams'
import { enqueueSyncOperation } from '../../services/syncQueue'
import { makeOpId } from '../../services/syncConfig'
import { REVIEW_UPDATED_EVENT } from '../../constants/appIdentity'
import { getDayStartMs } from '../../utils/time'
import {
  shouldSmoothBacklog,
  computeNewDueDay,
  BACKLOG_SPREAD_DAYS,
  BACKLOG_FUZZ_FACTOR,
} from '../../utils/backlogSmoother'
import { verifySchedulingPersistence } from './diagnostics'
import type {
  Rating,
  MetricsPeriod,
  DeckMetricsSnapshot,
  ShuffleCollectionMetricsSnapshot,
  ReviewUndoToken,
  CardSchedulingState,
  GlobalStats,
} from '../../types'

function emitReviewUpdatedEvent(): void {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return
  try {
    if (typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent(REVIEW_UPDATED_EVENT))
      return
    }
    window.dispatchEvent(new Event(REVIEW_UPDATED_EVENT))
  } catch {
    // Event dispatch is a best-effort UI refresh signal and must not break review writes.
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function normalizeSchedulingInput(
  card: CardRecord,
  algorithm: 'sm2' | 'fsrs'
): Pick<CardRecord, 'factor' | 'interval' | 'stability' | 'difficulty' | 'reps' | 'lapses' | 'type' | 'queue' | 'due' | 'dueAt'> {
  const nowMs = Date.now()
  const type = Number.isInteger(card.type) ? clamp(card.type, 0, 3) : 0
  const queue = Number.isInteger(card.queue) ? clamp(card.queue, -1, 2) : type
  const due = Math.round(finiteOr(card.due, Math.floor(Date.now() / 86_400_000)))
  const dueAt = Math.round(finiteOr(card.dueAt, due * 86_400_000))
  const interval = Math.max(0, Math.round(finiteOr(card.interval, 0)))
  const reps = Math.max(0, Math.round(finiteOr(card.reps, 0)))
  const lapses = Math.max(0, Math.round(finiteOr(card.lapses, 0)))
  const factor = Math.round(clamp(finiteOr(card.factor, SM2.DEFAULT_EASE), SM2.MIN_EASE, SM2.MAX_EASE))

  return {
    type,
    queue,
    due,
    dueAt: Math.max(0, dueAt || nowMs),
    interval,
    factor,
    stability: algorithm === 'fsrs' ? clamp(finiteOr(card.stability, Math.max(0.5, interval || 1)), 0.5, 36500) : card.stability,
    difficulty: algorithm === 'fsrs' ? clamp(finiteOr(card.difficulty, factor / 500), 1, 10) : card.difficulty,
    reps,
    lapses,
  }
}

function computeSuccessRate(reviews: { rating: number }[]): number {
  if (reviews.length === 0) return 0
  return Math.round((reviews.filter(r => r.rating >= 3).length / reviews.length) * 100)
}

export async function fetchGlobalStats(nextDayStartsAt = 0): Promise<GlobalStats> {
  const nowMs = Date.now()
  const dayMs = 86_400_000
  const daysSinceEpoch = Math.floor(nowMs / dayMs)
  const todayStartMs = getDayStartMs(nowMs, nextDayStartsAt)

  function resolveDueAtMs(card: CardRecord): number {
    if (Number.isFinite(card.dueAt)) return Math.round(card.dueAt as number)
    return Math.max(0, Math.floor(card.due)) * dayMs
  }

  function resolveDueEpoch(card: CardRecord): number {
    return Math.max(0, Math.floor(card.due))
  }

  const [total, newCount, learningCount, reviewCount, overdueGt2DaysCount, deckCount, reviewsToday] = await Promise.all([
    db.cards.filter(c => !c.isDeleted).count(),
    db.cards.where('type').equals(SM2.CARD_TYPE_NEW).and(c => !c.isDeleted).count(),
    db.cards.where('type').anyOf(SM2.CARD_TYPE_LEARNING, SM2.CARD_TYPE_RELEARNING).and(c => !c.isDeleted).count(),
    db.cards.where('type').equals(SM2.CARD_TYPE_REVIEW).and(c => !c.isDeleted).count(),
    db.cards
      .where('type')
      .anyOf(SM2.CARD_TYPE_LEARNING, SM2.CARD_TYPE_RELEARNING, SM2.CARD_TYPE_REVIEW)
      .and(c => !c.isDeleted && resolveDueEpoch(c) > daysSinceEpoch)
      .count(),
    db.decks.filter(d => !d.isDeleted).count(),
    db.reviews.where('timestamp').aboveOrEqual(todayStartMs).toArray(),
  ])

  const reviewedToday = reviewsToday.length
  const successfulToday = reviewsToday.filter(review => review.rating >= 3).length
  const successToday = reviewedToday === 0 ? 0 : Math.round((successfulToday / reviewedToday) * 100)
  const nowDue = await db.cards
    .filter(c => !c.isDeleted && (resolveDueEpoch(c) <= daysSinceEpoch || resolveDueAtMs(c) <= nowMs))
    .count()

  return {
    total,
    new: newCount,
    learning: learningCount,
    review: reviewCount,
    nowDue,
    overdueGt2Days: overdueGt2DaysCount,
    deckCount,
    reviewedToday,
    successfulToday,
    successToday,
  }
}

export async function getFutureDueForecast(days = 15, nextDayStartsAt = 0): Promise<Array<{ dayStartMs: number; count: number }>> {
  const normalizedDays = Number.isFinite(days) ? Math.max(1, Math.floor(days)) : 15
  const dayMs = 86_400_000
  const nowMs = Date.now()
  const todayStartMs = getDayStartMs(nowMs, nextDayStartsAt)
  const tomorrowStartMs = todayStartMs + dayMs
  const horizonEndMs = tomorrowStartMs + normalizedDays * dayMs

  const result = Array.from({ length: normalizedDays }, (_, idx) => ({
    dayStartMs: tomorrowStartMs + idx * dayMs,
    count: 0,
  }))

  const rows = await db.cards
    .filter(c => !c.isDeleted && (c.type === SM2.CARD_TYPE_LEARNING || c.type === SM2.CARD_TYPE_RELEARNING || c.type === SM2.CARD_TYPE_REVIEW))
    .toArray()

  for (const row of rows) {
    const dueAtMs = Number.isFinite(row.dueAt)
      ? Math.round(row.dueAt as number)
      : Math.max(0, Math.floor(row.due)) * dayMs

    if (dueAtMs < tomorrowStartMs || dueAtMs >= horizonEndMs) continue

    const dayIndex = Math.floor((dueAtMs - tomorrowStartMs) / dayMs)
    if (dayIndex >= 0 && dayIndex < result.length) {
      result[dayIndex].count += 1
    }
  }

  return result
}

export async function getDeckSuccessRates(deckIds: string[]): Promise<Record<string, number>> {
  if (deckIds.length === 0) return {}

  const cards = (await db.cards.where('deckId').anyOf(deckIds).toArray()).filter(c => !c.isDeleted)
  if (cards.length === 0) {
    return Object.fromEntries(deckIds.map(id => [id, 0]))
  }

  const cardToDeck = new Map(cards.map(card => [card.id, card.deckId]))
  const cardIds = cards.map(card => card.id)
  const reviews = await db.reviews.where('cardId').anyOf(cardIds).toArray()

  const totals = new Map<string, { total: number; success: number }>()
  for (const id of deckIds) {
    totals.set(id, { total: 0, success: 0 })
  }

  for (const review of reviews) {
    const deckId = cardToDeck.get(review.cardId)
    if (!deckId) continue
    const current = totals.get(deckId)
    if (!current) continue
    current.total += 1
    if (review.rating >= 3) current.success += 1
  }

  const result: Record<string, number> = {}
  for (const [deckId, { total, success }] of totals.entries()) {
    result[deckId] = total === 0 ? 0 : Math.round((success / total) * 100)
  }

  return result
}

export async function getDeckMetricsSnapshot(deckId: string, period: MetricsPeriod): Promise<DeckMetricsSnapshot> {
  const ratingCounts: Record<Rating, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  const lastRatingAt: Record<Rating, number | null> = { 1: null, 2: null, 3: null, 4: null }
  const cards = (await db.cards.where('deckId').equals(deckId).toArray()).filter(c => !c.isDeleted)
  if (cards.length === 0) {
    return {
      deckId,
      period,
      cardCount: 0,
      reviewedCardCount: 0,
      totalReviews: 0,
      successRate: 0,
      ratingCounts,
      lastRatingAt,
      trendDelta: 0,
    }
  }

  const cardIds = cards.map(card => card.id)
  const allReviews = await db.reviews.where('cardId').anyOf(cardIds).toArray()

  const now = Date.now()
  const periodMs = period === '7d' ? 7 * 86_400_000 : Number.POSITIVE_INFINITY
  const periodStart = Number.isFinite(periodMs) ? now - periodMs : 0
  const periodReviews = allReviews.filter(review => review.timestamp >= periodStart)
  const reviewedCardCount = new Set(periodReviews.map(review => review.cardId)).size

  for (const review of periodReviews) {
    ratingCounts[review.rating] += 1
    lastRatingAt[review.rating] = Math.max(lastRatingAt[review.rating] ?? 0, review.timestamp)
  }

  const successRate = computeSuccessRate(periodReviews)

  const trendWindowMs = 7 * 86_400_000
  const currentWindowStart = now - trendWindowMs
  const previousWindowStart = currentWindowStart - trendWindowMs
  const currentWindow = allReviews.filter(review => review.timestamp >= currentWindowStart)
  const previousWindow = allReviews.filter(
    review => review.timestamp >= previousWindowStart && review.timestamp < currentWindowStart
  )

  const currentRate = computeSuccessRate(currentWindow)
  const previousRate = computeSuccessRate(previousWindow)

  return {
    deckId,
    period,
    cardCount: cards.length,
    reviewedCardCount,
    totalReviews: periodReviews.length,
    successRate,
    ratingCounts,
    lastRatingAt,
    trendDelta: Math.round((currentRate - previousRate) * 10) / 10,
  }
}

export async function getShuffleCollectionMetricsSnapshot(
  deckIds: string[],
  period: MetricsPeriod,
): Promise<ShuffleCollectionMetricsSnapshot> {
  const uniqueDeckIds = Array.from(new Set(deckIds.filter(Boolean)))
  const ratingCounts: Record<Rating, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  const lastRatingAt: Record<Rating, number | null> = { 1: null, 2: null, 3: null, 4: null }

  if (uniqueDeckIds.length === 0) {
    return {
      period,
      deckCount: 0,
      cardCount: 0,
      reviewedCardCount: 0,
      totalReviews: 0,
      successRate: 0,
      ratingCounts,
      lastRatingAt,
      trendDelta: 0,
      decks: [],
    }
  }

  const snapshots = await Promise.all(uniqueDeckIds.map(deckId => getDeckMetricsSnapshot(deckId, period)))
  const totalReviews = snapshots.reduce((sum, snapshot) => sum + snapshot.totalReviews, 0)
  const successWeighted = snapshots.reduce((sum, snapshot) => sum + snapshot.successRate * snapshot.totalReviews, 0)
  const trendWeightedBase = snapshots.reduce((sum, snapshot) => sum + Math.max(1, snapshot.totalReviews), 0)
  const trendWeighted = snapshots.reduce((sum, snapshot) => sum + snapshot.trendDelta * Math.max(1, snapshot.totalReviews), 0)

  for (const snapshot of snapshots) {
    ratingCounts[1] += snapshot.ratingCounts[1]
    ratingCounts[2] += snapshot.ratingCounts[2]
    ratingCounts[3] += snapshot.ratingCounts[3]
    ratingCounts[4] += snapshot.ratingCounts[4]
    lastRatingAt[1] = Math.max(lastRatingAt[1] ?? 0, snapshot.lastRatingAt[1] ?? 0) || null
    lastRatingAt[2] = Math.max(lastRatingAt[2] ?? 0, snapshot.lastRatingAt[2] ?? 0) || null
    lastRatingAt[3] = Math.max(lastRatingAt[3] ?? 0, snapshot.lastRatingAt[3] ?? 0) || null
    lastRatingAt[4] = Math.max(lastRatingAt[4] ?? 0, snapshot.lastRatingAt[4] ?? 0) || null
  }

  return {
    period,
    deckCount: snapshots.length,
    cardCount: snapshots.reduce((sum, snapshot) => sum + snapshot.cardCount, 0),
    reviewedCardCount: snapshots.reduce((sum, snapshot) => sum + snapshot.reviewedCardCount, 0),
    totalReviews,
    successRate: totalReviews > 0 ? Math.round(successWeighted / totalReviews) : 0,
    ratingCounts,
    lastRatingAt,
    trendDelta: Math.round((trendWeighted / Math.max(1, trendWeightedBase)) * 10) / 10,
    decks: snapshots.map(snapshot => ({
      deckId: snapshot.deckId,
      cardCount: snapshot.cardCount,
      reviewedCardCount: snapshot.reviewedCardCount,
      totalReviews: snapshot.totalReviews,
      successRate: snapshot.successRate,
      trendDelta: snapshot.trendDelta,
    })),
  }
}

export async function recordReview(
  cardId: string,
  rating: Rating,
  timeMs: number,
  algorithm: 'sm2' | 'fsrs' = 'sm2',
  algorithmParams?: Partial<AlgorithmParams>
): Promise<{ ok: boolean; error?: string; undoToken?: ReviewUndoToken }> {
  try {
    const card = await db.cards.get(cardId)
    if (!card) throw new Error(`Karte ${cardId} nicht gefunden`)

    const previousState: CardSchedulingState = {
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
    }

    const effectiveAlgorithm: 'sm2' | 'fsrs' = algorithm

    let cardUpdate: Partial<CardRecord>
    const sanitized = normalizeSchedulingInput(card, effectiveAlgorithm)

    if (effectiveAlgorithm === 'fsrs') {
      const updated = calculateCardStateAfterReviewFSRS(sanitized, rating, algorithmParams?.fsrs)
      cardUpdate = {
        type: updated.type,
        queue: updated.queue,
        due: updated.due,
        dueAt: updated.dueAt,
        interval: updated.interval,
        factor: updated.factor,
        stability: updated.stability,
        difficulty: updated.difficulty,
        reps: updated.reps,
        lapses: updated.lapses,
        algorithm: 'fsrs',
        updatedAt: Date.now(),
      }
    } else {
      const updated = calculateCardStateAfterReview(sanitized, rating, algorithmParams?.sm2)
      cardUpdate = {
        type: updated.type,
        queue: updated.queue,
        due: updated.due,
        dueAt: updated.dueAt,
        interval: updated.interval,
        factor: updated.factor,
        reps: updated.reps,
        lapses: updated.lapses,
        algorithm: 'sm2',
        updatedAt: Date.now(),
      }
    }

    const reviewTimestamp = Date.now()
    const reviewOpId = makeOpId()
    const persistedCardUpdate = { ...cardUpdate, updatedAt: reviewTimestamp }
    let reviewId = 0
    await db.transaction('rw', db.cards, db.reviews, async () => {
      await db.cards.update(cardId, persistedCardUpdate)
      reviewId = await db.reviews.add({
        opId: reviewOpId,
        cardId,
        rating,
        timeMs,
        timestamp: reviewTimestamp,
        createdAt: reviewTimestamp,
      })
    })

    await verifySchedulingPersistence(cardId, effectiveAlgorithm, persistedCardUpdate)

    await enqueueSyncOperation('review', {
      cardId,
      rating,
      timeMs,
      algorithm: effectiveAlgorithm,
      // algorithmVersion lets the server reject state downgrades (e.g. SM2
      // update overwriting a card already migrated to FSRS on another device).
      algorithmVersion: effectiveAlgorithm === 'fsrs' ? 2 : 1,
      updated: persistedCardUpdate,
      timestamp: reviewTimestamp,
    }, reviewOpId)

    emitReviewUpdatedEvent()

    return {
      ok: true,
      undoToken: {
        cardId,
        reviewId,
        previous: previousState,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[recordReview]', message)
    return { ok: false, error: message }
  }
}

export async function undoReview(token: ReviewUndoToken): Promise<{ ok: boolean; error?: string }> {
  try {
    // Issue #6 – forward-compensation: restore the previous scheduling state
    // but stamp it with a *new* updatedAt so least-wins/latest-wins sync on
    // other devices does not immediately overwrite the undo with the stale
    // post-review state (which carries an older timestamp).
    const restoredAt = Date.now()
    await db.transaction('rw', db.cards, db.reviews, async () => {
      await db.cards.update(token.cardId, { ...token.previous, updatedAt: restoredAt })
      await db.reviews.delete(token.reviewId)
    })

    await enqueueSyncOperation('review.undo', {
      cardId: token.cardId,
      reviewId: token.reviewId,
      restored: { ...token.previous, updatedAt: restoredAt },
      timestamp: restoredAt,
    })

    emitReviewUpdatedEvent()

    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[undoReview]', message)
    return { ok: false, error: message }
  }
}

export async function forceCardReviewTomorrow(cardId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const card = await db.cards.get(cardId)
    if (!card) {
      return { ok: false, error: `Karte ${cardId} nicht gefunden` }
    }

    const tomorrowStart = new Date()
    tomorrowStart.setHours(0, 0, 0, 0)
    tomorrowStart.setDate(tomorrowStart.getDate() + 1)
    const tomorrowMs = tomorrowStart.getTime()
    // Use UTC-epoch-day arithmetic (consistent with how SM2/FSRS set `due`) so
    // the `due` field is never behind today's UTC day in UTC+ timezones, which
    // would cause the card to appear prematurely in today's workload KPI.
    const tomorrowDays = Math.floor(Date.now() / 86_400_000) + 1

    const update: Partial<CardRecord> = {
      type: SM2.CARD_TYPE_REVIEW,
      queue: SM2.QUEUE_REVIEW,
      due: tomorrowDays,
      dueAt: tomorrowMs,
      interval: Math.max(1, card.interval || 1),
      updatedAt: Date.now(),
    }

    await db.cards.update(cardId, update)

    await enqueueSyncOperation('card.schedule.forceTomorrow', {
      cardId,
      update,
      timestamp: Date.now(),
    })

    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[forceCardReviewTomorrow]', message)
    return { ok: false, error: message }
  }
}

/**
 * Checks whether the backlog trigger condition is met, then redistributes
 * excess overdue cards over the next 14 days sorted by stability desc.
 *
 * @param sessionLimit - The daily card limit N (default 50)
 * @param rng          - Optional deterministic random source for testing
 */
export async function smoothBacklog(
  sessionLimit: number,
  rng: () => number = Math.random,
  nextDayStartsAt = 0,
): Promise<{ triggered: boolean; distributed: number }> {
  try {
    const nowMs = Date.now()
    const daysSinceEpoch = Math.floor(nowMs / 86_400_000)
    // Use local midnight so that cards become "overdue" at the start of the
    // user's calendar day rather than at UTC midnight (fixes UTC+ timezone drift).
    const todayLocalMs = getDayStartMs(nowMs, nextDayStartsAt)

    // Collect all non-deleted overdue review cards.
    const overdueCards = await db.cards
      .filter(c => {
        if (c.isDeleted) return false
        if (c.type !== SM2.CARD_TYPE_REVIEW) return false
        // Prefer the precise timestamp; fall back to epoch-day if absent.
        if (Number.isFinite(c.dueAt)) return (c.dueAt as number) < todayLocalMs
        return Math.max(0, Math.floor(c.due)) < daysSinceEpoch
      })
      .toArray()

    if (!shouldSmoothBacklog(overdueCards.length, sessionLimit)) {
      return { triggered: false, distributed: 0 }
    }

    // Sort descending by effective stability (most stable first = push furthest).
    const sorted = [...overdueCards].sort((a, b) => {
      const aS = Number.isFinite(a.stability) ? (a.stability as number) : (a.interval ?? 1)
      const bS = Number.isFinite(b.stability) ? (b.stability as number) : (b.interval ?? 1)
      return bS - aS
    })

    // Keep the `sessionLimit` least-stable cards for today; redistribute the rest.
    const toDistribute = sorted.slice(0, Math.max(0, sorted.length - sessionLimit))
    if (toDistribute.length === 0) return { triggered: true, distributed: 0 }

    const syncUpdates: Array<{ cardId: string; update: Partial<CardRecord> }> = []

    await db.transaction('rw', db.cards, async () => {
      for (let i = 0; i < toDistribute.length; i++) {
        const card = toDistribute[i]
        const newDueDays = computeNewDueDay(
          i,
          toDistribute.length,
          daysSinceEpoch,
          BACKLOG_SPREAD_DAYS,
          BACKLOG_FUZZ_FACTOR,
          rng,
        )
        const update: Partial<CardRecord> = {
          due: newDueDays,
          dueAt: newDueDays * 86_400_000,
          updatedAt: nowMs,
        }
        await db.cards.update(card.id, update)
        syncUpdates.push({ cardId: card.id, update })
      }
    })

    for (const item of syncUpdates) {
      await enqueueSyncOperation('card.update', {
        cardId: item.cardId,
        updates: item.update,
        timestamp: nowMs,
      })
    }

    emitReviewUpdatedEvent()
    return { triggered: true, distributed: toDistribute.length }
  } catch (err) {
    console.error('[smoothBacklog]', err)
    return { triggered: false, distributed: 0 }
  }
}
