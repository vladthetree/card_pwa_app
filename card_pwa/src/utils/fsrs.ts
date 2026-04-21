/**
 * FSRS (Free Spaced Repetition Scheduler)
 * Adapter over ts-fsrs that keeps the app's existing scheduling API.
 */

import type { CardRecord } from '../db'
import { factorToDifficulty, normalizeFSRSParams, type FSRSParams } from './algorithmParams'
import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  State as FsrsState,
  type Card,
  type Grade,
} from 'ts-fsrs'

// ─── Helper Functions ────────────────────────────────────────────────────────

function clampStability(stability: number): number {
  if (!Number.isFinite(stability) || Number.isNaN(stability)) return 0.5
  return Math.max(0.5, Math.min(36500, stability))
}

function clampDifficulty(difficulty: number): number {
  if (!Number.isFinite(difficulty) || Number.isNaN(difficulty)) return 5
  return Math.max(1, Math.min(10, difficulty))
}

const MANIFEST_MIN_STABILITY = 0.5
const MANIFEST_DIFFICULTY_LIGHT_STEP = 0.15
const MANIFEST_DIFFICULTY_STRONG_STEP = 0.4

function toEpochDay(value: number): number {
  return Math.max(0, Math.floor(value))
}

function dayToDate(day: number): Date {
  return new Date(day * 86_400_000)
}

function mapCardTypeToFsrsState(type: number): FsrsState {
  switch (type) {
    case 1:
      return FsrsState.Learning
    case 2:
      return FsrsState.Review
    case 3:
      return FsrsState.Relearning
    default:
      return FsrsState.New
  }
}

function mapFsrsStateToCardType(state: FsrsState): number {
  switch (state) {
    case FsrsState.Learning:
      return 1
    case FsrsState.Review:
      return 2
    case FsrsState.Relearning:
      return 3
    default:
      return 0
  }
}

function mapFsrsStateToQueue(state: FsrsState): number {
  switch (state) {
    case FsrsState.Review:
      return 2
    case FsrsState.New:
      return 0
    default:
      return 1
  }
}

function estimateElapsedDays(today: number, interval: number, due: number): number {
  if (interval <= 0) return 0
  const inferredLastReview = due - interval
  return Math.max(0, today - inferredLastReview)
}

function buildScheduler(cfg: FSRSParams) {
  const base = generatorParameters({
    request_retention: cfg.requestRetention,
    enable_fuzz: false,
    enable_short_term: false,
    learning_steps: [],
    relearning_steps: [],
  })

  const mergedWeights = [...base.w]
  cfg.w.forEach((value, index) => {
    if (index < mergedWeights.length && Number.isFinite(value)) {
      mergedWeights[index] = value
    }
  })

  return fsrs({
    ...base,
    w: mergedWeights,
  })
}

