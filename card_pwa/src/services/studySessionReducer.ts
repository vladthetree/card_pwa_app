/**
 * AI_CONTEXT:
 * Role: Reducer for in-session UI state: current card queue, flip state, submit lifecycle, low-rating counters, repair markers, and review events.
 * Used by: StudyView via useReducer.
 * Important: Reducer state is UI/session state only; persistent scheduling mutations happen after successful db/queries review calls.
 * Bewertungen sind endgültig: es gibt bewusst kein Undo — die zuletzt bewertete
 * Karte wird nur als read-only Snapshot (lastRatedCard) fürs Nochmal-Ansehen gehalten.
 */
import { applyRating } from './sessionRecovery'
import { createSessionRunId, type PersistedStudySession } from '../utils/studySessionPersistence'
import type { Card, CardSchedulingState, Rating, SessionReviewEvent } from '../types'
import { isStudyableCard } from '../utils/sm2'
import { clamp } from '../utils/numeric'

export interface SessionState {
  cards: Card[]
  sessionRunId: string
  sessionCount: number
  isFlipped: boolean
  isDone: boolean
  error: string | null
  isSubmitting: boolean
  lastRating: { rating: Rating; elapsedMs: number } | null
  /** Zuletzt bewertete Karte — nur zum read-only Zurückblättern, nie zum Neu-Bewerten. */
  lastRatedCard: Card | null
  lowRatingCounts: Record<string, number>
  relearnSuccessCounts: Record<string, number>
  forcedTomorrowCardIds: string[]
  againCounts: Record<string, number>
  hardPracticeCardIds: string[]
  hardPracticePassCounts: Record<string, number>
  reviewEvents: SessionReviewEvent[]
  startTime: number
}

export type SessionAction =
  | { type: 'INIT'; cards: Card[]; sessionRunId?: string }
  | { type: 'RESTORE'; cards: Card[]; snapshot: PersistedStudySession }
  | { type: 'SYNC_CARDS'; cards: Card[] }
  | { type: 'FLIP' }
  | { type: 'RATE_START'; rating: Rating; elapsedMs: number }
  | {
      type: 'RATE_SUCCESS'
      rating: Rating
      cardId: string
      forcedTomorrow: boolean
      practiceOnly?: boolean
      hardPracticeEnabled?: boolean
      hardPracticeGoodStreak?: number
      hardPracticeMaxPasses?: number
      learnAheadMinutes?: number
      cardState?: CardSchedulingState
    }
  | { type: 'RATE_ERROR'; message: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESTART'; sessionRunId?: string }

export const initialSessionState: SessionState = {
  cards: [],
  sessionRunId: '',
  sessionCount: 0,
  isFlipped: false,
  isDone: false,
  error: null,
  isSubmitting: false,
  lastRating: null,
  lastRatedCard: null,
  lowRatingCounts: {},
  relearnSuccessCounts: {},
  forcedTomorrowCardIds: [],
  againCounts: {},
  hardPracticeCardIds: [],
  hardPracticePassCounts: {},
  reviewEvents: [],
  startTime: Date.now(),
}

export function upsertUnique(values: string[], nextValue: string): string[] {
  if (values.includes(nextValue)) return values
  return [...values, nextValue]
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'INIT': {
      const cards = action.cards.filter(isStudyableCard)
      return {
        ...initialSessionState,
        cards,
        sessionRunId: action.sessionRunId?.trim() || createSessionRunId(),
        isDone: cards.length === 0,
        startTime: Date.now(),
      }
    }
    case 'RESTORE': {
      const cards = action.cards.filter(isStudyableCard)
      return {
        cards,
        sessionRunId: action.snapshot.sessionRunId,
        sessionCount: action.snapshot.sessionCount,
        isFlipped: action.snapshot.isFlipped,
        isDone: action.snapshot.isDone || cards.length === 0,
        error: null,
        isSubmitting: false,
        lastRating: action.snapshot.lastRating,
        lastRatedCard: null,
        lowRatingCounts: { ...action.snapshot.lowRatingCounts },
        relearnSuccessCounts: { ...action.snapshot.relearnSuccessCounts },
        forcedTomorrowCardIds: [...action.snapshot.forcedTomorrowCardIds],
        againCounts: { ...action.snapshot.againCounts },
        hardPracticeCardIds: [...(action.snapshot.hardPracticeCardIds ?? [])],
        hardPracticePassCounts: { ...(action.snapshot.hardPracticePassCounts ?? {}) },
        reviewEvents: [...(action.snapshot.reviewEvents ?? [])],
        startTime: action.snapshot.startTime,
      }
    }
    case 'SYNC_CARDS':
      return {
        ...state,
        cards: action.cards.filter(isStudyableCard),
      }
    case 'FLIP':
      if (state.isDone || !state.cards[0]) return state
      return { ...state, isFlipped: !state.isFlipped }
    case 'RATE_START':
      return {
        ...state,
        isSubmitting: true,
        error: null,
        lastRating: { rating: action.rating, elapsedMs: action.elapsedMs },
      }
    case 'RATE_SUCCESS': {
      const currentCard = state.cards[0]
      if (!currentCard || currentCard.id !== action.cardId) {
        return {
          ...state,
          isSubmitting: false,
          error: null,
        }
      }

      const remainingCards = state.cards.slice(1)
      let nextCards = remainingCards
      const scheduledCard = action.cardState
        ? mergeSchedulingState(currentCard, action.cardState)
        : currentCard

      const recoveryResult = applyRating(
        {
          lowRatingCounts: state.lowRatingCounts,
          relearnSuccessCounts: state.relearnSuccessCounts,
          againCounts: state.againCounts,
          hardPracticeCardIds: state.hardPracticeCardIds,
          hardPracticePassCounts: state.hardPracticePassCounts,
        },
        action.cardId,
        action.rating,
        {
          forcedTomorrow: action.forcedTomorrow,
          practiceOnly: Boolean(action.practiceOnly),
          previousType: currentCard.type,
          nextType: scheduledCard.type,
          hardPracticeEnabled: action.hardPracticeEnabled,
          hardPracticeGoodStreak: action.hardPracticeGoodStreak,
          hardPracticeMaxPasses: action.hardPracticeMaxPasses,
        },
      )

      const {
        lowRatingCounts: nextLowRatingCounts,
        relearnSuccessCounts: nextRelearnSuccessCounts,
        againCounts: nextAgainCounts,
        hardPracticeCardIds: nextHardPracticeCardIds,
        hardPracticePassCounts: nextHardPracticePassCounts,
      } = recoveryResult.nextState

      const schedulerNeedsAnotherStep = scheduledCard.type === 'learning' || scheduledCard.type === 'relearning'
      const scheduledDueAt = Number.isFinite(scheduledCard.dueAt)
        ? Number(scheduledCard.dueAt)
        : scheduledCard.due * 86_400_000
      const learnAheadMs = clamp(action.learnAheadMinutes ?? 20, 0, 60) * 60_000
      const schedulerStepIsAvailable = schedulerNeedsAnotherStep && scheduledDueAt <= Date.now() + learnAheadMs
      const practiceNeedsAnotherPass = nextHardPracticeCardIds.includes(action.cardId)
      if (practiceNeedsAnotherPass || schedulerStepIsAvailable) {
        nextCards = [...remainingCards, scheduledCard]
      }
      nextCards = promoteDueLearningCards(nextCards)

      const forcedTomorrowCardIds = action.forcedTomorrow
        ? upsertUnique(state.forcedTomorrowCardIds, action.cardId)
        : state.forcedTomorrowCardIds
      const reviewEvents: SessionReviewEvent[] = [
        ...state.reviewEvents,
        {
          cardId: action.cardId,
          rating: action.rating,
          elapsedMs: state.lastRating?.elapsedMs ?? 0,
        },
      ]

      const sessionCount = state.sessionCount + 1
      return {
        ...state,
        cards: nextCards,
        isSubmitting: false,
        isDone: nextCards.length === 0,
        isFlipped: false,
        sessionCount,
        lastRatedCard: currentCard,
        lowRatingCounts: nextLowRatingCounts,
        relearnSuccessCounts: nextRelearnSuccessCounts,
        forcedTomorrowCardIds,
        againCounts: nextAgainCounts,
        hardPracticeCardIds: nextHardPracticeCardIds,
        hardPracticePassCounts: nextHardPracticePassCounts,
        reviewEvents,
        startTime: Date.now(),
      }
    }
    case 'RATE_ERROR':
      return {
        ...state,
        isSubmitting: false,
        error: action.message,
      }
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      }
    case 'RESTART':
      return {
        ...initialSessionState,
        cards: [...state.cards],
        sessionRunId: action.sessionRunId?.trim() || createSessionRunId(),
        isDone: state.cards.length === 0,
        startTime: Date.now(),
      }
    default:
      return state
  }
}

