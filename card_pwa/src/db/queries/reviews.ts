/**
 * AI_CONTEXT:
 * Role: Review write/read layer; records ratings, updates SM2/FSRS scheduling, supports undo/force-tomorrow, computes stats, forecasts, and backlog smoothing.
 * Used by: StudyView, home stats, metrics modals, heatmaps, and gamification.
 * Important: This is the scheduling source of truth; every review mutation must update card state, reviews, sync queue, diagnostics, and REVIEW_UPDATED_EVENT consistently.
 */
import { db, type CardRecord } from '../../db'
import { readAllCardsShared, readAllDecksShared } from './sharedReads'
import { calculateCardStateAfterReview, SM2, isStudyableCard } from '../../utils/sm2'
import { calculateCardStateAfterReviewFSRS } from '../../utils/fsrs'
import { type AlgorithmParams } from '../../utils/algorithmParams'
import { drainTransactionalOutbox, enqueueSyncOperation } from '../../services/syncQueue'
import { buildOpId } from '../../services/syncConfig'
import { REVIEW_UPDATED_EVENT } from '../../constants/appIdentity'
import { getDayStartMs, resolveDueAtMs } from '../../utils/time'
import {
  shouldSmoothBacklog,
  computeNewDueDay,
  BACKLOG_SPREAD_DAYS,
  BACKLOG_FUZZ_FACTOR,
} from '../../utils/backlogSmoother'
import { runStatsForecast } from '../../utils/workers/statsWorkerClient'
import { verifySchedulingPersistence } from './diagnostics'
import type {
  Rating,
  MetricsPeriod,
  DeckMetricsSnapshot,
  ShuffleCollectionMetricsSnapshot,
  ReviewAnswerDetails,
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
): Pick<CardRecord, 'factor' | 'interval' | 'stability' | 'difficulty' | 'reps' | 'lapses' | 'type' | 'queue' | 'due' | 'dueAt' | 'learningStep' | 'lastReviewedAt' | 'updatedAt'> {
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
    learningStep: Number.isFinite(card.learningStep)
      ? Math.max(0, Math.round(card.learningStep as number))
      : (type === 1 || type === 3) && due === 1 ? 1 : 0,
    lastReviewedAt: Number.isFinite(card.lastReviewedAt) ? Math.max(0, Math.round(card.lastReviewedAt as number)) : undefined,
    interval,
    factor,
    stability: algorithm === 'fsrs' ? clamp(finiteOr(card.stability, Math.max(0.5, interval || 1)), 0.5, 36500) : card.stability,
    difficulty: algorithm === 'fsrs' ? clamp(finiteOr(card.difficulty, factor / 500), 1, 10) : card.difficulty,
    reps,
    lapses,
    updatedAt: card.updatedAt,
  }
}

function computeSuccessRate(reviews: { rating: number }[]): number {
  if (reviews.length === 0) return 0
  return Math.round((reviews.filter(r => r.rating >= 3).length / reviews.length) * 100)
}

export interface DeckSuccessRate {
  /** Erfolgsquote in Prozent (Rating ≥ 3). */
  rate: number
  /** Anzahl zugrunde liegender Reviews — unter ~10 ist die Quote kaum belastbar. */
  total: number
}

/**
 * Erfolgsquote je Deck über alle Reviews der aktiven Karten. Grundlage der
 * Kalibrierungs-Anzeige bei den Lernvideos: Selbsteinschätzung („SICHER“) neben
 * der tatsächlichen Quote des Objective-Decks.
 */