function toFsrsCard(
  card: Pick<CardRecord, 'factor' | 'interval' | 'stability' | 'difficulty' | 'reps' | 'lapses' | 'type' | 'due' | 'dueAt'>,
  today: number
): Card {
  const dueAt = Number.isFinite(card.dueAt) ? Math.max(0, Math.round(card.dueAt as number)) : toEpochDay(card.due ?? today) * 86_400_000
  const due = toEpochDay(dueAt / 86_400_000)
  const interval = Math.max(0, Math.round(card.interval ?? 0))
  const elapsedDays = estimateElapsedDays(today, interval, due)

  const base = createEmptyCard(dayToDate(today))
  base.state = mapCardTypeToFsrsState(Math.round(card.type ?? 0))
  base.due = new Date(dueAt)
  base.scheduled_days = interval
  base.reps = Number.isFinite(card.reps) ? Math.max(0, Math.round(card.reps as number)) : 0
  base.lapses = Number.isFinite(card.lapses) ? Math.max(0, Math.round(card.lapses as number)) : 0
  base.stability = clampStability(card.stability ?? Math.max(0.5, interval || 1))
  base.difficulty = clampDifficulty(card.difficulty ?? factorToDifficulty(card.factor ?? 2500))
  if (elapsedDays > 0) {
    base.last_review = dayToDate(today - elapsedDays)
  }

  return base
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface FSRSCardState {
  stability: number // Wie gut man die Karte erinnert
  difficulty: number // Wie schwer die Karte ist
  lastReview: number // Letztes Review (Tage seit Epoche)
  reps: number // Anzahl Wiederholungen
  lapses: number // Anzahl Fehler
}

export interface CardStateUpdate {
  factor: number // Ease (kompatibel mit SM2)
  interval: number
  stability: number
  difficulty: number
  reps: number
  lapses: number
  type: number
  queue: number
  due: number
  dueAt: number
}

// Default-Zustand für neue Karten
export function initializeFSRS(): FSRSCardState {
  const card = createEmptyCard(new Date())
  return {
    stability: clampStability(card.stability),
    difficulty: clampDifficulty(card.difficulty),
    lastReview: Math.floor(Date.now() / 86_400_000),
    reps: 0,
    lapses: 0,
  }
}

export function calculateCardStateAfterReviewFSRS(
  card: Pick<CardRecord, 'factor' | 'interval' | 'stability' | 'difficulty' | 'reps' | 'lapses' | 'type' | 'queue' | 'due' | 'dueAt'>,
  rating: 1 | 2 | 3 | 4,
  params?: Partial<FSRSParams>
): CardStateUpdate {
  if (rating < 1 || rating > 4) {
    throw new RangeError(`Invalid FSRS rating: ${rating}. Expected value in range 1-4.`)
  }

  const nowMs = Date.now()
  const daysSinceEpoch = toEpochDay(nowMs / 86_400_000)
  const localMidnight = new Date(nowMs)
  localMidnight.setHours(0, 0, 0, 0)
  const todayLocalMs = localMidnight.getTime()
  const cfg = normalizeFSRSParams(params)

  const scheduler = buildScheduler(cfg)
  const source = toFsrsCard(card, daysSinceEpoch)
  const scheduled = scheduler.next(source, dayToDate(daysSinceEpoch), rating as Grade)
  const next = scheduled.card

  const computedDueAt = Math.max(nowMs, next.due.getTime())
  const computedDeltaMs = Math.max(0, computedDueAt - nowMs)
  let adjustedDeltaMs = computedDeltaMs
  if (rating === 2) {
    adjustedDeltaMs = computedDeltaMs / cfg.hardPen
  } else if (rating === 4) {
    adjustedDeltaMs = computedDeltaMs * cfg.easyBonus
  }
  const dueAt = Math.max(nowMs, Math.round(nowMs + adjustedDeltaMs))
  // FSRS in this app never schedules intraday review steps; keep interval >= 1 day.
  const interval = Math.max(1, Math.floor((dueAt - todayLocalMs) / 86_400_000))
  const dueDay = daysSinceEpoch + interval
  const fallbackType = mapFsrsStateToCardType(next.state)
  const fallbackQueue = mapFsrsStateToQueue(next.state)
  const previousStability = clampStability(
    card.stability ?? Math.max(MANIFEST_MIN_STABILITY, Math.round(card.interval ?? 0) || 1)
  )
  const previousDifficulty = clampDifficulty(card.difficulty ?? ((card.factor ?? 2500) / 500))

  let stability = clampStability(next.stability)
  let difficulty = clampDifficulty(next.difficulty)

  // Manifest option C: explicit rating semantics for S/D.
  if (rating === 1) {
    stability = MANIFEST_MIN_STABILITY
    difficulty = clampDifficulty(previousDifficulty + MANIFEST_DIFFICULTY_STRONG_STEP)
  } else if (rating === 2) {
    stability = clampStability(previousStability * cfg.hardPen)
    difficulty = clampDifficulty(Math.max(difficulty, previousDifficulty + MANIFEST_DIFFICULTY_LIGHT_STEP))
  } else if (rating === 4) {
    stability = clampStability(previousStability * cfg.easyBonus)
    difficulty = clampDifficulty(Math.min(difficulty, previousDifficulty - MANIFEST_DIFFICULTY_LIGHT_STEP))
  }

  return {
    factor: Math.round(difficulty * 500),
    interval,
    stability,
    difficulty,
    reps: Math.max(0, Math.round(next.reps)),
    lapses: Math.max(0, Math.round(next.lapses)),
    type: fallbackType,
    queue: fallbackQueue,
    due: dueDay,
    dueAt,
  }
}
