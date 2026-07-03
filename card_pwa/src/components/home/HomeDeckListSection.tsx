/**
 * AI_CONTEXT: Home-screen React component for home Deck List Section; supports dashboard, deck browsing, tag browsing, export, or quick study workflows.
 */
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
    >
      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex items-center justify-between rounded-ds border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300 shadow-card">
          <div className="flex items-center gap-2"><AlertCircle size={16} strokeWidth={1.5} /><span>{error}</span></div>
          <button onClick={onReload} className="ml-3 px-3 py-1 bg-rose-500/30 hover:bg-rose-500/50 rounded-ds text-xs font-medium transition"><RefreshCw size={12} strokeWidth={1.5} className="inline mr-1" /> {t.retry}</button>
        </motion.div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2.5 sm:gap-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 ds-card animate-pulse" />)}</div>
      ) : !showShuffleOnly && decks.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex min-h-full flex-col items-center justify-start pt-10 pb-12 text-center sm:justify-center sm:py-16">
          <p className="text-white/30 text-sm mb-4">{t.no_decks}</p>
          <button onClick={onShowImport} className="inline-flex items-center gap-2 rounded-ds bg-[--brand-primary] px-5 py-2.5 text-sm font-semibold text-[#150b08] transition-all duration-200 ease-out hover:brightness-110 active:scale-[0.98]">
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
        <div className="flex flex-col gap-2.5 sm:gap-3">
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
