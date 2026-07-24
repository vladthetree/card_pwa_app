/**
 * AI_CONTEXT: Reusable React component for shuffle Study View; contributes to the card-learning UI and shared app interactions.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from '../ui/motion'
import { ArrowLeft, RefreshCw, Shuffle } from 'lucide-react'
import {
  clearShuffleSession,
  forceCardReviewTomorrow,
  recordReview,
  writeShuffleSession,
} from '../db/queries'
import { STRINGS, useSettings } from '../contexts/SettingsContext'
import { useDecks, useShuffleCards } from '../hooks/useCardDb'
import { useHandsetLayout } from '../hooks/useHandsetLayout'
import { useWakeLock } from '../hooks/useWakeLock'
import {
  buildPersistedStudySession,
  buildShuffleSessionId,
  DEFAULT_STUDY_CARD_LIMIT,
  normalizeStudyCardLimit,
} from '../services/studySessionPersistence'
import { initialSessionState, sessionReducer } from '../services/studySessionReducer'
import { buildDragMatchModePlan } from '../services/studyModeSelector'
import { buildLearningCoachSummary } from '../services/learningCoach'
import type { Card, Rating, ReviewAnswerDetails, ShuffleCollection } from '../types'
import { formatDeckName } from '../utils/cardTextParser'
import { flattenDeckTree } from '../utils/securityDeckHierarchy'
import { useSessionRewards } from '../hooks/useSessionRewards'
import CardFace from './CardFace'
import EditCardModal from './EditCardModal'
import RatingBar from './RatingBar'
import SessionCoachPanel from './SessionCoachPanel'
import StudyHeaderProgress from './StudyHeaderProgress'

interface Props {
  collection: ShuffleCollection
  onExit: () => void
}

function buildDeckCounts(cards: Array<Card & { deckId?: string }>): Record<string, number> {
  return cards.reduce<Record<string, number>>((acc, card) => {
    if (!card.deckId) return acc
    acc[card.deckId] = (acc[card.deckId] ?? 0) + 1
    return acc
  }, {})
}

function ErrorAlert({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mx-auto mb-4 flex w-full max-w-3xl items-center justify-between border-4 border-black bg-[#FFD93D] p-4 text-sm font-black text-black"
    >
      <div className="flex items-center gap-2">
        <RefreshCw size={14} />
        <span>{message}</span>
      </div>
      <button
        onClick={onRetry}
        className="ml-3 rounded-ds bg-rose-500/30 px-3 py-1 text-xs font-medium transition hover:bg-rose-500/50"
      >
        Retry
      </button>
    </motion.div>
  )
}

export default function ShuffleStudyView({ collection, onExit }: Props) {
  const { settings, isAlgorithmMigrating } = useSettings()
  const t = STRINGS[settings.language]
  const prefersReducedMotion = useReducedMotion()
  const { isHandsetLayout, isHandsetLandscape } = useHandsetLayout()
  const studyCardLimit = normalizeStudyCardLimit(settings.studyCardLimit ?? DEFAULT_STUDY_CARD_LIMIT)
  const dragMatchModeSeedRef = useRef(`${Date.now()}:${Math.random()}`)
  const { cards, loading, error, reload } = useShuffleCards(collection.id, {
    maxCards: studyCardLimit,
    nextDayStartsAt: settings.nextDayStartsAt,
    runSeed: dragMatchModeSeedRef.current,
    learnAheadMinutes: settings.learnAheadMinutes,
  })
  const { decks } = useDecks()

  const [session, dispatch] = useReducer(sessionReducer, initialSessionState)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [answerWasIncorrect, setAnswerWasIncorrect] = useState(false)
  const [sessionDeckCounts, setSessionDeckCounts] = useState<Record<string, number>>({})
  // Antwortseite der aktuellen Karte war schon sichtbar → Antwort-Eingaben
  // bleiben gesperrt (verhindert „Lösung ansehen, zurückflippen, richtig klicken“).
  const [answerRevealed, setAnswerRevealed] = useState(false)
  // Read-only-Blick zurück auf die zuletzt bewertete Karte (ersetzt das Undo).
  const [peeking, setPeeking] = useState(false)
  const [peekFlipped, setPeekFlipped] = useState(true)
  const { rewardToast, registerSessionReward } = useSessionRewards({
    language: settings.language,
    nextDayStartsAt: settings.nextDayStartsAt,
    resetKey: collection.id,
  })
  const dragMatchModePlanRef = useRef<Set<string>>(new Set())
  const dragMatchModePlanReadyRef = useRef(false)
  // Konkrete Antwort der aktuellen Karte bis zur Persistierung puffern
  // (gleiches Prinzip wie StudyView; Reset beim Kartenwechsel).
  const pendingAnswerRef = useRef<ReviewAnswerDetails | null>(null)

  useWakeLock()

  useEffect(() => {
    dragMatchModePlanRef.current = new Set()
    dragMatchModePlanReadyRef.current = false
    dragMatchModeSeedRef.current = `${collection.id}:${Date.now()}:${Math.random()}`
  }, [collection.id])

  const sessionId = useMemo(() => buildShuffleSessionId(collection.id), [collection.id])
  const latestShuffleCardById = useMemo(() => new Map(cards.map(card => [card.id, card])), [cards])
  const deckNameById = useMemo(
    () => new Map(flattenDeckTree(decks).map(deck => [deck.id, formatDeckName(deck.name)])),
    [decks],
  )
  const currentCard = useMemo(() => session.cards[0] ?? null, [session.cards])

  // Pro Karte zurücksetzen (sessionCount zählt Requeues mit); Peek schließen.
  // Auch die gepufferte Antwort verfällt: sie darf nie einer anderen Karte
  // zugeordnet werden.
  useEffect(() => {
    setAnswerRevealed(false)
    setPeeking(false)
    setPeekFlipped(true)
    pendingAnswerRef.current = null
  }, [currentCard?.id, session.sessionCount])

  useEffect(() => {
    if (session.isFlipped) setAnswerRevealed(true)
  }, [session.isFlipped])
  if (!loading && session.cards.length > 0 && !dragMatchModePlanReadyRef.current) {
    dragMatchModePlanRef.current = buildDragMatchModePlan(session.cards, dragMatchModeSeedRef.current)
    dragMatchModePlanReadyRef.current = true
  }
  const useDragMatchForCurrentCard = currentCard
    ? dragMatchModePlanRef.current.has(currentCard.id) && (session.againCounts[currentCard.id] ?? 0) === 0
    : false
  const sessionDeckSummary = useMemo(() => (
    Object.entries(sessionDeckCounts)
      .map(([deckId, count]) => ({
        deckId,
        count,
        name: deckNameById.get(deckId) ?? deckId,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  ), [deckNameById, sessionDeckCounts])
  const maxSelectableRating: Rating = answerWasIncorrect ? 3 : 4

  const clearPersistedSession = useCallback(() => {
    void clearShuffleSession(collection.id)
  }, [collection.id])

  const handleExit = useCallback(() => {
    clearPersistedSession()
    onExit()
  }, [clearPersistedSession, onExit])

  useEffect(() => {
    if (loading) return
    if (session.isDone) return
    if (session.cards.length > 0) return

    clearPersistedSession()
    setSessionDeckCounts(buildDeckCounts(cards))
    dispatch({ type: 'INIT', cards })
  }, [cards, clearPersistedSession, loading, session.cards.length, session.isDone])

  useEffect(() => {
    if (session.isDone) {
      clearPersistedSession()
      return
    }

    if (session.cards.length === 0) return

    const cardOrigins = Object.fromEntries(cards.map(card => [card.id, card.deckId]))
    const payload = buildPersistedStudySession({
      deckId: sessionId,
      kind: 'shuffle',
      collectionId: collection.id,
      deckIds: collection.deckIds,
      cardOrigins,
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
      startTime: session.startTime,
      nextDayStartsAt: settings.nextDayStartsAt,
    })

    void writeShuffleSession(collection.id, JSON.stringify(payload))
  }, [
    cards,
    clearPersistedSession,
    collection.deckIds,
    collection.id,
    session.cards,
    session.againCounts,
    session.hardPracticeCardIds,
    session.hardPracticePassCounts,
    session.forcedTomorrowCardIds,
    session.isDone,
    session.isFlipped,
    session.lastRating,
    session.lowRatingCounts,
    session.relearnSuccessCounts,
    session.reviewEvents,
    session.sessionCount,
    session.startTime,
    sessionId,
    studyCardLimit,
    settings.nextDayStartsAt,
  ])

  useEffect(() => {
    if (loading || session.cards.length === 0) return

    let hasChanges = false
    const syncedCards = session.cards.map(card => {
      const latest = latestShuffleCardById.get(card.id)
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
      dispatch({ type: 'SYNC_CARDS', cards: syncedCards })
    }
  }, [latestShuffleCardById, loading, session.cards])

  const handleFlip = useCallback(() => {
    if (typeof navigator.vibrate === 'function') navigator.vibrate(10)
    if (peeking) {
      setPeekFlipped(prev => !prev)
      return
    }
    dispatch({ type: 'FLIP' })
  }, [peeking])

  const handleAnswerEvaluated = useCallback((score: number, answer?: Pick<ReviewAnswerDetails, 'selected' | 'correct'>) => {
    setAnswerWasIncorrect(score < 1.0)
    pendingAnswerRef.current = answer ? { ...answer, wasCorrect: score >= 1.0 } : null
  }, [])

  const handleRate = useCallback(async (rating: Rating) => {
    if (!currentCard || peeking || session.isSubmitting || session.isDone || isAlgorithmMigrating) return

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
        setAnswerWasIncorrect(false)
        pendingAnswerRef.current = null
        return
      }

      const result = await recordReview(
        currentCard.id,
        effectiveRating,
        elapsedMs,
        settings.algorithm,
        settings.algorithmParams,
        pendingAnswerRef.current ?? undefined,
      )

      if (!result.ok) {
        dispatch({ type: 'RATE_ERROR', message: result.error || t.save_rating_failed })
        return
      }

      let forcedTomorrow = false
      if (effectiveRating === 1 && (session.againCounts[currentCard.id] ?? 0) >= 2) {
        const forceResult = await forceCardReviewTomorrow(currentCard.id)
        if (forceResult.ok) forcedTomorrow = true
      }

      dispatch({
        type: 'RATE_SUCCESS',
        rating: effectiveRating,
        cardId: currentCard.id,
        forcedTomorrow,
        cardState: result.cardState,
        hardPracticeEnabled: settings.hardPracticeEnabled,
        hardPracticeGoodStreak: settings.hardPracticeGoodStreak,
        hardPracticeMaxPasses: settings.hardPracticeMaxPasses,
        learnAheadMinutes: settings.learnAheadMinutes,
      })
      registerSessionReward(effectiveRating, elapsedMs)
      setAnswerWasIncorrect(false)
      pendingAnswerRef.current = null
    } catch (err) {
      dispatch({ type: 'RATE_ERROR', message: err instanceof Error ? err.message : t.unknown_error })
    }
  }, [
    answerWasIncorrect,
    currentCard,
    peeking,
    isAlgorithmMigrating,
    session.againCounts,
    session.hardPracticeCardIds,
    session.isDone,
    session.isSubmitting,
    session.startTime,
    settings.algorithm,
    settings.algorithmParams,
    settings.hardPracticeEnabled,
    settings.hardPracticeGoodStreak,
    settings.hardPracticeMaxPasses,
    settings.learnAheadMinutes,
    t.save_rating_failed,
    t.unknown_error,
    registerSessionReward,
  ])

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
      )
      if (!result.ok) {
        dispatch({ type: 'RATE_ERROR', message: result.error || t.save_failed })
        return
      }

      let forcedTomorrow = false
      if (rating === 1 && (session.againCounts[currentCard.id] ?? 0) >= 2) {
        const forceResult = await forceCardReviewTomorrow(currentCard.id)
        if (forceResult.ok) forcedTomorrow = true
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
      setAnswerWasIncorrect(false)
      pendingAnswerRef.current = null
    } catch (err) {
      dispatch({ type: 'RATE_ERROR', message: err instanceof Error ? err.message : t.unknown_error })
    }
  }, [
    currentCard,
    isAlgorithmMigrating,
    session.againCounts,
    session.isSubmitting,
    session.lastRating,
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

  const handleRestart = useCallback(() => {
    clearPersistedSession()
    setAnswerWasIncorrect(false)
    setSessionDeckCounts(buildDeckCounts(cards))
    dispatch({ type: 'INIT', cards })
  }, [cards, clearPersistedSession])

  const handleEditCard = useCallback(() => {
    if (!currentCard) return
    setEditingCard(currentCard)
  }, [currentCard])

  const handleCardSaved = useCallback(() => {
    reload()
  }, [reload])

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if ((e.code === 'Space' || e.key === ' ') && !session.isDone) {
        e.preventDefault()
        handleFlip()
        return
      }
      if (!peeking && session.isFlipped && !session.error && !session.isSubmitting && !session.isDone) {
        if (e.key === '1') handleRate(1)
        if (e.key === '2') handleRate(2)
        if (e.key === '3') handleRate(3)
        if (e.key === '4' && maxSelectableRating === 4) handleRate(4)
      }
      if (e.key === 'Escape') handleExit()
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [handleFlip, handleRate, maxSelectableRating, handleExit, peeking, session.error, session.isDone, session.isFlipped, session.isSubmitting])

  if (error && !loading && cards.length === 0) {
    return (
      <div className="min-h-screen px-4 py-10">
        <ErrorAlert message={error} onRetry={reload} />
      </div>
    )
  }

  if (!loading && session.isDone) {
    const coachSummary = buildLearningCoachSummary({
      reviewEvents: session.reviewEvents,
      cards,
      againCounts: session.againCounts,
      lowRatingCounts: session.lowRatingCounts,
      forcedTomorrowCardIds: session.forcedTomorrowCardIds,
    })

    return (
      <>
        {/* Eigener Scroll-Container (App-Shell ist overflow-hidden): auf dem
            iPhone muss die Auswertung scrollen, sonst sind die Buttons unten
            unerreichbar abgeschnitten. */}
        <div className="h-full min-h-0 overflow-y-auto overscroll-contain bg-[#050505] px-4 pt-safe-4 pb-safe-4 text-white">
          <div className="mx-auto max-w-2xl ds-card p-5 text-center sm:p-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-ds-xl border border-emerald-300/25 bg-emerald-400/10 text-emerald-200">
              <Shuffle size={22} />
            </div>
            <h1 className="text-2xl font-semibold">{collection.name}</h1>
            <p className="mt-3 text-sm text-white/55">
              {settings.language === 'de' ? 'Diese Shuffle-Session ist abgeschlossen.' : 'This shuffle session is complete.'}
            </p>
            <SessionCoachPanel
              language={settings.language}
              summary={coachSummary}
              onEditCard={card => setEditingCard(card)}
            />
            {sessionDeckSummary.length > 0 && (
              <div className="mt-6 rounded-ds-2xl border border-[#18181b] bg-[#0a0a0a] p-4 text-left shadow-card">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                  {settings.language === 'de' ? 'Verteilung nach Ursprungsdeck' : 'Source deck distribution'}
                </div>
                <div className="mt-3 grid gap-2">
                  {sessionDeckSummary.map(entry => (
                    <div
                      key={entry.deckId}
                      className="flex items-center justify-between rounded-ds-xl border border-[#18181b] bg-[#0c0c0c] px-3 py-2 text-sm"
                    >
                      <span className="truncate pr-3 text-white/80">{entry.name}</span>
                      <span className="shrink-0 rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-100/85">
                        {entry.count} {settings.language === 'de' ? 'Karten' : 'cards'}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-white/40">
                  {settings.language === 'de'
                    ? 'Bewertungen wurden weiterhin im jeweiligen Originaldeck verbucht.'
                    : 'Reviews were still recorded against each original deck.'}
                </p>
              </div>
            )}
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={handleRestart}
                className="rounded-ds-xl border border-[#18181b] bg-[#0a0a0a] px-4 py-2 text-sm text-white/80 transition hover:border-[#3f3f46] hover:text-white"
              >
                {settings.language === 'de' ? 'Neu mischen' : 'Reshuffle'}
              </button>
              <button
                type="button"
                onClick={handleExit}
                className="rounded-ds-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                {settings.language === 'de' ? 'Zur Startseite' : 'Back home'}
              </button>
            </div>
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

  return (
    <div className={`${isHandsetLayout ? 'fixed inset-0' : 'min-h-screen'} flex flex-col overflow-hidden bg-[#050505] text-white`}>
      <div
        className={`sticky top-0 z-20 border-b border-[#18181b] bg-[#050505]/95 backdrop-blur ${isHandsetLayout ? 'pt-safe-2 pb-2 px-3' : ''}`}
      >
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <button
            type="button"
            onClick={handleExit}
            className="ds-icon-button inline-flex h-11 w-11"
            aria-label={settings.language === 'de' ? 'Zurück' : 'Back'}
          >
            <ArrowLeft size={18} />
          </button>
          <div className={`min-w-0 flex-1 ${focusHidden}`}>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-amber-200/75">
              <Shuffle size={14} />
              <span>{settings.language === 'de' ? 'Shuffle-Modus' : 'Shuffle mode'}</span>
            </div>
            <div className="truncate text-lg font-semibold">{collection.name}</div>
          </div>
          <div className={`rounded-ds-xl border border-[#18181b] bg-[#0c0c0c] px-3 py-2 text-xs font-mono text-white/60 ${focusHidden}`}>
            {collection.deckIds.length} {settings.language === 'de' ? 'Decks' : 'decks'}
          </div>
        </div>
        <div className={`mx-auto max-w-5xl ${isHandsetLayout ? 'mt-2' : 'mt-3'} ${focusHidden}`}>
          <StudyHeaderProgress
            current={session.sessionCount}
            total={session.sessionCount + session.cards.length}
            reward={rewardToast}
            reducedMotion={prefersReducedMotion}
          />
        </div>
      </div>

      <div
        className={`flex-1 ${isHandsetLayout ? 'overflow-hidden px-2 pt-2 pb-2' : 'overflow-y-auto px-3 py-4 sm:px-4 sm:py-6'}`}
      >
        <AnimatePresence>
          {session.error && <ErrorAlert message={session.error} onRetry={handleRetry} />}
        </AnimatePresence>

        {/* Bewusst OHNE exit-gated AnimatePresence (wait-Modus) — siehe StudyView:
            der Exit→Enter-Handover konnte hängen und die Folgekarte nie mounten. */}
        {peeking && session.lastRatedCard ? (
            // Read-only-Rückblick auf die zuletzt bewertete Karte: reine
            // Ansicht — keine Antwort-Eingaben, keine Bewertung, kein XP.
            <motion.div
              key={`peek:${session.lastRatedCard.id}:${session.sessionCount}`}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -14 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
              transition={{ duration: prefersReducedMotion ? 0.12 : 0.16, ease: 'easeOut' }}
              className={`mx-auto w-full max-w-5xl ${isHandsetLayout ? 'flex h-full min-h-0 flex-col' : ''}`}
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
              <div className={`flex flex-col gap-6 ${isHandsetLayout ? 'h-full min-h-0 flex-1' : ''}`}>
                <div className={`flex-1 ${isHandsetLayout ? 'h-full min-h-0' : ''}`}>
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
            </motion.div>
          ) : currentCard && (
            // Include the attempt count so an Again-requeued single card
            // remounts with fresh answer/PBQ state instead of staying submitted.
            <motion.div
              key={`${currentCard.id}:${session.sessionCount}`}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 14 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
              transition={{ duration: prefersReducedMotion ? 0.12 : 0.16, ease: 'easeOut' }}
              className={`mx-auto w-full max-w-5xl ${isHandsetLayout ? 'flex h-full min-h-0 flex-col' : ''}`}
              style={isHandsetLayout ? { maxHeight: '100%' } : undefined}
            >
              {settings.hardPracticeEnabled && session.hardPracticeCardIds.includes(currentCard.id) && (
                <div className="mb-2 self-center rounded-ds border border-amber-400/35 bg-amber-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-amber-200" role="status">
                  {settings.language === 'de' ? 'Hard-Verstärkung · Session-Übung' : 'Hard reinforcement · session practice'}
                </div>
              )}
              <div className={`flex flex-col gap-6 ${isHandsetLayout ? 'h-full min-h-0 flex-1' : ''}`}>
                <div className={`flex-1 ${isHandsetLayout ? 'h-full min-h-0' : ''}`}>
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
            </motion.div>
          )}

        {!isHandsetLayout && !peeking && session.isFlipped && currentCard && (
          <div className="mx-auto mt-5 w-full max-w-5xl">
            <RatingBar
              onRate={handleRate}
              maxRating={maxSelectableRating}
              disabled={session.isSubmitting || !!session.error}
              layout="row"
            />
          </div>
        )}

        {!isHandsetLayout && session.lastRatedCard && !session.isSubmitting && !peeking && (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={handlePeekLast}
            className="rounded-ds-xl border border-[#18181b] bg-[#0a0a0a] px-3 py-1.5 text-xs text-white/70 transition hover:border-[#3f3f46] hover:text-white"
            >
              {t.view_last_card}
            </button>
          </div>
        )}

        {session.isSubmitting && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex items-center justify-center gap-2 text-sm text-white/65">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white/70" />
            {t.saving}
          </motion.div>
        )}
      </div>

      {showHandsetRatingArea && (
        <AnimatePresence initial={false}>
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            transition={{ duration: prefersReducedMotion ? 0.12 : 0.15, ease: 'easeOut' }}
            className="w-full border-t border-[#18181b] bg-[#050505] px-3 pt-2"
            style={{
              height: isHandsetLandscape ? 'clamp(7.25rem, 21dvh, 10rem)' : 'clamp(9.25rem, 21dvh, 12.5rem)',
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
              className="rounded-ds-xl border border-[#18181b] bg-[#0a0a0a] px-3 py-1.5 text-xs text-white/70 transition hover:border-[#3f3f46] hover:text-white"
            >
              {t.view_last_card}
            </button>
          )}
        </div>
      )}

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
