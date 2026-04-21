import type { CardRecord } from '../db'
import { DEFAULT_SM2_PARAMS, normalizeSM2Params, type SM2Params } from './algorithmParams'

// ─── SM-2 Constants ──────────────────────────────────────────────────────────

export const SM2 = {
  MIN_EASE: DEFAULT_SM2_PARAMS.minEase,
  DEFAULT_EASE: DEFAULT_SM2_PARAMS.defaultEase,
  MAX_EASE: DEFAULT_SM2_PARAMS.maxEase,

  EASE_AGAIN: DEFAULT_SM2_PARAMS.easeAgain,
  EASE_HARD: DEFAULT_SM2_PARAMS.easeHard,
  EASE_GOOD: DEFAULT_SM2_PARAMS.easeGood,
  EASE_EASY: DEFAULT_SM2_PARAMS.easeEasy,

  CARD_TYPE_NEW:        0,
  CARD_TYPE_LEARNING:   1,
  CARD_TYPE_REVIEW:     2,
  CARD_TYPE_RELEARNING: 3,

  QUEUE_SUSPENDED: -1,
  QUEUE_NEW:        0,
  QUEUE_LEARNING:   1,
  QUEUE_REVIEW:     2,

  AGAIN_INTERVAL:   1,
  HARD_MULTIPLIER: DEFAULT_SM2_PARAMS.hardMultiplier,
  EASY_MULTIPLIER: DEFAULT_SM2_PARAMS.easyMultiplier,
} as const

// ─── Private Helpers ─────────────────────────────────────────────────────────

function calculateNewEase(currentEase: number, rating: number, params: SM2Params): number {
  const adjustments: Record<number, number> = {
    1: params.easeAgain,
    2: params.easeHard,
    3: params.easeGood,
    4: params.easeEasy,
  }
  const baseAdjustment = adjustments[rating] ?? 0
  // Keep legacy behavior at default ease (2500) while making deltas proportional
  // to the current ease for mathematically more consistent scaling.
  const adjustment = Math.round((baseAdjustment * currentEase) / params.defaultEase)
  return Math.max(params.minEase, Math.min(params.maxEase, currentEase + adjustment))
}

