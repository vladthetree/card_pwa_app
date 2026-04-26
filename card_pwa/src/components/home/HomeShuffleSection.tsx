import { motion } from 'framer-motion'
import { Pencil, Plus, Shuffle, Trash2, Layers3, BarChart3 } from 'lucide-react'
import type { ShuffleCollection } from '../../types'

interface ShuffleCollectionSummary {
  selectedCount: number
  inScopeDecks: number
  outOfScopeDecks: number
}

interface Props {
  language: 'de' | 'en'
  collections: ShuffleCollection[]
  summaries: Record<string, ShuffleCollectionSummary>
  onStartShuffleStudy: (collection: ShuffleCollection) => void
  onCreateCollection: () => void
  onEditCollection: (collection: ShuffleCollection) => void
  onDeleteCollection: (collection: ShuffleCollection) => void
  onShowMetrics?: (collection: ShuffleCollection) => void
  onManageCollections?: () => void
  isManagerView?: boolean
}

export function HomeShuffleSection({
  language,
  collections,
  summaries,
  onStartShuffleStudy,
  onCreateCollection,
  onEditCollection,
  onDeleteCollection,
  onShowMetrics,
  onManageCollections,
  isManagerView = false,
}: Props) {
  const title = language === 'de' ? 'Shuffle-Sammlungen' : 'Shuffle Collections'
  const subtitle = language === 'de'
    ? 'Deck-übergreifende Sessions mit unverändertem Review-Rückfluss.'
    : 'Cross-deck sessions with reviews still flowing back to each source deck.'
  const decksLabel = (count: number) => language === 'de'
    ? `${count} Deck${count === 1 ? '' : 's'}`
    : `${count} deck${count === 1 ? '' : 's'}`
  const startLabel = language === 'de' ? 'Shuffle starten' : 'Start shuffle'
  const createLabel = language === 'de' ? 'Sammlung anlegen' : 'Create collection'
  const manageLabel = language === 'de' ? 'Verwalten' : 'Manage'
  const editLabel = language === 'de' ? 'Bearbeiten' : 'Edit'
  const metricsLabel = language === 'de' ? 'Metriken' : 'Metrics'
  const deleteLabel = language === 'de' ? 'Löschen' : 'Delete'
  const emptyLabel = language === 'de'
    ? 'Noch keine Shuffle-Sammlungen angelegt.'
    : 'No shuffle collections yet.'
  const todayLabel = language === 'de' ? 'heute auswählbar' : 'available today'
  const skippedLabel = language === 'de' ? 'werden aktuell übersprungen' : 'currently skipped'

  return (
    <div className="mb-4 ds-card p-3 sm:p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-amber-200/80">
            <Shuffle size={14} />
            <span>{title}</span>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-white/55">{subtitle}</p>
        </div>
        <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.16em] text-amber-100/80">
          {collections.length}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap justify-end gap-2">
        {!isManagerView && onManageCollections && (
          <button
            type="button"
            onClick={onManageCollections}
            className="inline-flex items-center gap-2 rounded-[12px] border border-[#18181b] bg-[#0c0c0c] px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-[#3f3f46] hover:bg-[#111] hover:text-white"
          >
            <Layers3 size={14} />
            {manageLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onCreateCollection}
          className="inline-flex items-center gap-2 rounded-[12px] border border-[--brand-primary-25] bg-[--brand-primary-12] px-3 py-2 text-xs font-semibold text-[--brand-primary] transition hover:border-[--brand-primary-50] hover:bg-[--brand-primary-20]"
        >
          <Plus size={14} />
          {createLabel}
        </button>
      </div>

      {collections.length === 0 && (
        <div className="rounded-[12px] border border-dashed border-[#18181b] bg-[#0a0a0a] px-4 py-6 text-center">
          <p className="text-sm text-white/45">{emptyLabel}</p>
        </div>
      )}

      <div className="grid gap-2.5 sm:gap-3">
        {collections.map(collection => (
          <motion.div
            key={collection.id}
            whileTap={{ scale: 0.99 }}
            className="group rounded-[14px] border border-[#18181b] bg-[#0a0a0a] px-4 py-4 shadow-card transition hover:border-[--brand-primary-25] hover:bg-[#111]"
          >
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => onStartShuffleStudy(collection)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="truncate text-base font-semibold text-white">{collection.name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/45">
                  <span className="inline-flex items-center gap-2">
                    <Layers3 size={13} />
                    <span>{decksLabel(collection.deckIds.length)}</span>
                  </span>
                  <span className="rounded-full border border-amber-300/15 bg-amber-300/10 px-2 py-0.5 text-amber-100/80">
                    {summaries[collection.id]?.selectedCount ?? 0} {todayLabel}
                  </span>
                  {(summaries[collection.id]?.outOfScopeDecks ?? 0) > 0 && (
                    <span className="rounded-full border border-rose-300/15 bg-rose-300/10 px-2 py-0.5 text-rose-100/80">
                      {summaries[collection.id]?.outOfScopeDecks ?? 0} {skippedLabel}
                    </span>
                  )}
                </div>
              </button>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => onShowMetrics?.(collection)}
                  className="ds-icon-button inline-flex h-11 w-11 sm:h-9 sm:w-9"
                  aria-label={metricsLabel}
                  title={metricsLabel}
                >
                  <BarChart3 size={14} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => onEditCollection(collection)}
                  className="ds-icon-button inline-flex h-11 w-11 sm:h-9 sm:w-9"
                  aria-label={editLabel}
                  title={editLabel}
                >
                  <Pencil size={14} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteCollection(collection)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-rose-400/20 bg-[#0c0c0c] text-rose-200/70 transition hover:border-rose-300/35 hover:bg-[#111] hover:text-rose-100 sm:h-9 sm:w-9"
                  aria-label={deleteLabel}
                  title={deleteLabel}
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => onStartShuffleStudy(collection)}
                className="shrink-0 rounded-[12px] border border-[--brand-primary-25] bg-[--brand-primary-12] px-3 py-2 text-xs font-semibold text-[--brand-primary] transition group-hover:border-[--brand-primary-50] group-hover:bg-[--brand-primary-20]"
              >
                {startLabel}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
