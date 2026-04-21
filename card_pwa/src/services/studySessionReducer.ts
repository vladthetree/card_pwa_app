import { applyRating } from './sessionRecovery'
import type { PersistedStudySession } from './studySessionPersistence'
import type { Card, Rating, ReviewUndoToken } from '../types'

export interface SessionState {
  cards: Card[]
  sessionCount: number
  isFlipped: boolean
  isDone: boolean
  error: string | null
  isSubmitting: boolean
  lastRating: { rating: Rating; elapsedMs: number } | null
  lastUndoToken: ReviewUndoToken | null
  lowRatingCounts: Record<string, number>
  relearnSuccessCounts: Record<string, number>
  forcedTomorrowCardIds: string[]
  againCounts: Record<string, number>
  beforeLastRating: {
    cards: Card[]
    lowRatingCounts: Record<string, number>
    relearnSuccessCounts: Record<string, number>
    forcedTomorrowCardIds: string[]
    againCounts: Record<string, number>
  } | null
  startTime: number
}

export type SessionAction =
  | { type: 'INIT'; cards: Card[] }
  | { type: 'RESTORE'; cards: Card[]; snapshot: PersistedStudySession }
  | { type: 'SYNC_CARDS'; cards: Card[] }
  | { type: 'FLIP' }
  | { type: 'RATE_START'; rating: Rating; elapsedMs: number }
  | { type: 'RATE_SUCCESS'; rating: Rating; cardId: string; undoToken: ReviewUndoToken; forcedTomorrow: boolean }
  | { type: 'RATE_ERROR'; message: string }
  | { type: 'UNDO_START' }
  | { type: 'UNDO_SUCCESS' }
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
  lastUndoToken: null,
  lowRatingCounts: {},
  relearnSuccessCounts: {},
  forcedTomorrowCardIds: [],
  againCounts: {},
  beforeLastRating: null,
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
        lastUndoToken: null,
        lowRatingCounts: { ...action.snapshot.lowRatingCounts },
        relearnSuccessCounts: { ...action.snapshot.relearnSuccessCounts },
        forcedTomorrowCardIds: [...action.snapshot.forcedTomorrowCardIds],
        againCounts: { ...action.snapshot.againCounts },
        beforeLastRating: null,
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
        beforeLastRating: {
          cards: [...state.cards],
          lowRatingCounts: { ...state.lowRatingCounts },
          relearnSuccessCounts: { ...state.relearnSuccessCounts },
          forcedTomorrowCardIds: [...state.forcedTomorrowCardIds],
          againCounts: { ...state.againCounts },
        },
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

      const sessionCount = state.sessionCount + 1
      return {
        ...state,
        cards: nextCards,
        isSubmitting: false,
        isDone: nextCards.length === 0,
        isFlipped: false,
        sessionCount,
        lastUndoToken: action.undoToken,
        lowRatingCounts: nextLowRatingCounts,
        relearnSuccessCounts: nextRelearnSuccessCounts,
        forcedTomorrowCardIds,
        againCounts: nextAgainCounts,
        beforeLastRating: null,
        startTime: Date.now(),
      }
    }
    case 'RATE_ERROR':
      return {
        ...state,
        isSubmitting: false,
        error: action.message,
      }
    case 'UNDO_START':
      return {
        ...state,
        isSubmitting: true,
        error: null,
      }
    case 'UNDO_SUCCESS':
      if (!state.beforeLastRating) {
        return {
          ...state,
          isSubmitting: false,
          isDone: state.cards.length === 0,
          isFlipped: false,
          lastRating: null,
          lastUndoToken: null,
          startTime: Date.now(),
        }
      }
      return {
        ...state,
        cards: [...state.beforeLastRating.cards],
        isSubmitting: false,
        isDone: state.beforeLastRating.cards.length === 0,
        sessionCount: Math.max(0, state.sessionCount - 1),
        // Nach Undo zurück auf die Vorderseite, damit keine alte Bewertung impliziert wird.
        isFlipped: false,
        lastRating: null,
        lastUndoToken: null,
        lowRatingCounts: { ...state.beforeLastRating.lowRatingCounts },
        relearnSuccessCounts: { ...state.beforeLastRating.relearnSuccessCounts },
        forcedTomorrowCardIds: [...state.beforeLastRating.forcedTomorrowCardIds],
        againCounts: { ...state.beforeLastRating.againCounts },
        beforeLastRating: null,
        startTime: Date.now(),
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
