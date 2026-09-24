/**
 * AI_CONTEXT: Home-screen React component for home Deck List Section; supports dashboard, deck browsing, tag browsing, export, or quick study workflows.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from '../../ui/motion'
import { RefreshCw, AlertCircle, Upload, Shuffle, Layers3, Pencil, Trash2, BarChart3 } from 'lucide-react'
import { DeckCard } from '../DeckCard'
import type { Deck, DeckScheduleOverview, ShuffleCollection } from '../../types'

interface ShuffleCollectionSummary {
  selectedCount: number
  inScopeDecks: number
  outOfScopeDecks: number
}

interface Props {
  t: Record<string, string>
  language: 'de' | 'en'
  error: string | null
  loading: boolean
  decks: Deck[]
  filteredDecks: Deck[]
  visibleDecks: Deck[]
  deckScheduleOverview: Record<string, DeckScheduleOverview>
  shuffleModeEnabled: boolean
  showShuffleOnly: boolean
  shuffleCollections: ShuffleCollection[]
  shuffleSummaries: Record<string, ShuffleCollectionSummary>
  onReload: () => void
  onPullRefresh: () => Promise<boolean>
  onShowImport: () => void
  onStartStudy: (deck: Deck) => void
  onStartShuffleStudy: (collection: ShuffleCollection) => void
  onEditShuffleCollection: (collection: ShuffleCollection) => void
  onDeleteShuffleCollection: (collection: ShuffleCollection) => void
  onShowShuffleMetrics: (collection: ShuffleCollection) => void
  onDelete: (deckId: string, name: string) => void
  onShowMetrics: (deck: Deck) => void
  onManageCards: (deck: Deck) => void
}

export function HomeDeckListSection({
  t,
  language,
  error,
  loading,
  decks,
  filteredDecks,
  visibleDecks,
  deckScheduleOverview,
  shuffleModeEnabled,
  showShuffleOnly,
  shuffleCollections,
  shuffleSummaries,
  onReload,
  onPullRefresh,
  onShowImport,
  onStartStudy,
  onStartShuffleStudy,
  onEditShuffleCollection,
  onDeleteShuffleCollection,
  onShowShuffleMetrics,
  onDelete,
  onShowMetrics,
  onManageCards,
}: Props) {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const touchStartYRef = useRef<number | null>(null)
  const rawPullDistanceRef = useRef(0)
  const refreshingRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const resetPull = useCallback(() => {
    touchStartYRef.current = null
    rawPullDistanceRef.current = 0
    setPullDistance(0)
  }, [])

  const isHandsetViewport = () => {
    if (typeof window === 'undefined') return false
    return typeof window.matchMedia === 'function'
      ? window.matchMedia('(max-width: 639px)').matches
      : window.innerWidth < 640
  }

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (refreshingRef.current || !isHandsetViewport()) return
    if (event.touches.length !== 1 || event.currentTarget.scrollTop > 0) return
    touchStartYRef.current = event.touches[0].clientY
    rawPullDistanceRef.current = 0
  }, [])

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const startY = touchStartYRef.current
    if (startY === null || event.touches.length !== 1) return
    if (event.currentTarget.scrollTop > 0) {
      resetPull()
      return
    }

    const rawDistance = event.touches[0].clientY - startY
    if (rawDistance <= 0) {
      rawPullDistanceRef.current = 0
      setPullDistance(0)
      return
    }

    rawPullDistanceRef.current = rawDistance
    setPullDistance(Math.min(72, rawDistance * 0.45))
  }, [resetPull])

  const finishPull = useCallback(() => {
    const shouldRefresh = rawPullDistanceRef.current >= 72 && !refreshingRef.current
    resetPull()
    if (!shouldRefresh) return

    refreshingRef.current = true
    setRefreshing(true)
    void onPullRefresh()
      .catch(() => false)
      .finally(() => {
        refreshingRef.current = false
        if (mountedRef.current) setRefreshing(false)
      })
  }, [onPullRefresh, resetPull])

  const renderShuffleCards = () => (
    <>
      {shuffleModeEnabled && shuffleCollections.map(collection => {
        const summary = shuffleSummaries[collection.id]

        return (
          <motion.div
            key={collection.id}
            className="group rounded-ds border border-ds-border bg-ds-card px-4 py-4 shadow-card transition hover:border-[--brand-primary-50] hover:bg-ds-panel"
          >
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => onStartShuffleStudy(collection)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[--brand-primary]">
                  <Shuffle size={12} />
                  <span>{language === 'de' ? 'Virtuelles Deck' : 'Virtual deck'}</span>
                </div>
                <div className="mt-1 truncate text-base font-semibold text-white">{collection.name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ds-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <Layers3 size={12} />
                    <span>
                      {collection.deckIds.length} {language === 'de' ? 'Quell-Decks' : 'source decks'}
                    </span>
                  </span>
                  <span className="rounded-[5px] border border-[--brand-primary-25] bg-[--brand-primary-08] px-2 py-0.5 text-[--brand-primary]">
                    {summary?.selectedCount ?? 0} {language === 'de' ? 'heute auswählbar' : 'available today'}
                  </span>
                </div>
              </button>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => onShowShuffleMetrics(collection)}
                  className="ds-icon-button inline-flex h-11 w-11 sm:h-9 sm:w-9"
                  aria-label={language === 'de' ? 'Metriken' : 'Metrics'}
                  title={language === 'de' ? 'Metriken' : 'Metrics'}
                >
                  <BarChart3 size={14} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => onEditShuffleCollection(collection)}
                  className="ds-icon-button inline-flex h-11 w-11 sm:h-9 sm:w-9"
                  aria-label={language === 'de' ? 'Bearbeiten' : 'Edit'}
                  title={language === 'de' ? 'Bearbeiten' : 'Edit'}
                >
                  <Pencil size={14} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteShuffleCollection(collection)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-ds border border-rose-400/20 bg-ds-card text-rose-200/75 transition hover:border-rose-300/35 hover:bg-ds-panel hover:text-rose-100 sm:h-9 sm:w-9"
                  aria-label={language === 'de' ? 'Löschen' : 'Delete'}
                  title={language === 'de' ? 'Löschen' : 'Delete'}
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </motion.div>
        )
      })}
    </>
  )

  return (
    <div
      className="home-bottom-scroll-padding relative z-0 min-h-0 flex-1 overflow-y-auto no-scrollbar pr-1 sm:pb-4"
      style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain', touchAction: 'pan-y' }}
      data-testid="home-deck-list-scroll"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={finishPull}
      onTouchCancel={resetPull}
    >
      <div
        className="pointer-events-none sticky top-0 z-20 flex h-0 justify-center sm:hidden"
        data-testid="home-deck-pull-refresh"
        role="status"
        aria-live="polite"
        aria-label={refreshing
          ? (language === 'de' ? 'Decks werden aktualisiert' : 'Refreshing decks')
          : undefined}
      >
        <div
          className={`mt-2 flex h-9 w-9 items-center justify-center rounded-full border border-ds-border bg-ds-panel text-[--brand-primary] shadow-card transition-opacity duration-150 ${refreshing ? 'opacity-100' : ''}`}
          style={{
            opacity: refreshing ? 1 : Math.min(1, pullDistance / 36),
            transform: `translateY(${refreshing ? 8 : Math.max(0, pullDistance - 28)}px) scale(${refreshing ? 1 : 0.8 + Math.min(0.2, pullDistance / 180)})`,
          }}
          aria-hidden="true"
        >
          <RefreshCw
            size={17}
            strokeWidth={2}
            className={refreshing ? 'animate-spin' : ''}
            style={refreshing ? undefined : { transform: `rotate(${Math.min(300, pullDistance * 4)}deg)` }}
          />
        </div>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex items-center justify-between rounded-ds border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300 shadow-card">
          <div className="flex items-center gap-2"><AlertCircle size={16} strokeWidth={1.5} /><span>{error}</span></div>
          <button onClick={onReload} className="ml-3 px-3 py-1 bg-rose-500/30 hover:bg-rose-500/50 rounded-ds text-xs font-medium transition"><RefreshCw size={12} strokeWidth={1.5} className="inline mr-1" /> {t.retry}</button>
        </motion.div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 items-start gap-2.5 sm:gap-3 lg:grid-cols-2 2xl:grid-cols-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 ds-card animate-pulse" />)}</div>
      ) : !showShuffleOnly && decks.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto mt-8 flex w-[calc(100%-1rem)] max-w-lg flex-col items-center border-4 border-black bg-[#FFD93D] px-6 py-8 text-center shadow-[8px_8px_0_0_#000] sm:mt-16">
          <p className="mb-4 text-sm font-black uppercase tracking-wide text-black">{t.no_decks}</p>
          <button onClick={onShowImport} className="inline-flex items-center gap-2 border-[3px] border-black bg-[#FF6B6B] px-5 py-2.5 text-sm font-black uppercase text-black shadow-[4px_4px_0_0_#000] transition-all duration-100 hover:bg-white active:translate-x-1 active:translate-y-1 active:shadow-none">
            <Upload size={16} strokeWidth={1.5} /> {t.import_now}
          </button>
        </motion.div>
      ) : !showShuffleOnly && filteredDecks.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex min-h-full flex-col items-center justify-start pt-10 pb-12 text-center sm:justify-center sm:py-16">
          <p className="text-white/40 text-sm">
            {language === 'de' ? 'Keine Decks zu deiner Suche gefunden.' : 'No decks match your search.'}
          </p>
        </motion.div>
      ) : showShuffleOnly && shuffleCollections.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex min-h-full flex-col items-center justify-start pt-10 pb-12 text-center sm:justify-center sm:py-16">
          <p className="text-white/40 text-sm">
            {language === 'de' ? 'Keine Shuffle-Decks vorhanden.' : 'No shuffle decks yet.'}
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-2.5 sm:gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {!showShuffleOnly && visibleDecks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              language={language}
              onStartStudy={onStartStudy}
              onDelete={onDelete}
              schedule={deckScheduleOverview[deck.id]}
              deckScheduleOverview={deckScheduleOverview}
              onShowMetrics={onShowMetrics}
              onManageCards={onManageCards}
            />
          ))}

          {showShuffleOnly && renderShuffleCards()}
        </div>
      )}
    </div>
  )
}
