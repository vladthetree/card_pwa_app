/**
 * AI_CONTEXT:
 * Role: Active flashcard review session UI; coordinates card ordering, persisted session restore, rating submission, undo, coach feedback, and card rendering variants.
 * Used by: App.tsx when a deck, tag batch, daily quest, or shuffle session starts study.
 * Important: Scheduling writes happen through db/queries recordReview/undoReview; local UI state belongs in studySessionReducer and studySessionPersistence.
 */
import { useState, useEffect, useCallback, useMemo, useReducer, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from '../ui/motion'
import { ArrowLeft, RotateCcw, CheckCircle, AlertCircle, RefreshCw, Type, Info, Sparkles } from 'lucide-react'
import { useDeckCards } from '../hooks/useCardDb'
import { recordReview, undoReview, forceCardReviewTomorrow, writeActiveSession, clearActiveSession, readActiveSession } from '../db/queries'
import { STRINGS, useSettings, type QuestionTextSize } from '../contexts/SettingsContext'
import { sortStudyCards } from '../services/studyCardOrdering'
import { buildDragMatchModePlan } from '../services/studyModeSelector'
import {
  buildPersistedStudySession,
  parsePersistedStudySession,
  DEFAULT_STUDY_CARD_LIMIT,
  normalizeStudyCardLimit,
  type PersistedStudySession,
} from '../services/studySessionPersistence'
import {
  sessionReducer,
  initialSessionState,
} from '../services/studySessionReducer'
import { buildLearningCoachSummary } from '../services/learningCoach'
import type { Deck, Card, Rating } from '../types'
import { formatDeckName } from '../utils/cardTextParser'
import { getCardVariant } from '../utils/cardVariant'
import { getReviewXp } from '../utils/gamification'
import { useSessionPersistence } from '../hooks/useSessionPersistence'
import { useHandsetLayout } from '../hooks/useHandsetLayout'
import { useWakeLock } from '../hooks/useWakeLock'
import CardFace from './CardFace.tsx'
import EditCardModal from './EditCardModal.tsx'
import RatingBar from './RatingBar.tsx'
import StreakBadge from './StreakBadge.tsx'
import DailyGoalRing from './DailyGoalRing.tsx'
import SessionCoachPanel from './SessionCoachPanel'
import StudyHeaderProgress, { type RewardHint } from './StudyHeaderProgress'

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
      className="border border-rose-500/30 bg-black p-4 rounded-ds-xl text-rose-300 text-sm mb-4 flex items-center justify-between"
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
export default function StudyView({ deck, preloadedCards, allowResume = false, onExit }: Props) {
  const { cards: deckCards, loading: deckLoading, error: deckError, reload } = useDeckCards(preloadedCards ? null : deck.id)
  const cards = preloadedCards ?? deckCards
  const loading = preloadedCards ? false : deckLoading
  const error = preloadedCards ? null : deckError
  const { settings, isAlgorithmMigrating, setQuestionTextSize } = useSettings()
  const t = STRINGS[settings.language]
  const prefersReducedMotion = useReducedMotion()

  const [session, dispatch] = useReducer(sessionReducer, initialSessionState)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [answerWasIncorrect, setAnswerWasIncorrect] = useState(false)
  const [showHeaderLegend, setShowHeaderLegend] = useState(false)
  const [rewardToast, setRewardToast] = useState<RewardHint | null>(null)
  const { isHandsetLayout, isHandsetLandscape } = useHandsetLayout()
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const sessionMomentumRef = useRef(0)
  const rewardToastTimerRef = useRef<number | null>(null)
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

  useEffect(() => {
    if (!showHeaderLegend) return

    const timer = window.setTimeout(() => {
      setShowHeaderLegend(false)
    }, 3000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [showHeaderLegend])

  useSessionPersistence({ deckId: deck.id, sessionRef, studyCardLimitRef, nextDayStartsAt: settings.nextDayStartsAt })


  useWakeLock()

  useEffect(() => {
    return () => {
      if (rewardToastTimerRef.current !== null) {
        window.clearTimeout(rewardToastTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    sessionMomentumRef.current = 0
    setRewardToast(null)
    dragMatchModePlanRef.current = new Set()
    dragMatchModePlanReadyRef.current = false
    dragMatchModeSeedRef.current = `${deck.id}:${Date.now()}:${Math.random()}`
  }, [deck.id])

  const buildSessionCards = useCallback((inputCards: Card[], limit: number): Card[] => {
    return sortStudyCards(inputCards, {
      maxCards: normalizeStudyCardLimit(limit),
      nextDayStartsAt: settings.nextDayStartsAt,
      runSeed: dragMatchModeSeedRef.current,
    })
  }, [settings.nextDayStartsAt])

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
    dispatch({ type: 'INIT', cards: repairCards })
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
      dispatch({ type: 'INIT', cards: buildSessionCards(cards, studyCardLimit) })
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
      if (snapshot && !snapshot.isDone) {
        const byId = new Map(cards.map(card => [card.id, card]))
        const restoredCards = snapshot.cardIds
          .map(id => byId.get(id))
          .filter((card): card is Card => Boolean(card))
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
      reviewEvents: session.reviewEvents,
      startTime: session.startTime,
      nextDayStartsAt: settings.nextDayStartsAt,
    })

    void writeActiveSession(deck.id, JSON.stringify(payload))
  }, [
    session.cards,
    session.sessionCount,
    session.isFlipped,
    session.isDone,
    session.lastRating,
    session.lowRatingCounts,
    session.relearnSuccessCounts,
    session.forcedTomorrowCardIds,
    session.againCounts,
    session.reviewEvents,
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
  if (!loading && session.cards.length > 0 && !dragMatchModePlanReadyRef.current) {
    dragMatchModePlanRef.current = buildDragMatchModePlan(session.cards, dragMatchModeSeedRef.current)
    dragMatchModePlanReadyRef.current = true
  }
  const useDragMatchForCurrentCard = currentCard
    ? dragMatchModePlanRef.current.has(currentCard.id) && (session.againCounts[currentCard.id] ?? 0) === 0
    : false

  const sessionPendingCount = session.cards.length
  const sessionRequeueCount = useMemo(
    () => session.cards.reduce((count, card) => count + ((session.lowRatingCounts[card.id] ?? 0) > 0 ? 1 : 0), 0),
    [session.cards, session.lowRatingCounts]
  )
  const globalReviewDueCount = useMemo(() => {
    const nowMs = Date.now()
    return cards.filter(card => {
      if (card.type === 'learning' || card.type === 'relearning') {
        const dueAt = Number.isFinite(card.dueAt) ? Math.round(card.dueAt as number) : Math.max(0, Math.floor(card.due)) * 86_400_000
        return dueAt <= nowMs
      }
      if (card.type !== 'review') return false
      const dueAt = Number.isFinite(card.dueAt) ? Math.round(card.dueAt as number) : Math.max(0, Math.floor(card.due)) * 86_400_000
      return dueAt <= nowMs
    }).length
  }, [cards])
  const globalNewCount = useMemo(() => cards.filter(card => card.type === 'new').length, [cards])
  const headerStats = useMemo(() => ([
    { key: 'due', label: t.stats_due, value: sessionPendingCount, cls: 'text-amber-200 border-amber-500/35' },
    { key: 'relearning', label: t.type_relearning, value: sessionRequeueCount, cls: 'text-sky-200 border-sky-500/35' },
    { key: 'nowDue', label: t.stats_now_due, value: globalReviewDueCount, cls: 'text-rose-200 border-rose-500/35' },
    { key: 'new', label: t.stats_new, value: globalNewCount, cls: 'text-emerald-200 border-emerald-500/35' },
  ]), [
    t.stats_due,
    t.type_relearning,
    t.stats_now_due,
    t.stats_new,
    sessionPendingCount,
    sessionRequeueCount,
    globalReviewDueCount,
    globalNewCount,
  ])
  const maxSelectableRating: Rating = answerWasIncorrect ? 3 : 4

  const registerSessionReward = useCallback((rating: Rating, elapsedMs: number) => {
    const isSuccess = rating >= 3
    const nextCombo = isSuccess ? sessionMomentumRef.current + 1 : 0
    sessionMomentumRef.current = nextCombo

    const baseXp = getReviewXp(rating, elapsedMs)
    const comboBonus = isSuccess ? Math.min(12, Math.floor(nextCombo / 3) * 2) : 0
    const xp = baseXp + comboBonus
    const comboLabel = nextCombo >= 2
      ? `${nextCombo}x ${settings.language === 'de' ? 'Combo' : 'combo'}`
      : (isSuccess ? (settings.language === 'de' ? 'Sicher erinnert' : 'Recall locked') : (settings.language === 'de' ? 'Trainingspunkt' : 'Practice point'))

    if (rewardToastTimerRef.current !== null) {
      window.clearTimeout(rewardToastTimerRef.current)
    }

    setRewardToast({
      id: `${Date.now()}-${rating}-${nextCombo}`,
      xp,
      combo: nextCombo,
      label: comboLabel,
      tone: isSuccess ? 'success' : 'practice',
    })

    rewardToastTimerRef.current = window.setTimeout(() => {
      setRewardToast(null)
      rewardToastTimerRef.current = null
    }, 1600)
  }, [settings.language])

  const handleFlip = useCallback(() => {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(10)
    }
    dispatch({ type: 'FLIP' })
  }, [])

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
    const variant = getCardVariant(currentCard?.front ?? '')
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
  }, [isHandsetLayout, session.isDone, session.isSubmitting, currentCard, handleFlip])

  const handleAnswerEvaluated = useCallback((score: number) => {
    setAnswerWasIncorrect(score < 1.0)
  }, [])

  const handleRate = useCallback(
    async (rating: Rating) => {
      if (!currentCard || session.isSubmitting || session.isDone || isAlgorithmMigrating) return

      // P2.2: MC wrong answer always triggers Again (rating 1) — README §Sonderregel.
      const effectiveRating: Rating = answerWasIncorrect ? 1 : rating

      const elapsedMs = Date.now() - session.startTime
      dispatch({ type: 'RATE_START', rating: effectiveRating, elapsedMs })

      try {
        const result = await recordReview(currentCard.id, effectiveRating, elapsedMs, settings.algorithm, settings.algorithmParams)

        if (!result.ok) {
          dispatch({ type: 'RATE_ERROR', message: result.error || t.save_rating_failed })
          return
        }

        if (!result.undoToken) {
          dispatch({ type: 'RATE_ERROR', message: t.save_rating_failed })
          return
        }

        // P2.3: After the 3rd consecutive Again on this card within the session,
        // force it to tomorrow and remove it from the active queue.
        let forcedTomorrow = false
        if (effectiveRating === 1 && (session.againCounts[currentCard.id] ?? 0) >= 2) {
          const forceResult = await forceCardReviewTomorrow(currentCard.id)
          if (forceResult.ok) {
            forcedTomorrow = true
          }
        }

        dispatch({ type: 'RATE_SUCCESS', rating: effectiveRating, cardId: currentCard.id, undoToken: result.undoToken, forcedTomorrow })
        registerSessionReward(effectiveRating, elapsedMs)
        noteOfflineSave()
        setAnswerWasIncorrect(false)
      } catch (err) {
        const message = err instanceof Error ? err.message : t.unknown_error
        dispatch({ type: 'RATE_ERROR', message })
      }
    },
    [
      currentCard,
      session.isSubmitting,
      session.isDone,
      isAlgorithmMigrating,
      session.startTime,
      session.againCounts,
      answerWasIncorrect,
      settings.algorithm,
      settings.algorithmParams,
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
      const result = await recordReview(currentCard.id, rating, elapsedMs, settings.algorithm, settings.algorithmParams)
      if (result.ok) {
        if (!result.undoToken) {
          dispatch({ type: 'RATE_ERROR', message: t.save_failed })
          return
        }

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

        dispatch({ type: 'RATE_SUCCESS', rating, cardId: currentCard.id, undoToken: result.undoToken, forcedTomorrow })
        registerSessionReward(rating, elapsedMs)
        noteOfflineSave()
        setAnswerWasIncorrect(false)
      } else {
        dispatch({ type: 'RATE_ERROR', message: result.error || t.save_failed })
      }
    } catch (err) {
      dispatch({ type: 'RATE_ERROR', message: err instanceof Error ? err.message : t.unknown_error })
    }
  }, [
    session.lastRating,
    session.isSubmitting,
    session.againCounts,
    currentCard,
    isAlgorithmMigrating,
    settings.algorithm,
    settings.algorithmParams,
    t.save_failed,
    t.unknown_error,
    registerSessionReward,
  ])

  const handleUndoLastRating = useCallback(async () => {
    if (!session.lastUndoToken || session.isSubmitting || isAlgorithmMigrating) return

    dispatch({ type: 'UNDO_START' })
    const result = await undoReview(session.lastUndoToken)
    if (!result.ok) {
      dispatch({ type: 'RATE_ERROR', message: result.error || t.save_failed })
      return
    }

    dispatch({ type: 'UNDO_SUCCESS' })
    sessionMomentumRef.current = 0
    setRewardToast(null)
    setAnswerWasIncorrect(false)
  }, [session.lastUndoToken, session.isSubmitting, isAlgorithmMigrating, t.save_failed])

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
      if (session.isFlipped && !session.error && !session.isSubmitting && !session.isDone) {
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
  }, [handleFlip, handleRate, maxSelectableRating, session.isDone, session.isFlipped, session.error, session.isSubmitting, handleExit])

  const handleRestart = useCallback(() => {
    const sortedCards = buildSessionCards(cards, studyCardLimit)
    clearPersistedSession()
    setAnswerWasIncorrect(false)
    sessionMomentumRef.current = 0
    setRewardToast(null)
    dragMatchModePlanRef.current = new Set()
    dragMatchModePlanReadyRef.current = false
    dragMatchModeSeedRef.current = `${deck.id}:restart:${Date.now()}:${Math.random()}`
    dispatch({ type: 'INIT', cards: sortedCards })
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
    const isPerfectSession = session.sessionCount >= 3 && difficultCards === 0 && forcedCount === 0
    const coachSummary = buildLearningCoachSummary({
      reviewEvents: session.reviewEvents,
      cards,
      againCounts: session.againCounts,
      lowRatingCounts: session.lowRatingCounts,
      forcedTomorrowCardIds: session.forcedTomorrowCardIds,
    })

    return (
      <>
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className={`w-full max-w-lg md:max-w-2xl rounded-ds border bg-ds-card p-8 text-center shadow-card sm:p-10 ${
              isPerfectSession ? 'border-emerald-500/40' : 'border-[#18181b]'
            }`}
          >
            {isPerfectSession ? (
              <div className="perfect-session-pop mx-auto mb-4 inline-flex items-center justify-center">
                <Sparkles size={56} className="text-emerald-300" />
              </div>
            ) : (
              <CheckCircle size={52} className="text-green-400 mx-auto mb-4" />
            )}
            <h2 className="text-2xl font-bold text-white mb-2">{t.session_completed}</h2>
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
                <p className="text-lg font-bold font-mono text-white">{session.sessionCount}</p>
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

            {session.lastUndoToken && !session.isSubmitting && (
              <button
                type="button"
                onClick={handleUndoLastRating}
                className="mt-4 mb-3 w-full rounded-ds border border-ds-border bg-ds-floor py-2 text-sm text-white/80 transition hover:border-ds-border-hover hover:text-white"
              >
                {t.undo_last_rating}
              </button>
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
              <button
                type="button"
                onClick={() => setShowHeaderLegend(prev => !prev)}
                className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-ds border transition-colors ${
                  showHeaderLegend
                    ? 'border-ds-border-hover bg-ds-panel text-zinc-100'
                    : 'border-ds-border bg-ds-card text-zinc-500 hover:border-ds-border-hover hover:text-zinc-50'
                }`}
                title={t.legend_label}
                aria-label={t.legend_label}
              >
                <Info size={14} />
              </button>
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

            {/* Legend popup */}
            {showHeaderLegend && (
              <div className="absolute top-16 left-4 right-4 z-30 w-auto max-w-xs ds-menu p-3 text-xs">
                <div className="space-y-1.5">
                  {headerStats.map(stat => (
                    <div key={`legend-${stat.key}`} className="flex items-center gap-2">
                      <span className={`inline-block h-2 w-2 rounded-full ${stat.cls}`} />
                      <span>{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

              {/* Center: Stats */}
              <div className={`flex items-center gap-2 flex-1 justify-center ${focusHidden}`}>
                {headerStats.map(stat => (
                  <div
                    key={stat.key}
                    title={`${stat.label}: ${stat.value}`}
                    aria-label={`${stat.label}: ${stat.value}`}
                  className={`flex items-center justify-center rounded-[6px] border bg-ds-card px-3 py-2 font-mono text-sm font-bold ${stat.cls}`}
                  >
                    {stat.value}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setShowHeaderLegend(prev => !prev)}
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-ds border transition-colors ${
                    showHeaderLegend
                      ? 'border-ds-border-hover bg-ds-panel text-zinc-100'
                      : 'border-ds-border bg-ds-card text-zinc-500 hover:border-ds-border-hover hover:text-zinc-50'
                  }`}
                  title={settings.language === 'de' ? 'Legende' : 'Legend'}
                  aria-label={settings.language === 'de' ? 'Legende' : 'Legend'}
                >
                  <Info size={16} />
                </button>
                {showHeaderLegend && (
                  <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 ds-menu p-3 text-xs">
                    <div className="space-y-1.5">
                      {headerStats.map(stat => (
                        <div key={`legend-${stat.key}`} className="flex items-center gap-2">
                          <span className={`inline-block h-2 w-2 rounded-full ${stat.cls}`} />
                          <span>{stat.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Settings */}
              <div className={`flex items-center gap-2 flex-shrink-0 ${focusHidden}`}>
                <span className="text-[11px] px-2.5 py-1 rounded-[6px] border border-[#18181b] text-white/40 font-mono uppercase tracking-wide">
                  {settings.algorithm === 'sm2' ? 'SM2' : 'FSRS'}
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-[6px] border border-[#18181b] text-white/40 font-mono uppercase tracking-wide">
                  {t.language_code}
                </span>
                <button
                  type="button"
                  onClick={cycleQuestionTextSize}
                  className="ds-icon-button inline-flex h-10 w-10"
                  title={`${t.question_text_size}: ${questionTextSizeLabel}`}
                  aria-label={`${t.question_text_size}: ${questionTextSizeLabel}`}
                >
                  <Type size={16} />
                </button>
              </div>
            </div>
            <div className={focusHidden}>
              <StudyHeaderProgress
                current={session.sessionCount}
                total={session.sessionCount + session.cards.length}
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
              current={session.sessionCount}
              total={session.sessionCount + session.cards.length}
              reward={rewardToast}
              reducedMotion={prefersReducedMotion}
            />
          </div>
        )}
      </div>

      {/* Main card area */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-ds-bg/90">
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
          {currentCard && (
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
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          {/* Desktop/Tablet rating bar remains inline */}
          {!isHandsetLayout && (
            <AnimatePresence initial={false}>
              {session.isFlipped && currentCard && (
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

          {session.lastUndoToken && !session.isSubmitting && (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={handleUndoLastRating}
                className="rounded-ds border border-ds-border bg-ds-floor px-3 py-1.5 text-xs text-white/70 transition hover:border-ds-border-hover hover:text-white"
              >
                {t.undo_last_rating}
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
        {isHandsetLayout && session.isFlipped && currentCard && (
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
