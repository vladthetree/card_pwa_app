/**
 * AI_CONTEXT: React hook for use Session Persistence; encapsulates browser, persistence, sync, layout, or learning state for UI components.
 */
import { useEffect, type RefObject } from 'react'
import { buildPersistedStudySession } from '../utils/studySessionPersistence'
import { writeActiveSession } from '../db/queries'
import { supportsServiceWorker } from '../env'
import type { SessionState } from '../services/studySessionReducer'

export function useSessionPersistence({
  deckId,
  sessionRef,
  studyCardLimitRef,
  sessionTargetCardCountRef,
}: {
  deckId: string
  sessionRef: RefObject<SessionState>
  studyCardLimitRef: RefObject<number>
  sessionTargetCardCountRef: RefObject<number>
}): void {
  useEffect(() => {
    const persistSessionSnapshot = () => {
      const current = sessionRef.current
      if (!current || current.isDone || current.cards.length === 0) return

      const payload = buildPersistedStudySession({
        deckId,
        sessionRunId: current.sessionRunId,
        cardIds: current.cards.map(card => card.id),
        cardLimit: studyCardLimitRef.current ?? 0,
        sessionTargetCardCount: sessionTargetCardCountRef.current ?? current.cards.length,
        sessionCount: current.sessionCount,
        isFlipped: current.isFlipped,
        isDone: current.isDone,
        lastRating: current.lastRating,
        lowRatingCounts: current.lowRatingCounts,
        relearnSuccessCounts: current.relearnSuccessCounts,
        forcedTomorrowCardIds: current.forcedTomorrowCardIds,
        againCounts: current.againCounts,
        hardPracticeCardIds: current.hardPracticeCardIds,
        hardPracticePassCounts: current.hardPracticePassCounts,
        reviewEvents: current.reviewEvents,
        startedAt: current.startedAt,
        startTime: current.startTime,
      })

      const serialized = JSON.stringify(payload)
      void writeActiveSession(deckId, serialized)

      if (supportsServiceWorker()) {
        const message = {
          type: 'SESSION_SNAPSHOT',
          deckId,
          payload: serialized,
          updatedAt: Date.now(),
        }
        navigator.serviceWorker?.controller?.postMessage(message)
        void navigator.serviceWorker?.ready
          ?.then(registration => {
            registration.active?.postMessage(message)
          })
          .catch(() => {
            // best effort
          })
      }
    }

    const onPageHide = () => {
      persistSessionSnapshot()
    }

    const onBeforeUnload = () => {
      persistSessionSnapshot()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        persistSessionSnapshot()
      }
    }

    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [deckId, sessionRef, sessionTargetCardCountRef, studyCardLimitRef])
}
