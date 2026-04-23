import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, RefreshCw, Shuffle } from 'lucide-react'
import {
  clearShuffleSession,
  forceCardReviewTomorrow,
  readShuffleSession,
  recordReview,
  undoReview,
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
  parsePersistedStudySession,
  restoreCardsByOrder,
  sanitizeCardLimit,
  type PersistedStudySession,
} from '../services/studySessionPersistence'
import { initialSessionState, sessionReducer } from '../services/studySessionReducer'
import type { Card, Rating, ShuffleCollection } from '../types'
import { formatDeckName } from '../utils/cardTextParser'
import CardFace from './CardFace'
import EditCardModal from './EditCardModal'
import ProgressBar from './ProgressBar'
import RatingBar from './RatingBar'

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
      className="mx-auto mb-4 flex w-full max-w-3xl items-center justify-between rounded-xl border border-rose-500/30 bg-black p-4 text-sm text-rose-300"
    >
      <div className="flex items-center gap-2">
        <RefreshCw size={14} />
        <span>{message}</span>
      </div>
      <button
        onClick={onRetry}
        className="ml-3 rounded-lg bg-rose-500/30 px-3 py-1 text-xs font-medium transition hover:bg-rose-500/50"
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
  const studyCardLimit = sanitizeCardLimit(settings.studyCardLimit ?? DEFAULT_STUDY_CARD_LIMIT)
  const { cards, loading, error, reload } = useShuffleCards(collection.id, {
    maxCards: studyCardLimit,
    nextDayStartsAt: settings.nextDayStartsAt,
  })
  const { decks } = useDecks()

  const [session, dispatch] = useReducer(sessionReducer, initialSessionState)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [answerWasIncorrect, setAnswerWasIncorrect] = useState(false)
  const [sessionDeckCounts, setSessionDeckCounts] = useState<Record<string, number>>({})
  const sessionDoneRef = useRef(session.isDone)
  const sessionCardsLengthRef = useRef(session.cards.length)
  const restoreRunIdRef = useRef(0)

  useWakeLock()

  useEffect(() => {
    sessionDoneRef.current = session.isDone
    sessionCardsLengthRef.current = session.cards.length
  }, [session.isDone, session.cards.length])

  const sessionId = useMemo(() => buildShuffleSessionId(collection.id), [collection.id])
  const latestShuffleCardById = useMemo(() => new Map(cards.map(card => [card.id, card])), [cards])
  const deckNameById = useMemo(
    () => new Map(decks.map(deck => [deck.id, formatDeckName(deck.name)])),
    [decks],
  )
  const currentCard = useMemo(() => session.cards[0] ?? null, [session.cards])
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

  const readPersistedSession = useCallback(async (): Promise<PersistedStudySession | null> => {
    const raw = await readShuffleSession(collection.id)
    const parsed = parsePersistedStudySession(raw, sessionId)
    if (!parsed) {
      void clearShuffleSession(collection.id)
      return null
    }
    return parsed
  }, [collection.id, sessionId])

  const clearPersistedSession = useCallback(() => {
    void clearShuffleSession(collection.id)
  }, [collection.id])

  useEffect(() => {
    if (loading) return
    if (session.isDone) return
    if (session.cards.length > 0) return

    const runId = ++restoreRunIdRef.current
    let cancelled = false

    const isStale = () => cancelled || restoreRunIdRef.current !== runId
    const canApplyRestore = () => !sessionDoneRef.current && sessionCardsLengthRef.current === 0

    void (async () => {
      const snapshot = await readPersistedSession()
      if (isStale()) return

      if (!snapshot) {
        if (!canApplyRestore()) return
        setSessionDeckCounts(buildDeckCounts(cards))
        dispatch({ type: 'INIT', cards })
        return
      }

      const persistedCardLimit = sanitizeCardLimit(snapshot.cardLimit ?? DEFAULT_STUDY_CARD_LIMIT)
      if (persistedCardLimit !== studyCardLimit) {
        clearPersistedSession()
        if (!canApplyRestore()) return
        setSessionDeckCounts(buildDeckCounts(cards))
        dispatch({ type: 'INIT', cards })
        return
      }

      const restoredCards = restoreCardsByOrder(cards, snapshot.cardIds)
      if (restoredCards.length === 0) {
        clearPersistedSession()
        if (!canApplyRestore()) return
        setSessionDeckCounts(buildDeckCounts(cards))
        dispatch({ type: 'INIT', cards })
        return
      }

      if (!canApplyRestore()) return
      setSessionDeckCounts(buildDeckCounts(restoredCards))
      dispatch({ type: 'RESTORE', cards: restoredCards, snapshot })
    })()

    return () => {
      cancelled = true
    }
  }, [cards, clearPersistedSession, loading, readPersistedSession, session.cards.length, session.isDone, studyCardLimit])

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
      startTime: session.startTime,
    })

    void writeShuffleSession(collection.id, JSON.stringify(payload))
  }, [
    cards,
    clearPersistedSession,
    collection.deckIds,
    collection.id,
    session.cards,
    session.againCounts,
    session.forcedTomorrowCardIds,
    session.isDone,
    session.isFlipped,
    session.lastRating,
    session.lowRatingCounts,
    session.relearnSuccessCounts,
    session.sessionCount,
    session.startTime,
    sessionId,
    studyCardLimit,
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
    dispatch({ type: 'FLIP' })
  }, [])

  const handleAnswerEvaluated = useCallback((isCorrect: boolean) => {
    setAnswerWasIncorrect(!isCorrect)
  }, [])

  const handleRate = useCallback(async (rating: Rating) => {
    if (!currentCard || session.isSubmitting || session.isDone || isAlgorithmMigrating) return

    const effectiveRating: Rating = answerWasIncorrect ? 1 : rating
    const elapsedMs = Date.now() - session.startTime
    dispatch({ type: 'RATE_START', rating: effectiveRating, elapsedMs })

    try {
      const result = await recordReview(
        currentCard.id,
        effectiveRating,
        elapsedMs,
        settings.algorithm,
        settings.algorithmParams,
      )

      if (!result.ok || !result.undoToken) {
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
        undoToken: result.undoToken,
        forcedTomorrow,
      })
      setAnswerWasIncorrect(false)
    } catch (err) {
      dispatch({ type: 'RATE_ERROR', message: err instanceof Error ? err.message : t.unknown_error })
    }
  }, [
    answerWasIncorrect,
    currentCard,
    isAlgorithmMigrating,
    session.againCounts,
    session.isDone,
    session.isSubmitting,
    session.startTime,
    settings.algorithm,
    settings.algorithmParams,
    t.save_rating_failed,
    t.unknown_error,
  ])

  const handleRetry = useCallback(async () => {
    if (!session.lastRating || !currentCard || session.isSubmitting || isAlgorithmMigrating) return

    const { rating, elapsedMs } = session.lastRating
    dispatch({ type: 'CLEAR_ERROR' })
    dispatch({ type: 'RATE_START', rating, elapsedMs })

    try {
      const result = await recordReview(currentCard.id, rating, elapsedMs, settings.algorithm, settings.algorithmParams)
      if (!result.ok || !result.undoToken) {
        dispatch({ type: 'RATE_ERROR', message: result.error || t.save_failed })
        return
      }

      let forcedTomorrow = false
      if (rating === 1 && (session.againCounts[currentCard.id] ?? 0) >= 2) {
        const forceResult = await forceCardReviewTomorrow(currentCard.id)
        if (forceResult.ok) forcedTomorrow = true
      }

      dispatch({ type: 'RATE_SUCCESS', rating, cardId: currentCard.id, undoToken: result.undoToken, forcedTomorrow })
      setAnswerWasIncorrect(false)
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
    t.save_failed,
    t.unknown_error,
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
    setAnswerWasIncorrect(false)
  }, [isAlgorithmMigrating, session.isSubmitting, session.lastUndoToken, t.save_failed])

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
      if (session.isFlipped && !session.error && !session.isSubmitting && !session.isDone) {
        if (e.key === '1') handleRate(1)
        if (e.key === '2') handleRate(2)
        if (e.key === '3') handleRate(3)
        if (e.key === '4' && maxSelectableRating === 4) handleRate(4)
      }
      if (e.key === 'Escape') onExit()
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [handleFlip, handleRate, maxSelectableRating, onExit, session.error, session.isDone, session.isFlipped, session.isSubmitting])

  if (error && !loading && cards.length === 0) {
    return (
      <div className="min-h-screen px-4 py-10">
        <ErrorAlert message={error} onRetry={reload} />
      </div>
    )
  }

  if (!loading && session.isDone) {
    return (
      <div className="min-h-screen bg-black px-4 py-10 text-white">
        <div className="mx-auto max-w-2xl rounded-[32px] border border-white/10 bg-white/[0.04] p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-400/10 text-emerald-200">
            <Shuffle size={22} />
          </div>
          <h1 className="text-2xl font-semibold">{collection.name}</h1>
          <p className="mt-3 text-sm text-white/55">
            {settings.language === 'de' ? 'Diese Shuffle-Session ist abgeschlossen.' : 'This shuffle session is complete.'}
          </p>
          {sessionDeckSummary.length > 0 && (
            <div className="mt-6 rounded-3xl border border-white/10 bg-black/25 p-4 text-left">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                {settings.language === 'de' ? 'Verteilung nach Ursprungsdeck' : 'Source deck distribution'}
              </div>
              <div className="mt-3 grid gap-2">
                {sessionDeckSummary.map(entry => (
                  <div
                    key={entry.deckId}
                    className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm"
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
              className="rounded-2xl border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-white/30 hover:text-white"
            >
              {settings.language === 'de' ? 'Neu mischen' : 'Reshuffle'}
            </button>
            <button
              type="button"
              onClick={onExit}
              className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              {settings.language === 'de' ? 'Zur Startseite' : 'Back home'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-black/90 px-3 py-3 backdrop-blur sm:px-4">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 text-white/75 transition hover:border-white/30 hover:text-white"
            aria-label={settings.language === 'de' ? 'Zurück' : 'Back'}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-amber-200/75">
              <Shuffle size={14} />
              <span>{settings.language === 'de' ? 'Shuffle-Modus' : 'Shuffle mode'}</span>
            </div>
            <div className="truncate text-lg font-semibold">{collection.name}</div>
          </div>
          <div className="rounded-xl border border-white/10 px-3 py-2 text-xs font-mono text-white/60">
            {collection.deckIds.length} {settings.language === 'de' ? 'Decks' : 'decks'}
          </div>
        </div>
        <div className="mx-auto mt-3 max-w-5xl">
          <ProgressBar current={session.sessionCount} total={session.sessionCount + session.cards.length} />
        </div>
      </div>

      <div className={`flex-1 ${isHandsetLayout ? 'overflow-hidden px-2 pt-2 pb-0' : 'overflow-y-auto px-3 py-4 sm:px-4 sm:py-6'}`}>
        <AnimatePresence>
          {session.error && <ErrorAlert message={session.error} onRetry={handleRetry} />}
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          {currentCard && (
            <motion.div
              key={currentCard.id}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 14 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -12 }}
              transition={{ duration: prefersReducedMotion ? 0.12 : 0.16, ease: 'easeOut' }}
              className={`mx-auto w-full max-w-5xl ${isHandsetLayout ? 'flex h-full min-h-0 flex-col' : ''}`}
              style={isHandsetLayout ? { maxHeight: 'calc(100% - var(--safe-bottom) - 1.35rem)' } : undefined}
            >
              <div className={`flex flex-col gap-6 ${isHandsetLayout ? 'h-full min-h-0 flex-1' : ''}`}>
                <div className={`flex-1 ${isHandsetLayout ? 'h-full min-h-0' : ''}`}>
                  <CardFace
                    card={currentCard}
                    flipped={session.isFlipped}
                    onFlip={handleFlip}
                    onEdit={handleEditCard}
                    onAnswerEvaluated={handleAnswerEvaluated}
                    compact={isHandsetLayout}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isHandsetLayout && session.isFlipped && currentCard && (
          <div className="mx-auto mt-5 w-full max-w-5xl">
            <RatingBar
              onRate={handleRate}
              maxRating={maxSelectableRating}
              disabled={session.isSubmitting || !!session.error}
              layout="row"
            />
          </div>
        )}

        {session.lastUndoToken && !session.isSubmitting && (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={handleUndoLastRating}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 transition hover:border-white/25 hover:text-white"
            >
              {t.undo_last_rating}
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

      {isHandsetLayout && session.isFlipped && currentCard && (
        <AnimatePresence initial={false}>
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            transition={{ duration: prefersReducedMotion ? 0.12 : 0.15, ease: 'easeOut' }}
            className="w-full border-t border-white/15 bg-black/95 px-3 pt-3"
            style={{
              height: isHandsetLandscape ? 'clamp(8.25rem, 24dvh, 11rem)' : 'clamp(11.5rem, 25dvh, 15.5rem)',
              paddingBottom: 'calc(var(--safe-bottom) + 0.5rem)',
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