export async function getDeckSuccessRates(deckIds: string[]): Promise<Record<string, DeckSuccessRate>> {
  if (deckIds.length === 0) return {}

  const cards = (await db.cards.where('deckId').anyOf(deckIds).toArray()).filter(c => !c.isDeleted)
  if (cards.length === 0) {
    return Object.fromEntries(deckIds.map(id => [id, { rate: 0, total: 0 }]))
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

  const result: Record<string, DeckSuccessRate> = {}
  for (const [deckId, { total, success }] of totals.entries()) {
    result[deckId] = { rate: total === 0 ? 0 : Math.round((success / total) * 100), total }
  }

  return result
}

export interface YoungCardLapseStats {
  /** Anteil Again-Ratings in Prozent. */
  rate: number
  /** Anzahl betrachteter Reviews (n) — Aussagekraft erst ab ~30. */
  total: number
}

/**
 * Lapse-Rate junger Karten: Anteil Again unter den jeweils ERSTEN `maxReps`
 * Reviews einer Karte, beschränkt auf die letzten `days` Tage. Entscheidungs-
 * grundlage für FSRS-Learning-Steps (Audit ⑥): erst messen, dann Parameter
 * drehen — eine hohe Quote hier spricht für Intraday-Lernschritte.
 */
export async function getYoungCardLapseRate(days = 30, maxReps = 3): Promise<YoungCardLapseStats> {
  const cutoff = Date.now() - days * 86_400_000
  const reviews = await db.reviews.toArray()
  reviews.sort((a, b) => a.timestamp - b.timestamp)

  const repsByCard = new Map<string, number>()
  let total = 0
  let lapses = 0
  for (const review of reviews) {
    const reps = repsByCard.get(review.cardId) ?? 0
    repsByCard.set(review.cardId, reps + 1)
    if (reps >= maxReps) continue
    if (review.timestamp < cutoff) continue
    total += 1
    if (review.rating === 1) lapses += 1
  }

  return { rate: total === 0 ? 0 : Math.round((lapses / total) * 100), total }
}

/**
 * Zählt Karten, deren ERSTE Bewertung überhaupt heute passiert ist — also die
 * heute „angebrochene" Neu-Karten-Dosis. Grundlage der Tagesdosis-Kappe
 * (`newCardsPerDay`): Sessions dürfen nur noch die Differenz an neuen Karten
 * ziehen. Wiederholungen bereits bekannter Karten zählen nicht.
 */
export async function countNewCardsIntroducedToday(nextDayStartsAt = 0): Promise<number> {
  const todayStartMs = getDayStartMs(Date.now(), nextDayStartsAt)
  const todayReviews = await db.reviews.where('timestamp').aboveOrEqual(todayStartMs).toArray()
  const cardIds = Array.from(new Set(todayReviews.map(review => review.cardId)))
  if (cardIds.length === 0) return 0

  // Der fruehere Compound-Index `[cardId+timestamp]` wurde mit DB v16
  // absichtlich entfernt. Alle Reviews der heute beruehrten Karten ueber den
  // vorhandenen cardId-Index in EINEM Lauf lesen; das vermeidet sowohl den
  // SchemaError als auch eine langsame N+1-Abfrage auf mobilen Geraeten.
  const relatedReviews = await db.reviews.where('cardId').anyOf(cardIds).toArray()
  const previouslyReviewed = new Set(
    relatedReviews
      .filter(review => review.timestamp < todayStartMs)
      .map(review => review.cardId),
  )
  return cardIds.filter(cardId => !previouslyReviewed.has(cardId)).length
}

/**
 * IDs der Karten eines Decks, die heute mindestens einmal bewertet wurden.
 * Misst den Karten-Schritt des Heute-Pakets ehrlich über echten Abruf statt
 * über Klicks auf den Start-Button.
 */
export async function listDeckCardIdsReviewedToday(deckId: string, nextDayStartsAt = 0): Promise<string[]> {
  const todayStartMs = getDayStartMs(Date.now(), nextDayStartsAt)
  return listDeckCardIdsReviewedSince(deckId, todayStartMs)
}

/**
 * IDs der Karten eines Decks, die seit einem frei waehlbaren Paket-Start
 * bewertet wurden. So koennen mehrere Heute-Pakete am selben Tag dieselben
 * Objective-Decks verwenden, ohne Ergebnisse des vorigen Pakets mitzunehmen.
 */
/**
 * IDs aus einer festen Kartenmenge, die seit einem Zeitpunkt bewertet wurden.
 * Deckunabhängig — misst den Karten-Schritt einer eingefrorenen
 * Lerneinheiten-Ausführung, deren `cardIds` auch außerhalb des
 * Objective-Decks liegen können (Fehlmappings, §8.1).
 */
export async function listCardIdsReviewedSince(cardIds: readonly string[], sinceMs: number): Promise<string[]> {
  if (cardIds.length === 0) return []
  const wanted = new Set(cardIds)
  const reviews = await db.reviews.where('timestamp').aboveOrEqual(sinceMs).toArray()
  const reviewed = new Set<string>()
  for (const review of reviews) {
    if (wanted.has(review.cardId)) reviewed.add(review.cardId)
  }
  return Array.from(reviewed)
}

export async function listDeckCardIdsReviewedSince(deckId: string, sinceMs: number): Promise<string[]> {
  const [todayReviews, deckCards] = await Promise.all([
    db.reviews.where('timestamp').aboveOrEqual(sinceMs).toArray(),
    db.cards.where('deckId').equals(deckId).toArray(),
  ])
  const deckCardIds = new Set(deckCards.filter(card => !card.isDeleted).map(card => card.id))
  const reviewed = new Set<string>()
  for (const review of todayReviews) {
    if (deckCardIds.has(review.cardId)) reviewed.add(review.cardId)
  }
  return Array.from(reviewed)
}

export async function getGlobalStats(nextDayStartsAt = 0): Promise<GlobalStats> {
  const nowMs = Date.now()
  const dayMs = 86_400_000
  const daysSinceEpoch = Math.floor(nowMs / dayMs)
  const todayStartMs = getDayStartMs(nowMs, nextDayStartsAt)

  function resolveDueEpoch(card: CardRecord): number {
    return Math.max(0, Math.floor(card.due))
  }

  // Ein geteilter Karten-Scan statt sechs Einzel-Queries (davon zwei
  // JS-Full-Scans über .filter().count()); alle Zähler in einem Durchgang.
  const [cards, decks, reviewsToday] = await Promise.all([
    readAllCardsShared(),
    readAllDecksShared(),
    db.reviews.where('timestamp').aboveOrEqual(todayStartMs).toArray(),
  ])

  let total = 0
  let newCount = 0
  let learningCount = 0
  let reviewCount = 0
  let overdueGt2DaysCount = 0
  let nowDue = 0

  for (const card of cards) {
    if (card.isDeleted) continue
    total += 1

    // Suspendierte Karten zählen zum Bestand, aber nie als new/learning/due.
    if (!isStudyableCard(card)) continue

    const isLearningType = card.type === SM2.CARD_TYPE_LEARNING || card.type === SM2.CARD_TYPE_RELEARNING
    const isReviewType = card.type === SM2.CARD_TYPE_REVIEW

    if (card.type === SM2.CARD_TYPE_NEW) {
      newCount += 1
    } else if (isLearningType) {
      learningCount += 1
    } else if (isReviewType) {
      reviewCount += 1
    }

    if ((isLearningType || isReviewType) && resolveDueEpoch(card) > daysSinceEpoch) {
      overdueGt2DaysCount += 1
    }

    if (resolveDueEpoch(card) <= daysSinceEpoch || resolveDueAtMs(card) <= nowMs) {
      nowDue += 1
    }
  }

  const deckCount = decks.filter(d => !d.isDeleted).length
  const reviewedToday = reviewsToday.length
  const successfulToday = reviewsToday.filter(review => review.rating >= 3).length
  const successToday = reviewedToday === 0 ? 0 : Math.round((successfulToday / reviewedToday) * 100)

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

  const result = Array.from({ length: normalizedDays }, (_, idx) => ({
    dayStartMs: tomorrowStartMs + idx * dayMs,
    count: 0,
  }))

  const rows = (await readAllCardsShared())
    .filter(c => !c.isDeleted && (c.type === SM2.CARD_TYPE_LEARNING || c.type === SM2.CARD_TYPE_RELEARNING || c.type === SM2.CARD_TYPE_REVIEW))

  const counts = await runStatsForecast({
    type: 'forecast',
    profileId: 'default',
    cards: rows,
    days: normalizedDays,
    nowMs,
  })

  counts.forEach((count, idx) => {
    if (idx >= 0 && idx < result.length) {
      result[idx].count = count
    }
  })

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
  algorithmParams?: Partial<AlgorithmParams>,
  /** Konkrete Antwort interaktiver Karten — richtige wie falsche laufen über
   *  denselben Pfad; Karten ohne Auswahl übergeben nichts. */
  answer?: ReviewAnswerDetails
): Promise<{ ok: boolean; error?: string; undoToken?: ReviewUndoToken; cardState?: CardSchedulingState }> {
  try {
    const card = await db.cards.get(cardId)
    if (!card) throw new Error(`Karte ${cardId} nicht gefunden`)

    const previousState: CardSchedulingState = {
      type: card.type,
      queue: card.queue,
      due: card.due,
      dueAt: card.dueAt,
      learningStep: card.learningStep,
      lastReviewedAt: card.lastReviewedAt,
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
        learningStep: updated.learningStep,
        lastReviewedAt: updated.lastReviewedAt,
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
        learningStep: updated.learningStep,
        lastReviewedAt: updated.lastReviewedAt,
        interval: updated.interval,
        factor: updated.factor,
        reps: updated.reps,
        lapses: updated.lapses,
        algorithm: 'sm2',
        updatedAt: Date.now(),
      }
    }

    const reviewTimestamp = Date.now()
    const reviewOpId = buildOpId()
    const persistedCardUpdate = { ...cardUpdate, updatedAt: reviewTimestamp }
    // Antwortdetails hängen an derselben Review-Zeile (cardId-Zuordnung,
    // append-only Historie) — kein zweiter Speicherpfad.
    const answerFields = answer
      ? {
          selectedAnswer: answer.selected,
          correctAnswer: answer.correct,
          answerCorrect: answer.wasCorrect,
        }
      : {}
    const reviewSyncPayload = {
      cardId,
      rating,
      timeMs,
      algorithm: effectiveAlgorithm,
      // algorithmVersion lets the server reject state downgrades (e.g. SM2
      // update overwriting a card already migrated to FSRS on another device).
      algorithmVersion: effectiveAlgorithm === 'fsrs' ? 2 : 1,
      updated: persistedCardUpdate,
      timestamp: reviewTimestamp,
      ...(answer ? { answer } : {}),
    }
    let reviewId = 0
    await db.transaction('rw', db.cards, db.reviews, db.syncOutbox, async () => {
      await db.cards.update(cardId, persistedCardUpdate)
      reviewId = await db.reviews.add({
        opId: reviewOpId,
        cardId,
        rating,
        timeMs,
        timestamp: reviewTimestamp,
        createdAt: reviewTimestamp,
        ...answerFields,
      })
      await db.syncOutbox.put({
        opId: reviewOpId,
        type: 'review',
        payload: JSON.stringify(reviewSyncPayload),
        createdAt: reviewTimestamp,
      })
    })

    // Alles nach diesem Punkt ist best effort: Karte, Review und Sync-Outbox
    // sind bereits gemeinsam committed. Ein Diagnose-/Queuefehler darf die UI
    // niemals zum erneuten Anwenden derselben Bewertung auffordern.
    try {
      await verifySchedulingPersistence(cardId, effectiveAlgorithm, persistedCardUpdate)
    } catch (error) {
      console.error('[recordReview:verify]', error)
    }
    try {
      await drainTransactionalOutbox()
    } catch (error) {
      console.warn('[recordReview:outbox] Outbox bleibt für den nächsten Flush erhalten', error)
    }

    emitReviewUpdatedEvent()

    return {
      ok: true,
      cardState: {
        ...previousState,
        ...persistedCardUpdate,
      },
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

/** Baut den Reset-Zustand einer Karte („neu“, heute fällig, Historie genullt).
 *  Pure Konstruktion — auch der Pull-Applier (progress.reset) nutzt sie. */
export function buildResetCardRecord(
  card: CardRecord,
  input: { timestamp: number; dueDay: number; dueAt: number },
): CardRecord {
  const record: CardRecord = {
    ...card,
    type: SM2.CARD_TYPE_NEW,
    queue: SM2.QUEUE_NEW,
    due: input.dueDay,
    dueAt: input.dueAt,
    learningStep: 0,
    interval: 0,
    factor: 2500,
    reps: 0,
    lapses: 0,
    updatedAt: input.timestamp,
  }
  delete record.stability
  delete record.difficulty
  delete record.lastReviewedAt
  return record
}

/**
 * Setzt den kompletten Lernfortschritt zurück: alle Karten auf „neu“ (heute
 * fällig), Review-Historie und abgeleitete Metriken (Heatmap, Streak, Stats)
 * geleert. Decks, Karteninhalte und Notizen bleiben erhalten.
 *
 * Sync: läuft als eigene Operation `progress.reset`, weil die
 * „höhere-reps-gewinnen“-Konfliktregel (Server + Pull) ein normales
 * card.update mit reps=0 verwerfen würde — der Reset käme beim nächsten
 * Sync sonst zurück.
 */
export async function resetLearningProgress(): Promise<{ ok: boolean; cards: number; error?: string }> {
  try {
    const timestamp = Date.now()
    const dueDay = Math.floor(timestamp / 86_400_000)
    const dueAt = dueDay * 86_400_000

    let resetCount = 0
    await db.transaction('rw', [db.cards, db.reviews, db.cardStats, db.deckProgress, db.activeSessions], async () => {
      const cards = await db.cards.toArray()
      const resetCards = cards
        .filter(card => !card.isDeleted)
        .map(card => buildResetCardRecord(card, { timestamp, dueDay, dueAt }))
      resetCount = resetCards.length
      if (resetCards.length > 0) {
        await db.cards.bulkPut(resetCards)
      }
      await db.reviews.clear()
      await db.cardStats.clear()
      await db.deckProgress.clear()
      await db.activeSessions.clear()
    })

    await enqueueSyncOperation('progress.reset', { timestamp, due: dueDay, dueAt })

    emitReviewUpdatedEvent()

    return { ok: true, cards: resetCount }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[resetLearningProgress]', message)
    return { ok: false, cards: 0, error: message }
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
      learningStep: 0,
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
