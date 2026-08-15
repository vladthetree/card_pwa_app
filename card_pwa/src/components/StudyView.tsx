/**
 * AI_CONTEXT:
 * Role: Active flashcard review session UI; coordinates card ordering, persisted session restore, rating submission, read-only peek of the last rated card, coach feedback, and card rendering variants.
 * Used by: App.tsx when a deck, tag batch, daily quest, or shuffle session starts study.
 * Important: Scheduling writes happen through db/queries recordReview; local UI state belongs in studySessionReducer and studySessionPersistence.
 * Bewertungen sind endgültig: Zurückblättern ist read-only (kein erneutes Antworten, kein zweites XP).
 */
import { useState, useEffect, useCallback, useMemo, useReducer, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from '../ui/motion'
import { ArrowLeft, RotateCcw, CheckCircle, AlertCircle, RefreshCw, Type, Sparkles } from 'lucide-react'
import { useDeckCards } from '../hooks/useCardDb'
import { recordReview, forceCardReviewTomorrow, writeActiveSession, clearActiveSession, readActiveSession } from '../db/queries'
import { STRINGS, useSettings, type QuestionTextSize } from '../contexts/SettingsContext'
import { buildStudySessionSelection, enforceDailyDeckCardLimit } from '../utils/studyCardOrdering'
import { buildDragMatchModePlan } from '../utils/studyModeSelector'
import {
  buildPersistedStudySession,
  matchesPersistedStudyCardLimit,
  parsePersistedStudySession,
  DEFAULT_STUDY_CARD_LIMIT,
  createSessionRunId,
  normalizeStudyCardLimit,
  type PersistedStudySession,
  type StudyReturnTarget,
} from '../utils/studySessionPersistence'
import {
  sessionReducer,
  initialSessionState,
} from '../services/studySessionReducer'
import { buildLearningCoachSummary } from '../utils/learningCoach'
import type { Deck, Card, Rating } from '../types'
import { formatDeckName } from '../utils/cardTextParser'
import { getCardVariant } from '../utils/cardVariant'
import { useSessionRewards } from '../hooks/useSessionRewards'
import { useSessionPersistence } from '../hooks/useSessionPersistence'
import { useStudyAnswerState } from '../hooks/study/useStudyAnswerState'
import { useCardAnswerTimer } from '../hooks/study/useCardAnswerTimer'
import { useHandsetLayout } from '../hooks/useHandsetLayout'
import { useWakeLock } from '../hooks/useWakeLock'
import CardFace from './CardFace.tsx'
import EditCardModal from './EditCardModal.tsx'
import RatingBar from './RatingBar.tsx'
import StreakBadge from './StreakBadge.tsx'
import DailyGoalRing from './DailyGoalRing.tsx'
import SessionCoachPanel from './SessionCoachPanel'
import StudyHeaderProgress from './StudyHeaderProgress'
import { CardAnswerTimer } from './CardAnswerTimer'

interface Props {
  /** Deck to study */
  deck: Deck
  /** When provided, these cards are used directly instead of loading by deck ID.
   *  Each card retains its deckId so metrics are recorded against the original deck. */
  preloadedCards?: Card[]
  /** Wenn true, wird eine persistierte, nicht abgelaufene Session dieses Decks
   *  wieder aufgenommen (Queue, Again-Zähler, Fortschritt) statt neu zu mischen.
   *  Explizite Neustarts (frische Quest, Tag-Session, Abruf-Check-Handoff)
   *  lassen das aus und starten sauber. */
  allowResume?: boolean
  /** Persistiertes Rücksprungziel für Sessions aus dem Lernplan. */
  returnTarget?: StudyReturnTarget
  /** Callback when user exits study session */
  onExit: () => void
}


/**
 * Error Alert Component
 */
function ErrorAlert({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { settings } = useSettings()
  const t = STRINGS[settings.language]

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-4 flex items-center justify-between border-4 border-black bg-[#FFD93D] p-4 text-sm font-black text-black"
    >
      <div className="flex items-center gap-2">
        <AlertCircle size={16} />
        <span>{message}</span>
      </div>
      <button
        onClick={onRetry}
        className="ml-3 px-3 py-1 bg-rose-500/30 hover:bg-rose-500/50 rounded-ds text-xs font-medium transition"
      >
        <RefreshCw size={12} className="inline mr-1" /> {t.retry}
      </button>
    </motion.div>
  )
}

/**
 * StudyView: Main study session component
 * Nutzt studyCardOrdering (Sortierung/Gewichtung) und studySessionReducer für State-Management
 */
export default function StudyView({ deck, preloadedCards, allowResume = false, returnTarget, onExit }: Props) {
  const { cards: deckCards, loading: deckLoading, error: deckError, reload } = useDeckCards(preloadedCards ? null : deck.id)
  const cards = preloadedCards ?? deckCards
  const loading = preloadedCards ? false : deckLoading
  const error = preloadedCards ? null : deckError
  const { settings, isAlgorithmMigrating, setQuestionTextSize } = useSettings()
  const t = STRINGS[settings.language]
  const prefersReducedMotion = useReducedMotion()

  const [session, dispatch] = useReducer(sessionReducer, initialSessionState)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const { isHandsetLayout, isHandsetLandscape } = useHandsetLayout()
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  // Konkrete Antwort der aktuellen Karte (MC/Drag-Match/Reihenfolge/Zuordnung),
  // bis sie mit der Bewertung als Review persistiert ist. Ref statt State: die
  // Zuordnung zur cardId passiert im selben Closure wie recordReview, und der
  // Kartenwechsel-Reset verhindert ein Verrutschen auf die nächste Karte.
  const { rewardToast, registerSessionReward } = useSessionRewards({
    language: settings.language,
    nextDayStartsAt: settings.nextDayStartsAt,
    resetKey: deck.id,
  })
  const studyCardLimit = normalizeStudyCardLimit(settings.studyCardLimit ?? DEFAULT_STUDY_CARD_LIMIT)
  const sessionRef = useRef(session)
  const studyCardLimitRef = useRef(studyCardLimit)
  const dragMatchModePlanRef = useRef<Set<string>>(new Set())
  const dragMatchModePlanReadyRef = useRef(false)
  const dragMatchModeSeedRef = useRef(`${Date.now()}:${Math.random()}`)
  // Tracks wall-clock start of the active study session for display only.
  const sessionWallStartRef = useRef<number | null>(null)

  const QUESTION_SIZE_LABEL: Record<QuestionTextSize, string> = {
    default: 'S',
    large: 'M',
    xlarge: 'L',
    xxlarge: 'XL',
    xxxlarge: 'XXL',
  }
  const questionTextSizeLabel = QUESTION_SIZE_LABEL[settings.questionTextSize] ?? 'S'

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    if (session.cards.length > 0 && !session.isDone && sessionWallStartRef.current === null) {
      sessionWallStartRef.current = Date.now()
    }
    if (session.isDone) {
      // keep start time so completion screen can compute elapsed duration
      if (typeof navigator.vibrate === 'function') {
        const noAgain = Object.keys(session.againCounts).length === 0
        navigator.vibrate(noAgain && session.sessionCount >= 3 ? [12, 40, 12, 40, 24] : [16, 60, 16])
      }
    }
  }, [session.cards.length, session.isDone, session.againCounts, session.sessionCount])

  useEffect(() => {
    studyCardLimitRef.current = studyCardLimit
  }, [studyCardLimit])

  useSessionPersistence({ deckId: deck.id, sessionRef, studyCardLimitRef, nextDayStartsAt: settings.nextDayStartsAt })


  useWakeLock()

  useEffect(() => {
    dragMatchModePlanRef.current = new Set()
    dragMatchModePlanReadyRef.current = false
    dragMatchModeSeedRef.current = `${deck.id}:${Date.now()}:${Math.random()}`
  }, [deck.id])

  const buildSessionCards = useCallback((inputCards: Card[], limit: number): Card[] => {
    return buildStudySessionSelection(inputCards, {
      sessionId: deck.id,
      maxCards: normalizeStudyCardLimit(limit),
      nextDayStartsAt: settings.nextDayStartsAt,
      learnAheadMinutes: settings.learnAheadMinutes,
      runSeed: dragMatchModeSeedRef.current,
    })
  }, [settings.nextDayStartsAt, settings.learnAheadMinutes, deck.id])

  const clearPersistedSession = useCallback(() => {
    void clearActiveSession(deck.id)
  }, [deck.id])

  const handleExit = useCallback(() => {
    clearPersistedSession()
    onExit()
  }, [clearPersistedSession, onExit])

  /** Reparatur-Serie: startet vom Completion-Screen aus eine Mini-Session mit
   *  den schwächsten Karten — der Moment direkt nach dem Scheitern ist der
   *  wirksamste für den erneuten Abruf. */
  const handleStartRepair = useCallback((repairCards: Card[]) => {
    if (repairCards.length === 0) return
    sessionWallStartRef.current = null
    dispatch({ type: 'INIT', cards: repairCards, sessionRunId: createSessionRunId() })
  }, [])

  // Einmal pro Session: bestätigt beim ersten Offline-Rating, dass die Bewertung
  // lokal sicher ist und automatisch synct — nimmt die Unsicherheit im Funkloch.
  const [offlineSaveHint, setOfflineSaveHint] = useState(false)
  const offlineHintShownRef = useRef(false)
  const offlineHintTimerRef = useRef<number | null>(null)

  const noteOfflineSave = useCallback(() => {
    if (offlineHintShownRef.current) return
    if (typeof navigator === 'undefined' || navigator.onLine !== false) return
    offlineHintShownRef.current = true
    setOfflineSaveHint(true)
    offlineHintTimerRef.current = window.setTimeout(() => setOfflineSaveHint(false), 5000)
  }, [])

  useEffect(() => {
    return () => {
      if (offlineHintTimerRef.current !== null) {
        window.clearTimeout(offlineHintTimerRef.current)
      }
    }
  }, [])

  const restoreAttemptedRef = useRef(false)

  useEffect(() => {
    if (loading) return
    if (session.isDone) return
    if (session.cards.length > 0) return

    const startFresh = () => {
      clearPersistedSession()
      dispatch({
        type: 'INIT',
        cards: buildSessionCards(cards, studyCardLimit),
        sessionRunId: createSessionRunId(),
      })
    }

    // Wiederaufnahme vor Neu-Mischen: eine unterbrochene Session (Queue,
    // Again-Zähler, Fortschritt) geht sonst trotz Persistenz verloren.
    if (!allowResume || restoreAttemptedRef.current) {
      startFresh()
      return
    }
    restoreAttemptedRef.current = true

    let cancelled = false
    void readActiveSession(deck.id).then(raw => {
      if (cancelled) return
      const snapshot = parsePersistedStudySession(raw, deck.id)
      if (
        snapshot
        && !snapshot.isDone
        && matchesPersistedStudyCardLimit(snapshot.cardLimit, studyCardLimit)
      ) {
        const byId = new Map(cards.map(card => [card.id, card]))
        const restoredCards = enforceDailyDeckCardLimit(
          snapshot.cardIds
            .map(id => byId.get(id))
            .filter((card): card is Card => Boolean(card)),
          studyCardLimit,
        )
        if (restoredCards.length > 0) {
          dispatch({ type: 'RESTORE', cards: restoredCards, snapshot })
          return
        }
      }
      startFresh()
    })
    return () => {
      cancelled = true
    }
  }, [
    cards,
    loading,
    allowResume,
    deck.id,
    clearPersistedSession,
    buildSessionCards,
    studyCardLimit,
    session.isDone,
    session.cards.length,
  ])

  useEffect(() => {
    if (session.isDone) {
      clearPersistedSession()
      return
    }

    if (session.cards.length === 0) return

    const payload: PersistedStudySession = buildPersistedStudySession({
      deckId: deck.id,
      sessionRunId: session.sessionRunId,
      cardIds: session.cards.map(card => card.id),
      cardLimit: studyCardLimit,
      sessionCount: session.sessionCount,
      isFlipped: session.isFlipped,
      isDone: session.isDone,
      lastRating: session.lastRating,
      lowRatingCounts: session.lowRatingCounts,
      relearnSuccessCounts: session.relearnSuccessCounts,
      forcedTomorrowCardIds: session.forcedTomorrowCardIds,
      againCounts: session.againCounts,
      hardPracticeCardIds: session.hardPracticeCardIds,
      hardPracticePassCounts: session.hardPracticePassCounts,
      reviewEvents: session.reviewEvents,
      returnTarget,
      startTime: session.startTime,
      nextDayStartsAt: settings.nextDayStartsAt,
    })

    void writeActiveSession(deck.id, JSON.stringify(payload))
  }, [
    session.cards,
    session.sessionRunId,
    session.sessionCount,
    session.isFlipped,
    session.isDone,
    session.lastRating,
    session.lowRatingCounts,
    session.relearnSuccessCounts,
    session.forcedTomorrowCardIds,
    session.againCounts,
    session.hardPracticeCardIds,
    session.hardPracticePassCounts,
    session.reviewEvents,
    returnTarget,
    session.startTime,
    deck.id,
    studyCardLimit,
    settings.nextDayStartsAt,
    clearPersistedSession,
  ])

  useEffect(() => {
    if (loading || session.cards.length === 0) return

    const latestById = new Map(cards.map(card => [card.id, card]))
    let hasChanges = false
    const synced = session.cards.map(card => {
      const latest = latestById.get(card.id)
      if (!latest) return card

      if (
        latest.front !== card.front
        || latest.back !== card.back
        || latest.tags.join('|') !== card.tags.join('|')
        || latest.extra.acronym !== card.extra.acronym
        || latest.extra.examples !== card.extra.examples
        || latest.extra.port !== card.extra.port
        || latest.extra.protocol !== card.extra.protocol
      ) {
        hasChanges = true
        return latest
      }

      return card
    })

    if (hasChanges) {
      dispatch({ type: 'SYNC_CARDS', cards: synced })
    }
  }, [cards, loading, session.cards])

  const currentCard = useMemo(
    () => session.cards[0] ?? null,
    [session.cards]
  )
  const sessionUniqueReviewedCount = useMemo(
    () => new Set(session.reviewEvents.map(event => event.cardId)).size,
    [session.reviewEvents],
  )
  const sessionUniqueTotalCount = useMemo(
    () => new Set([
      ...session.reviewEvents.map(event => event.cardId),
      ...session.cards.map(card => card.id),
    ]).size,
    [session.cards, session.reviewEvents],
  )
  const {
    answerWasIncorrect,
    answerRevealed,
    peeking,
    setPeeking,
    peekFlipped,
    setPeekFlipped,
    pendingAnswerRef,
    handleAnswerEvaluated: updateAnswerState,
    resetAnswerState,
  } = useStudyAnswerState({
    currentCard,
    sessionCount: session.sessionCount,
    isFlipped: session.isFlipped,
  })
  if (!loading && session.cards.length > 0 && !dragMatchModePlanReadyRef.current) {
    dragMatchModePlanRef.current = buildDragMatchModePlan(session.cards, dragMatchModeSeedRef.current)
    dragMatchModePlanReadyRef.current = true
  }
  const useDragMatchForCurrentCard = currentCard
    ? dragMatchModePlanRef.current.has(currentCard.id) && (session.againCounts[currentCard.id] ?? 0) === 0
    : false

  const sessionPendingCount = session.cards.length
  const maxSelectableRating: Rating = answerWasIncorrect ? 3 : 4
  const answerTimerEnabled = settings.answerTimerEnabled === true
  const answerTimer = useCardAnswerTimer({
    enabled: answerTimerEnabled,
    cardId: currentCard?.id ?? null,
    sessionRunId: session.sessionRunId,
    presentationKey: `${currentCard?.id ?? 'none'}:${session.sessionCount}`,
  })

  const handleAnswerEvaluated = useCallback<NonNullable<React.ComponentProps<typeof CardFace>['onAnswerEvaluated']>>((score, answer) => {
    answerTimer.stop()
    updateAnswerState(score, answer)
  }, [answerTimer.stop, updateAnswerState])

  const handleFlip = useCallback(() => {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(10)
    }
    if (peeking) {
      setPeekFlipped(prev => !prev)
      return
    }
    if (!session.isFlipped) {
      answerTimer.stop()
    }
    dispatch({ type: 'FLIP' })
  }, [answerTimer.stop, peeking, session.isFlipped])

  const cycleQuestionTextSize = useCallback(() => {
    const nextByCurrent: Record<QuestionTextSize, QuestionTextSize> = {
      default: 'large',
      large: 'xlarge',
      xlarge: 'xxlarge',
      xxlarge: 'xxxlarge',
      xxxlarge: 'default',
    }
    setQuestionTextSize(nextByCurrent[settings.questionTextSize])
  }, [settings.questionTextSize, setQuestionTextSize])

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    const touch = event.changedTouches[0]
    if (!touch) return
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }, [])

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    if (!isHandsetLayout || session.isDone || session.isSubmitting) return

    // PBQ cards (ordering/matching) handle their own touch interactions
    const activeFront = peeking ? (session.lastRatedCard?.front ?? '') : (currentCard?.front ?? '')
    const variant = getCardVariant(activeFront)
    if (variant === 'ordering' || variant === 'matching') return

    const start = touchStartRef.current
    touchStartRef.current = null
    const touch = event.changedTouches[0]
    if (!start || !touch) return

    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y

    // Y-tolerance raised to 50px: iPhone swipes typically have 40-60px of
    // vertical drift even for intentional horizontal gestures.
    if (Math.abs(deltaX) >= 40 && Math.abs(deltaY) <= 50) {
      handleFlip()
    }
  }, [isHandsetLayout, session.isDone, session.isSubmitting, session.lastRatedCard, peeking, currentCard, handleFlip])

  const handleRate = useCallback(
    async (rating: Rating) => {
      if (!currentCard || peeking || session.isSubmitting || session.isDone || isAlgorithmMigrating) return

      // P2.2: MC wrong answer always triggers Again (rating 1) — README §Sonderregel.
      const effectiveRating: Rating = answerWasIncorrect ? 1 : rating

      const elapsedMs = Date.now() - session.startTime
      dispatch({ type: 'RATE_START', rating: effectiveRating, elapsedMs })

      try {
        const practiceOnly = settings.hardPracticeEnabled && session.hardPracticeCardIds.includes(currentCard.id) && effectiveRating !== 1
        if (practiceOnly) {
          dispatch({
            type: 'RATE_SUCCESS',
            rating: effectiveRating,
            cardId: currentCard.id,
            forcedTomorrow: false,
            practiceOnly: true,
            hardPracticeEnabled: settings.hardPracticeEnabled,
            hardPracticeGoodStreak: settings.hardPracticeGoodStreak,
            hardPracticeMaxPasses: settings.hardPracticeMaxPasses,
            learnAheadMinutes: settings.learnAheadMinutes,
          })
          resetAnswerState()
          return
        }

        const result = await recordReview(
          currentCard.id,
          effectiveRating,
          elapsedMs,
          settings.algorithm,
          settings.algorithmParams,
          pendingAnswerRef.current ?? undefined,
          session.sessionRunId,
        )

        if (!result.ok) {
          dispatch({ type: 'RATE_ERROR', message: result.error || t.save_rating_failed })
          return
        }

        // P2.3: After the 3rd consecutive Again on this card within the session,
        // force it to tomorrow and remove it from the active queue.
        let forcedTomorrow = false
        let cardState = result.cardState
        if (effectiveRating === 1 && (session.againCounts[currentCard.id] ?? 0) >= 2) {
          const forceResult = await forceCardReviewTomorrow(currentCard.id)
          if (forceResult.ok) {
            forcedTomorrow = true
            // Ersetzt den kurzfristigen Relearning-Zustand aus recordReview —
            // sonst requeued der Reducer die Karte trotz "morgen" noch einmal.
            if (forceResult.cardState) cardState = forceResult.cardState
          }
        }

        dispatch({
          type: 'RATE_SUCCESS',
          rating: effectiveRating,
          cardId: currentCard.id,
          forcedTomorrow,
          cardState,
          hardPracticeEnabled: settings.hardPracticeEnabled,
          hardPracticeGoodStreak: settings.hardPracticeGoodStreak,
          hardPracticeMaxPasses: settings.hardPracticeMaxPasses,
          learnAheadMinutes: settings.learnAheadMinutes,
        })
        registerSessionReward(effectiveRating, elapsedMs)
        noteOfflineSave()
        resetAnswerState()
      } catch (err) {
        const message = err instanceof Error ? err.message : t.unknown_error
        dispatch({ type: 'RATE_ERROR', message })
      }
    },
    [
      currentCard,
      peeking,
      session.isSubmitting,
      session.isDone,
      isAlgorithmMigrating,
      session.startTime,
      session.againCounts,
      session.hardPracticeCardIds,
      session.sessionRunId,
      answerWasIncorrect,
      settings.algorithm,
      settings.algorithmParams,
      settings.hardPracticeEnabled,
      settings.hardPracticeGoodStreak,
      settings.hardPracticeMaxPasses,
      settings.learnAheadMinutes,
      t.save_rating_failed,
      t.unknown_error,
      registerSessionReward,
    ]
  )

  const handleRetry = useCallback(async () => {
    if (!session.lastRating || !currentCard || session.isSubmitting || isAlgorithmMigrating) return

    const { rating, elapsedMs } = session.lastRating
    dispatch({ type: 'CLEAR_ERROR' })
    dispatch({ type: 'RATE_START', rating, elapsedMs })

    try {
      // Retry nach Speicherfehler: die Antwortdetails liegen noch im Ref,
      // weil der Kartenwechsel erst mit RATE_SUCCESS passiert.
      const result = await recordReview(
        currentCard.id,
        rating,
        elapsedMs,
        settings.algorithm,
        settings.algorithmParams,
        pendingAnswerRef.current ?? undefined,
        session.sessionRunId,
      )
      if (result.ok) {
        // P2.3: Apply the force-tomorrow rule on retry just as in handleRate.
        // againCounts was not modified by the preceding RATE_ERROR, so the
        // check here reflects the correct pre-retry state.
        let forcedTomorrow = false
        if (rating === 1 && (session.againCounts[currentCard.id] ?? 0) >= 2) {
          const forceResult = await forceCardReviewTomorrow(currentCard.id)
          if (forceResult.ok) {
            forcedTomorrow = true
          }
        }

        dispatch({
          type: 'RATE_SUCCESS',
          rating,
          cardId: currentCard.id,
          forcedTomorrow,
          cardState: result.cardState,
          hardPracticeEnabled: settings.hardPracticeEnabled,
          hardPracticeGoodStreak: settings.hardPracticeGoodStreak,
          hardPracticeMaxPasses: settings.hardPracticeMaxPasses,
          learnAheadMinutes: settings.learnAheadMinutes,
        })
        registerSessionReward(rating, elapsedMs)
        noteOfflineSave()
        resetAnswerState()
      } else {
        dispatch({ type: 'RATE_ERROR', message: result.error || t.save_failed })
      }
    } catch (err) {
      dispatch({ type: 'RATE_ERROR', message: err instanceof Error ? err.message : t.unknown_error })
    }
  }, [
    session.lastRating,
    session.sessionRunId,
    session.isSubmitting,
    session.againCounts,
    currentCard,
    isAlgorithmMigrating,
    settings.algorithm,
    settings.algorithmParams,
    settings.hardPracticeEnabled,
    settings.hardPracticeGoodStreak,
    settings.hardPracticeMaxPasses,
    settings.learnAheadMinutes,
    t.save_failed,
    t.unknown_error,
    registerSessionReward,
  ])

  // Read-only zurückblättern: zeigt die zuletzt bewertete Karte nur an —
  // bewusst ohne Undo, ohne erneutes Antworten und ohne zweites XP.
  const handlePeekLast = useCallback(() => {
    if (!session.lastRatedCard || session.isSubmitting) return
    setPeekFlipped(true)
    setPeeking(true)
  }, [session.lastRatedCard, session.isSubmitting])

  const handlePeekReturn = useCallback(() => {
    setPeeking(false)
  }, [])

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      // Space toggles card side in both directions
      if ((e.code === 'Space' || e.key === ' ') && !session.isDone) {
        e.preventDefault()
        handleFlip()
        return
      }

      // Rating keys
      if (!peeking && session.isFlipped && !session.error && !session.isSubmitting && !session.isDone) {
        if (e.key === '1') handleRate(1)
        if (e.key === '2') handleRate(2)
        if (e.key === '3') handleRate(3)
        if (e.key === '4' && maxSelectableRating === 4) handleRate(4)
      }

      // Escape to exit
      if (e.key === 'Escape') handleExit()
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [handleFlip, handleRate, maxSelectableRating, peeking, session.isDone, session.isFlipped, session.error, session.isSubmitting, handleExit])

  const handleRestart = useCallback(() => {
    const sortedCards = buildSessionCards(cards, studyCardLimit)
    clearPersistedSession()
    resetAnswerState()
    dragMatchModePlanRef.current = new Set()
    dragMatchModePlanReadyRef.current = false
    dragMatchModeSeedRef.current = `${deck.id}:restart:${Date.now()}:${Math.random()}`
    dispatch({ type: 'INIT', cards: sortedCards, sessionRunId: createSessionRunId() })
  }, [buildSessionCards, cards, studyCardLimit, clearPersistedSession, deck.id])

  const handleEditCard = useCallback(() => {
    if (!currentCard) return
    setEditingCard(currentCard)
  }, [currentCard])

  const handleCardSaved = useCallback(() => {
    reload()
  }, [reload])

  if (error && !loading && cards.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-xl">
          <ErrorAlert message={error} onRetry={reload} />
          <div className="ds-card p-8 text-center text-white/80">
            <p className="mb-4">{t.loading_cards_failed}</p>
            <button onClick={reload} className="inline-flex items-center gap-2 rounded-ds bg-[--brand-primary] px-4 py-2 font-semibold text-[#150b08] transition hover:brightness-110 active:scale-[0.98]">
              <RefreshCw size={16} /> {t.retry}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!loading && session.cards.length === 0 && !session.isDone) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="ds-card p-8 text-center text-white/80">
          <p className="text-lg font-medium text-white mb-2">{t.no_cards_in_deck}</p>
          <p className="text-sm">{t.no_cards_to_study}</p>
          <button
            onClick={handleExit}
            className="mt-5 inline-flex items-center gap-2 rounded-ds bg-[--brand-primary] px-4 py-2 font-semibold text-[#150b08] transition hover:brightness-110 active:scale-[0.98]"
          >
            <ArrowLeft size={16} /> {t.home}
          </button>
        </div>
      </div>
    )
  }

  if (loading || (!session.isDone && cards.length > 0 && session.cards.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="ds-card h-64 w-96 animate-pulse" />
      </div>
    )
  }

  if (isAlgorithmMigrating) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-xl ds-card p-8 text-center text-white/80">
          <div className="mx-auto mb-4 w-6 h-6 border-2 border-white/25 border-t-white/80 rounded-full animate-spin" />
          <p className="text-lg font-medium text-white mb-2">{t.algorithm}</p>
          <p className="text-sm mb-4">{t.please_wait}</p>
          <button
            onClick={handleExit}
            className="inline-flex items-center gap-2 rounded-ds bg-[--brand-primary] px-4 py-2 font-semibold text-[#150b08] transition hover:brightness-110 active:scale-[0.98]"
          >
            <ArrowLeft size={16} /> {t.home}
          </button>
        </div>
      </div>
    )
  }

  // Completion Screen
  if (session.isDone) {
    const elapsedMs = sessionWallStartRef.current !== null ? Date.now() - sessionWallStartRef.current : 0
    const elapsedMin = Math.floor(elapsedMs / 60_000)
    const elapsedSec = Math.floor((elapsedMs % 60_000) / 1000)
    const elapsedLabel = elapsedMin > 0
      ? `${elapsedMin}m ${elapsedSec}s`
      : `${elapsedSec}s`
    const difficultCards = Object.keys(session.againCounts).length
    const forcedCount = session.forcedTomorrowCardIds.length
    // forcedCount zählt mit: Force-Tomorrow löscht die Again-Zähler der Karte
    // (sessionRecovery), sonst gälte eine komplett gescheiterte Session als perfekt.
    const isPerfectSession = sessionUniqueReviewedCount >= 3 && difficultCards === 0 && forcedCount === 0
    const coachSummary = buildLearningCoachSummary({
      reviewEvents: session.reviewEvents,
      cards,
      againCounts: session.againCounts,
      lowRatingCounts: session.lowRatingCounts,
      forcedTomorrowCardIds: session.forcedTomorrowCardIds,
    })

    return (
      <>
        {/* Auswertung: eigener Scroll-Container (App-Shell ist overflow-hidden) —
            auf kleinen Displays (iPhone) muss der Inhalt scrollen können, sonst
            liegen Home/Neustart unerreichbar unter dem Bildschirmrand. */}
        <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
          <div className="mx-auto flex min-h-full w-full max-w-lg flex-col px-4 pt-safe-2 pb-safe-4 md:max-w-2xl">
            <div className="flex shrink-0 items-center py-2">
              <button
                onClick={handleExit}
                aria-label={t.home}
                data-testid="completion-back-button"
                className="ds-icon-button group flex h-11 w-11"
              >
                <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
              </button>
            </div>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className={`my-auto w-full rounded-ds border bg-ds-card p-5 text-center shadow-card sm:p-8 ${
              isPerfectSession ? 'border-emerald-500/40' : 'border-[#18181b]'
            }`}
          >
            {isPerfectSession ? (
              <div className="perfect-session-pop mx-auto mb-3 inline-flex items-center justify-center">
                <Sparkles size={48} className="text-emerald-300" />
              </div>
            ) : (
              <CheckCircle size={44} className="text-green-400 mx-auto mb-3" />
            )}
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">{t.session_completed}</h2>
            {isPerfectSession && (
              <div
                className="perfect-session-shine mx-auto mb-3 inline-flex items-center gap-1.5 rounded-[6px] border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-200"
                role="status"
                aria-live="polite"
                title={t.perfect_session_hint}
              >
                <Sparkles size={12} aria-hidden="true" />
                {t.perfect_session}
              </div>
            )}
            <p className="text-white/55 text-sm mb-5">{t.deck}: {formatDeckName(deck.name)}</p>

            <div className="grid grid-cols-3 gap-2 mb-6">
              <div className="rounded-ds border border-ds-border bg-ds-floor p-3">
                <p className="text-lg font-bold font-mono text-white">{sessionUniqueReviewedCount}</p>
                <p className="text-[10px] uppercase tracking-wide text-white/45 mt-0.5">{t.cards_reviewed.replace('{count}', '').trim() || t.completion_cards_label}</p>
              </div>
              <div className="rounded-ds border border-ds-border bg-ds-floor p-3">
                <p className={`text-lg font-bold font-mono ${difficultCards > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{difficultCards}</p>
                <p className="text-[10px] uppercase tracking-wide text-white/45 mt-0.5">{t.completion_difficult_label}</p>
              </div>
              <div className="rounded-ds border border-ds-border bg-ds-floor p-3">
                <p className="text-lg font-bold font-mono text-white/70">{elapsedMs > 0 ? elapsedLabel : '—'}</p>
                <p className="text-[10px] uppercase tracking-wide text-white/45 mt-0.5">{t.completion_time_label}</p>
              </div>
            </div>

            <SessionCoachPanel
              language={settings.language}
              summary={coachSummary}
              onEditCard={card => setEditingCard(card)}
              onStartRepair={() => handleStartRepair(coachSummary.problemCards.slice(0, 5).map(problem => problem.card))}
            />

            {forcedCount > 0 && (
              <p className="text-xs text-white/40 my-4">
                {forcedCount} {t.completion_forced_tomorrow}
              </p>
            )}

            <div className="mt-4 flex gap-3">
              <button
                onClick={handleExit}
                className="flex-1 rounded-ds bg-[--brand-primary] py-3 font-semibold text-[#150b08] transition-all hover:brightness-110 active:scale-[0.98]"
              >
                {t.home}
              </button>
              <button
                onClick={handleRestart}
                className="flex-1 rounded-ds border border-ds-border bg-ds-floor py-3 font-medium text-white transition-all hover:border-ds-border-hover"
              >
                <RotateCcw size={14} className="inline mr-1.5" />
                {t.restart}
              </button>
            </div>
          </motion.div>
          </div>
        </div>
        <AnimatePresence>
          {editingCard && (
            <EditCardModal
              card={editingCard}
              onClose={() => setEditingCard(null)}
              onSaved={handleCardSaved}
            />
          )}
        </AnimatePresence>
      </>
    )
  }

  // Focus mode: hide session header content but keep its space reserved
  // (visibility instead of display) so the card never jumps. Back button stays.
  const focusHidden = settings.focusMode ? 'invisible' : ''

  // Handset: Antwortseite reserviert unten die Bewertungsleiste; sonst hält
  // ein fester Bodenabstand (~1/6 Displayhöhe) die eckige Karte von der
  // iPhone-Display-Rundung fern.
  const showHandsetRatingArea = isHandsetLayout && !peeking && session.isFlipped && !!currentCard

  // Study Screen
  return (
    <div className={`${isHandsetLayout ? 'fixed inset-0' : 'h-[100dvh]'} flex flex-col overflow-hidden`}>
      {/* Top navigation */}
      <div
        className={`relative z-20 w-full shrink-0 bg-ds-bg/94 px-4 pb-0 backdrop-blur-sm md:px-8 ${isHandsetLayout ? 'pt-safe-2' : 'pt-5'}`}
      >
        {/* Mobile Header - Single horizontal row */}
        {isHandsetLayout && (
          <div className="flex items-center justify-between gap-1.5 pb-2">
            {/* Left: Back button */}
            <button
              onClick={handleExit}
              aria-label={t.home}
              data-testid="study-back-button"
              className="ds-icon-button group flex-shrink-0 flex h-11 w-11"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>

            {/* Center: primary session state */}
            <div
              className={`flex min-w-0 flex-1 flex-col items-center justify-center ${focusHidden}`}
              title={`${t.stats_due}: ${sessionPendingCount}`}
              aria-label={`${t.stats_due}: ${sessionPendingCount}`}
            >
              <div className="font-mono text-lg font-black leading-none text-white tabular-nums">
                {sessionPendingCount}
              </div>
              <div className="mt-0.5 max-w-full truncate text-[10px] uppercase tracking-[0.12em] text-white/45">
                {t.stats_due}
              </div>
            </div>

            {/* Right: Action buttons */}
            <div className={`flex items-center gap-1 flex-shrink-0 ${focusHidden}`}>
              <StreakBadge compact />
              {answerTimerEnabled && currentCard && !peeking && (
                <CardAnswerTimer
                  compact
                  elapsedSeconds={answerTimer.elapsedSeconds}
                  isPaused={answerTimer.isPaused}
                  isStopped={answerTimer.isStopped}
                  language={settings.language}
                  onTogglePaused={answerTimer.togglePaused}
                />
              )}
              <button
                type="button"
                onClick={cycleQuestionTextSize}
                className="ds-icon-button inline-flex h-11 w-11 flex-shrink-0"
                title={`${t.question_text_size}: ${questionTextSizeLabel}`}
                aria-label={`${t.question_text_size}: ${questionTextSizeLabel}`}
              >
                <Type size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Desktop Header - Original layout */}
        {!isHandsetLayout && (
          <>
            <div className="flex items-center justify-between gap-4 pb-3">
              {/* Left: Back button + Deck name */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={handleExit}
                  aria-label={t.home}
                  data-testid="study-back-button"
                  className="ds-icon-button group flex h-10 w-10"
                >
                  <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                </button>
                <div className={`flex items-center gap-3 ${focusHidden}`}>
                  <div className="text-white/60 text-sm">
                    {formatDeckName(deck.name)}
                  </div>
                  <StreakBadge />
                  <DailyGoalRing size={32} strokeWidth={3} />
                </div>
              </div>

              <div className="flex-1" aria-hidden="true" />

              {/* Right: only the card-text control remains in the header. */}
              <button
                type="button"
                onClick={cycleQuestionTextSize}
                className={`ds-icon-button inline-flex h-10 w-10 flex-shrink-0 ${focusHidden}`}
                title={`${t.question_text_size}: ${questionTextSizeLabel}`}
                aria-label={`${t.question_text_size}: ${questionTextSizeLabel}`}
              >
                <Type size={16} />
              </button>
            </div>
            <div className={focusHidden}>
              <StudyHeaderProgress
                current={sessionUniqueReviewedCount}
                total={sessionUniqueTotalCount}
                reward={rewardToast}
                reducedMotion={prefersReducedMotion}
              />
            </div>
          </>
        )}

        {/* Progress bar for mobile */}
        {isHandsetLayout && (
          <div className={focusHidden}>
            <StudyHeaderProgress
              current={sessionUniqueReviewedCount}
              total={sessionUniqueTotalCount}
              reward={rewardToast}
              reducedMotion={prefersReducedMotion}
            />
          </div>
        )}
      </div>

      {/* Main card area */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-ds-bg/90">
        {!isHandsetLayout && answerTimerEnabled && currentCard && !peeking && (
          <div className="pointer-events-none absolute right-8 top-6 z-30 flex w-48 justify-end">
            <div className="pointer-events-auto">
              <CardAnswerTimer
                elapsedSeconds={answerTimer.elapsedSeconds}
                isPaused={answerTimer.isPaused}
                isStopped={answerTimer.isStopped}
                language={settings.language}
                onTogglePaused={answerTimer.togglePaused}
              />
            </div>
          </div>
        )}
        <div
          className={`flex-1 min-h-0 ${isHandsetLayout ? 'overflow-hidden px-2 pt-2 pb-2' : 'flex flex-col overflow-y-auto px-3 sm:px-4 py-4 sm:py-6'}`}
        >
          {/* Error alert */}
          <AnimatePresence>
            {session.error && <ErrorAlert message={session.error} onRetry={handleRetry} />}
          </AnimatePresence>

          {/* Card display. Bewusst OHNE exit-gated AnimatePresence (wait-Modus):
              dessen Exit→Enter-Übergabe konnte beim Kartenwechsel hängen bleiben
              und die Folgekarte nie mounten (schwarzer Kartenbereich). Der Key-
              Wechsel remountet die Karte direkt, nur mit Enter-Animation.
              Guard: __tests__/ui/no-animatepresence-wait.test.ts */}
          {peeking && session.lastRatedCard ? (
              // Read-only-Rückblick auf die zuletzt bewertete Karte: reine
              // Ansicht — keine Antwort-Eingaben, keine Bewertung, kein XP.
              <motion.div
                key={`peek:${session.lastRatedCard.id}:${session.sessionCount}`}
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 22, scale: 0.96 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: prefersReducedMotion ? 0.12 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                className={`w-full ${isHandsetLayout ? 'flex h-full min-h-0 flex-col' : 'mx-auto my-auto max-w-5xl'}`}
                style={isHandsetLayout ? { maxHeight: '100%' } : undefined}
              >
                <div className="mb-2 flex shrink-0 items-center justify-between gap-3 rounded-ds border border-amber-500/30 bg-amber-500/10 px-3 py-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber-200/90">
                    {t.peek_view_only}
                  </span>
                  <button
                    type="button"
                    onClick={handlePeekReturn}
                    className="rounded-ds bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-white/90 active:scale-[0.98]"
                  >
                    {t.peek_continue}
                  </button>
                </div>
                <div className={`flex flex-col lg:flex-row items-start gap-6 w-full ${isHandsetLayout ? 'h-full min-h-0 flex-1' : ''}`}>
                  <div className={`w-full min-w-0 flex-1 ${isHandsetLayout ? 'h-full min-h-0' : ''}`}>
                    <div
                      className="h-full card-no-select"
                      onTouchStart={handleTouchStart}
                      onTouchEnd={handleTouchEnd}
                    >
                      <CardFace
                        card={session.lastRatedCard}
                        flipped={peekFlipped}
                        onFlip={handleFlip}
                        onEdit={() => setEditingCard(session.lastRatedCard)}
                        compact={isHandsetLayout}
                        useDragMatchMode={dragMatchModePlanRef.current.has(session.lastRatedCard.id)}
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : currentCard && (
              // Include the attempt count so an Again-requeued single card
              // remounts with fresh answer/PBQ state instead of staying submitted.
              <motion.div
                key={`${currentCard.id}:${session.sessionCount}`}
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 22, scale: 0.96 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: prefersReducedMotion ? 0.12 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                className={`w-full ${isHandsetLayout ? 'flex h-full min-h-0 flex-col' : 'mx-auto my-auto max-w-5xl'}`}
                style={isHandsetLayout ? { maxHeight: '100%' } : undefined}
              >
                {settings.hardPracticeEnabled && session.hardPracticeCardIds.includes(currentCard.id) && (
                  <div className="mb-2 self-center rounded-ds border border-amber-400/35 bg-amber-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-amber-200" role="status">
                    {settings.language === 'de' ? 'Hard-Verstärkung · Session-Übung' : 'Hard reinforcement · session practice'}
                  </div>
                )}
                <div className={`flex flex-col lg:flex-row items-start gap-6 w-full ${isHandsetLayout ? 'h-full min-h-0 flex-1' : ''}`}>
                  <div className={`w-full min-w-0 flex-1 ${isHandsetLayout ? 'h-full min-h-0' : ''}`}>
                    <div
                      className="h-full card-no-select"
                      onTouchStart={handleTouchStart}
                      onTouchEnd={handleTouchEnd}
                    >
                      <CardFace
                        card={currentCard}
                        flipped={session.isFlipped}
                        onFlip={handleFlip}
                        onEdit={handleEditCard}
                        onAnswerEvaluated={handleAnswerEvaluated}
                        compact={isHandsetLayout}
                        useDragMatchMode={useDragMatchForCurrentCard}
                        answerRevealed={answerRevealed}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          {/* Desktop/Tablet rating bar remains inline */}
          {!isHandsetLayout && (
            <AnimatePresence initial={false}>
              {!peeking && session.isFlipped && currentCard && (
                <motion.div
                  initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  transition={{ duration: prefersReducedMotion ? 0.12 : 0.15, ease: 'easeOut' }}
                  className="mx-auto w-full max-w-5xl mt-5 sm:mt-6"
                >
                  <RatingBar onRate={handleRate} maxRating={maxSelectableRating} disabled={session.isSubmitting || !!session.error} layout="row" />
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {!isHandsetLayout && session.lastRatedCard && !session.isSubmitting && !peeking && (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={handlePeekLast}
                className="rounded-ds border border-ds-border bg-ds-floor px-3 py-1.5 text-xs text-white/70 transition hover:border-ds-border-hover hover:text-white"
              >
                {t.view_last_card}
              </button>
            </div>
          )}

          <AnimatePresence>
            {offlineSaveHint && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                role="status"
                aria-live="polite"
                className="pointer-events-none fixed bottom-safe-4 left-1/2 z-[60] -translate-x-1/2 whitespace-nowrap rounded-ds-xl border border-emerald-500/30 bg-[#0a0a0a]/95 px-3.5 py-2 font-mono text-[11px] text-emerald-200 shadow-2xl"
              >
                {settings.language === 'de'
                  ? 'Offline gespeichert — synct automatisch.'
                  : 'Saved offline — will sync automatically.'}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submitting indicator */}
          {session.isSubmitting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-white/65 text-sm flex items-center justify-center gap-2"
            >
              <div className="w-4 h-4 border-2 border-white/30 border-t-white/70 rounded-full animate-spin" />
              {t.saving}
            </motion.div>
          )}

        </div>

        {/* Handset rating area: permanently reserved lower area in answer state */}
        {showHandsetRatingArea && (
          <AnimatePresence initial={false}>
            <motion.div
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
              transition={{ duration: prefersReducedMotion ? 0.12 : 0.15, ease: 'easeOut' }}
              className="w-full border-t border-ds-border bg-ds-bg px-3 pt-2"
              style={{
                height: isHandsetLandscape
                  ? 'clamp(7.25rem, 21dvh, 10rem)'
                  : 'clamp(9.25rem, 21dvh, 12.5rem)',
                paddingBottom: '0.5rem',
              }}
            >
              <div className="h-full">
                <RatingBar
                  onRate={handleRate}
                  maxRating={maxSelectableRating}
                  disabled={session.isSubmitting || !!session.error}
                  layout="grid"
                  className="h-full"
                />
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Handset-Bodenabstand (~1/6 Displayhöhe): hält das eckige Kartenende
            oberhalb der iPhone-Display-Rundung; beherbergt den Peek-Button. */}
        {isHandsetLayout && !showHandsetRatingArea && (
          <div
            className="flex shrink-0 items-start justify-center pt-3"
            style={{ height: '16.7dvh' }}
          >
            {session.lastRatedCard && !session.isSubmitting && !peeking && (
              <button
                type="button"
                onClick={handlePeekLast}
                className="rounded-ds border border-ds-border bg-ds-floor px-3 py-1.5 text-xs text-white/70 transition hover:border-ds-border-hover hover:text-white"
              >
                {t.view_last_card}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Edit Card Modal */}
      <AnimatePresence>
        {editingCard && (
          <EditCardModal
            card={editingCard}
            onClose={() => setEditingCard(null)}
            onSaved={handleCardSaved}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
