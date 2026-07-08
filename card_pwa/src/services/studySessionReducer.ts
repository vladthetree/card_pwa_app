/**
 * AI_CONTEXT:
 * Role: Reducer for in-session UI state: current card queue, flip state, submit lifecycle, low-rating counters, repair markers, and review events.
 * Used by: StudyView via useReducer.
 * Important: Reducer state is UI/session state only; persistent scheduling mutations happen after successful db/queries review calls.
 * Bewertungen sind endgültig: es gibt bewusst kein Undo — die zuletzt bewertete
 * Karte wird nur als read-only Snapshot (lastRatedCard) fürs Nochmal-Ansehen gehalten.
 */
import { applyRating } from './sessionRecovery'
import type { PersistedStudySession } from './studySessionPersistence'
import type { Card, Rating, SessionReviewEvent } from '../types'

export interface SessionState {
  cards: Card[]
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
  reviewEvents: SessionReviewEvent[]
  startTime: number
}

export type SessionAction =
  | { type: 'INIT'; cards: Card[] }
  | { type: 'RESTORE'; cards: Card[]; snapshot: PersistedStudySession }
  | { type: 'SYNC_CARDS'; cards: Card[] }
  | { type: 'FLIP' }
  | { type: 'RATE_START'; rating: Rating; elapsedMs: number }
  | { type: 'RATE_SUCCESS'; rating: Rating; cardId: string; forcedTomorrow: boolean }
  | { type: 'RATE_ERROR'; message: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESTART' }

export const initialSessionState: SessionState = {
  cards: [],
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
  reviewEvents: [],
  startTime: Date.now(),
}

export function upsertUnique(values: string[], nextValue: string): string[] {
  if (values.includes(nextValue)) return values
  return [...values, nextValue]
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'INIT':
      return {
        ...initialSessionState,
        cards: action.cards,
        isDone: action.cards.length === 0,
        startTime: Date.now(),
      }
    case 'RESTORE':
      return {
        cards: action.cards,
        sessionCount: action.snapshot.sessionCount,
        isFlipped: action.snapshot.isFlipped,
        isDone: action.snapshot.isDone,
        error: null,
        isSubmitting: false,
        lastRating: action.snapshot.lastRating,
        lastRatedCard: null,
        lowRatingCounts: { ...action.snapshot.lowRatingCounts },
        relearnSuccessCounts: { ...action.snapshot.relearnSuccessCounts },
        forcedTomorrowCardIds: [...action.snapshot.forcedTomorrowCardIds],
        againCounts: { ...action.snapshot.againCounts },
        reviewEvents: [...(action.snapshot.reviewEvents ?? [])],
        startTime: action.snapshot.startTime,
      }
    case 'SYNC_CARDS':
      return {
        ...state,
        cards: action.cards,
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

      const recoveryResult = applyRating(
        {
          lowRatingCounts: state.lowRatingCounts,
          relearnSuccessCounts: state.relearnSuccessCounts,
          againCounts: state.againCounts,
        },
        action.cardId,
        action.rating,
        action.forcedTomorrow,
      )

      const {
        lowRatingCounts: nextLowRatingCounts,
        relearnSuccessCounts: nextRelearnSuccessCounts,
        againCounts: nextAgainCounts,
      } = recoveryResult.nextState

      if (recoveryResult.requeue) {
        nextCards = [...remainingCards, currentCard]
      }

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
        isDone: state.cards.length === 0,
        startTime: Date.now(),
      }
    default:
      return state
  }
}