function calculateNewInterval(currentInterval: number, ease: number, rating: number, params: SM2Params): number {
  switch (rating) {
    case 1: // Again
      return SM2.AGAIN_INTERVAL
    case 2: // Hard
      return Math.max(1, Math.floor(currentInterval * params.hardMultiplier))
    case 3: // Good
      return Math.max(1, Math.round(currentInterval * ease / 1000))
    case 4: // Easy
      return Math.max(3, Math.round(currentInterval * ease / 1000 * params.easyMultiplier))
    default:
      return currentInterval
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface CardStateUpdate {
  factor: number
  interval: number
  reps: number
  lapses: number
  type: number
  queue: number
  due: number
  dueAt: number
}

/**
 * Berechnet den neuen Card-State nach einer Bewertung.
 * Arbeitet mit Anki's internem Format (factor = ease × 1000).
 */
export function calculateCardStateAfterReview(
  card: Pick<CardRecord, 'factor' | 'interval' | 'reps' | 'lapses' | 'type' | 'queue' | 'due' | 'dueAt'>,
  rating: 1 | 2 | 3 | 4,
  params?: Partial<SM2Params>
): CardStateUpdate {
  if (rating < 1 || rating > 4) {
    throw new RangeError(`Invalid SM-2 rating: ${rating}. Expected value in range 1-4.`)
  }

  const nowMs = Date.now()
  const daysSinceEpoch = Math.floor(nowMs / 86_400_000)
  const localMidnight = new Date(nowMs)
  localMidnight.setHours(0, 0, 0, 0)
  const todayStartMs = localMidnight.getTime()
  const ONE_MINUTE_MS = 60_000
  const TEN_MINUTES_MS = 10 * ONE_MINUTE_MS
  const cfg = normalizeSM2Params(params)

  let factor = Number.isFinite(card.factor) ? Math.round(card.factor as number) : cfg.defaultEase
  let interval = Number.isFinite(card.interval) ? Math.max(0, Math.round(card.interval as number)) : 0
  let reps = Number.isFinite(card.reps) ? Math.max(0, Math.round(card.reps as number)) : 0
  let lapses = Number.isFinite(card.lapses) ? Math.max(0, Math.round(card.lapses as number)) : 0

  factor = Math.max(cfg.minEase, Math.min(cfg.maxEase, factor))
  const currentFactor = factor

  // Neue und Lernkarten sollen zuerst graduieren, statt sofort Review zu werden.
  if (card.type === SM2.CARD_TYPE_NEW || card.type === SM2.CARD_TYPE_LEARNING) {
    if (rating === 1) {
      if (card.type !== SM2.CARD_TYPE_NEW) {
        lapses += 1
      }
      // Issue #11: A card in the *learning* phase stays in LEARNING when rated
      // "Again" — it does NOT move to RELEARNING.  RELEARNING is reserved
      // exclusively for cards that previously reached the REVIEW queue and then
      // lapsed (see the SM2.CARD_TYPE_REVIEW branch below).
      return {
        factor: calculateNewEase(currentFactor, rating, cfg),
        interval: 0,
        reps: 0,
        lapses,
        type: SM2.CARD_TYPE_LEARNING,
        queue: SM2.QUEUE_LEARNING,
        due: Math.floor((nowMs + ONE_MINUTE_MS) / 86_400_000),
        dueAt: nowMs + ONE_MINUTE_MS,
      }
    }

    if (rating === 4) {
      reps += 1
      return {
        factor: calculateNewEase(currentFactor, rating, cfg),
        interval: cfg.easyInterval,
        reps,
        lapses,
        type: SM2.CARD_TYPE_REVIEW,
        queue: SM2.QUEUE_REVIEW,
        due: daysSinceEpoch + cfg.easyInterval,
        dueAt: todayStartMs + cfg.easyInterval * 86_400_000,
      }
    }

    reps += 1
    if (reps >= 2) {
      const graduateInterval = rating === 2 ? cfg.hardGraduatingInterval : cfg.graduatingInterval
      return {
        factor: calculateNewEase(currentFactor, rating, cfg),
        interval: graduateInterval,
        reps,
        lapses,
        type: SM2.CARD_TYPE_REVIEW,
        queue: SM2.QUEUE_REVIEW,
        due: daysSinceEpoch + graduateInterval,
        dueAt: todayStartMs + graduateInterval * 86_400_000,
      }
    }

    return {
      factor: calculateNewEase(currentFactor, rating, cfg),
      interval: 0,
      reps,
      lapses,
      type: SM2.CARD_TYPE_LEARNING,
      queue: SM2.QUEUE_LEARNING,
      due: Math.floor((nowMs + TEN_MINUTES_MS) / 86_400_000),
      dueAt: nowMs + TEN_MINUTES_MS,
    }
  }

  // Relearning cards should not reuse long-term review interval growth.
  // A successful relearning step returns the card to review with a short reset interval.
  if (card.type === SM2.CARD_TYPE_RELEARNING) {
    const newFactor = calculateNewEase(currentFactor, rating, cfg)

    if (rating === 1) {
      lapses += 1
      return {
        factor: newFactor,
        interval: 0,
        reps,
        lapses,
        type: SM2.CARD_TYPE_RELEARNING,
        queue: SM2.QUEUE_LEARNING,
        due: Math.floor((nowMs + TEN_MINUTES_MS) / 86_400_000),
        dueAt: nowMs + TEN_MINUTES_MS,
      }
    }

    reps += 1
    const relearnInterval = SM2.AGAIN_INTERVAL
    return {
      factor: newFactor,
      interval: relearnInterval,
      reps,
      lapses,
      type: SM2.CARD_TYPE_REVIEW,
      queue: SM2.QUEUE_REVIEW,
      due: daysSinceEpoch + relearnInterval,
      dueAt: todayStartMs + relearnInterval * 86_400_000,
    }
  }

  const newInterval = calculateNewInterval(interval, currentFactor, rating, cfg)
  const newFactor = calculateNewEase(currentFactor, rating, cfg)

  let type: number
  let queue: number

  if (rating === 1) {
    // Again → Relearning
    type   = SM2.CARD_TYPE_RELEARNING
    queue  = SM2.QUEUE_LEARNING
    lapses += 1
    return {
      factor: newFactor,
      interval: 0,
      reps,
      lapses,
      type,
      queue,
      due: Math.floor((nowMs + TEN_MINUTES_MS) / 86_400_000),
      dueAt: nowMs + TEN_MINUTES_MS,
    }
  } else {
    // Hard / Good / Easy → bleibt im Review-Queue
    type  = SM2.CARD_TYPE_REVIEW
    queue = SM2.QUEUE_REVIEW
    reps += 1
  }

  const due = daysSinceEpoch + newInterval
  const dueAt = todayStartMs + newInterval * 86_400_000

  return { factor: newFactor, interval: newInterval, reps, lapses, type, queue, due, dueAt }
}