function mergeSchedulingState(card: Card, state: CardSchedulingState): Card {
  const algorithm = state.algorithm ?? card.algorithm ?? 'sm2'
  const type = (['new', 'learning', 'review', 'relearning'] as const)[state.type] ?? card.type
  const difficulty = state.difficulty

  return {
    ...card,
    type,
    queue: state.queue,
    due: state.due,
    dueAt: state.dueAt,
    learningStep: state.learningStep,
    lastReviewedAt: state.lastReviewedAt,
    interval: state.interval,
    reps: state.reps,
    lapses: state.lapses,
    stability: state.stability,
    difficulty,
    algorithm,
    sm2Ease: algorithm === 'sm2' ? Number((state.factor / 1000).toFixed(2)) : undefined,
    fsrsDifficulty: algorithm === 'fsrs' && Number.isFinite(difficulty)
      ? Number((difficulty as number).toFixed(2))
      : undefined,
  }
}

/** Sobald ein kurzer Lernschritt wirklich fällig ist, kommt er wie bei Anki
 * vor den weniger zeitkritischen Rest der Session. Zukünftige Schritte bleiben
 * hinten und werden nur vorgezogen, wenn sonst keine Karte mehr da ist. */
function promoteDueLearningCards(cards: Card[], nowMs = Date.now()): Card[] {
  const dueLearning: Card[] = []
  const remaining: Card[] = []

  for (const card of cards) {
    const isLearning = card.type === 'learning' || card.type === 'relearning'
    const dueAt = Number.isFinite(card.dueAt) ? Number(card.dueAt) : card.due * 86_400_000
    if (isLearning && dueAt <= nowMs) dueLearning.push(card)
    else remaining.push(card)
  }

  if (dueLearning.length === 0) return cards
  dueLearning.sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0))
  return [...dueLearning, ...remaining]
}
