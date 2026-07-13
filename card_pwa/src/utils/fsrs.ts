/**
 * AI_CONTEXT:
 * Role: Adapter around ts-fsrs that maps app CardRecord scheduling fields to FSRS stability/difficulty updates.
 * Used by: review writes and algorithm migration paths when settings.algorithm is fsrs.
 * Important: Preserve the app-level scheduling API so SM2/FSRS can be switched without changing Review query callers.
 */
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
  return Math.max(0.001, Math.min(36500, stability))
}

function clampDifficulty(difficulty: number): number {
  if (!Number.isFinite(difficulty) || Number.isNaN(difficulty)) return 5
  return Math.max(1, Math.min(10, difficulty))
}

const DAY_MS = 86_400_000

/** Ankis bewährte kurze Standardschritte. FSRS bestimmt danach das
 * Langzeitintervall; alle Schritte bleiben bewusst unter einem Tag. */
export const FSRS_LEARNING_STEPS = ['1m', '10m'] as const
export const FSRS_RELEARNING_STEPS = ['10m'] as const

function toEpochDay(value: number): number {
  return Math.max(0, Math.floor(value))
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

function buildScheduler(cfg: FSRSParams) {
  const base = generatorParameters({
    request_retention: cfg.requestRetention,
    // Anki streut Tagesintervalle leicht, damit gleichzeitig gelernte Karten
    // nicht dauerhaft als Block zusammenbleiben.
    enable_fuzz: true,
    enable_short_term: true,
    learning_steps: FSRS_LEARNING_STEPS,
    relearning_steps: FSRS_RELEARNING_STEPS,
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
  card: Pick<CardRecord, 'factor' | 'interval' | 'stability' | 'difficulty' | 'reps' | 'lapses' | 'type' | 'due' | 'dueAt' | 'learningStep' | 'lastReviewedAt' | 'updatedAt'>,
  nowMs: number,
): Card {
  const today = toEpochDay(nowMs / DAY_MS)
  const dueAt = Number.isFinite(card.dueAt) ? Math.max(0, Math.round(card.dueAt as number)) : toEpochDay(card.due ?? today) * DAY_MS
  const interval = Math.max(0, Math.round(card.interval ?? 0))
  const state = mapCardTypeToFsrsState(Math.round(card.type ?? 0))

  const base = createEmptyCard(new Date(nowMs))
  base.state = state
  base.due = new Date(dueAt)
  base.scheduled_days = interval
  // `due` ist bei FSRS-(Re)Learning-Karten wie bei Anki der aktuelle
  // Lernschritt. Ältere Datensätze enthielten hier teils einen Epoch-Tag;
  // solche Werte werden sicher auf den ersten Schritt zurückgeführt.
  base.learning_steps = state === FsrsState.Learning || state === FsrsState.Relearning
    ? Number.isFinite(card.learningStep)
      ? Math.max(0, Math.round(card.learningStep as number))
      : (card.due === 1 ? 1 : 0)
    : 0
  base.reps = Number.isFinite(card.reps) ? Math.max(0, Math.round(card.reps as number)) : 0
  base.lapses = Number.isFinite(card.lapses) ? Math.max(0, Math.round(card.lapses as number)) : 0
  base.stability = clampStability(card.stability ?? Math.max(0.5, interval || 1))
  base.difficulty = clampDifficulty(card.difficulty ?? factorToDifficulty(card.factor ?? 2500))

  if (base.reps > 0 || state !== FsrsState.New) {
    const inferredLastReviewAt = interval > 0 ? dueAt - interval * DAY_MS : Math.min(dueAt, nowMs)
    // Bei Review-Karten ist dueAt - interval belastbarer als updatedAt, denn
    // auch eine reine Inhaltsänderung aktualisiert updatedAt. In kurzen
    // (Re)Learning-Schritten markiert updatedAt dagegen die letzte Bewertung.
    const lastReviewAt = Number.isFinite(card.lastReviewedAt)
      ? Math.min(nowMs, Math.max(0, Math.round(card.lastReviewedAt as number)))
      : state === FsrsState.Review && interval > 0
        ? Math.max(0, inferredLastReviewAt)
        : Number.isFinite(card.updatedAt)
          ? Math.min(nowMs, Math.max(0, Math.round(card.updatedAt as number)))
          : Math.max(0, inferredLastReviewAt)
    base.last_review = new Date(lastReviewAt)
  }

  return base
}

// ─── Public API ──────────────────────────────────────────────────────────────

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
  learningStep: number
  lastReviewedAt: number
}

export function calculateCardStateAfterReviewFSRS(
  card: Pick<CardRecord, 'factor' | 'interval' | 'stability' | 'difficulty' | 'reps' | 'lapses' | 'type' | 'queue' | 'due' | 'dueAt' | 'learningStep' | 'lastReviewedAt' | 'updatedAt'>,
  rating: 1 | 2 | 3 | 4,
  params?: Partial<FSRSParams>
): CardStateUpdate {
  if (rating < 1 || rating > 4) {
    throw new RangeError(`Invalid FSRS rating: ${rating}. Expected value in range 1-4.`)
  }

  const nowMs = Date.now()
  const cfg = normalizeFSRSParams(params)

  const scheduler = buildScheduler(cfg)
  const source = toFsrsCard(card, nowMs)
  const scheduled = scheduler.next(source, new Date(nowMs), rating as Grade)
  const next = scheduled.card

  const dueAt = Math.max(nowMs, Math.round(next.due.getTime()))
  const type = mapFsrsStateToCardType(next.state)
  const queue = mapFsrsStateToQueue(next.state)
  const interval = next.state === FsrsState.Review
    ? Math.max(1, Math.round(next.scheduled_days))
    : Math.max(0, Math.round(next.scheduled_days))
  const stability = clampStability(next.stability)
  const difficulty = clampDifficulty(next.difficulty)
  const due = next.state === FsrsState.Learning || next.state === FsrsState.Relearning
    ? Math.max(0, Math.round(next.learning_steps))
    : toEpochDay(dueAt / DAY_MS)

  return {
    factor: Math.round(difficulty * 500),
    interval,
    stability,
    difficulty,
    reps: Math.max(0, Math.round(next.reps)),
    lapses: Math.max(0, Math.round(next.lapses)),
    type,
    queue,
    due,
    dueAt,
    learningStep: next.state === FsrsState.Learning || next.state === FsrsState.Relearning
      ? Math.max(0, Math.round(next.learning_steps))
      : 0,
    lastReviewedAt: nowMs,
  }
}
