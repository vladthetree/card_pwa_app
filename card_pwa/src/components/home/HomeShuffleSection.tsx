import { motion } from 'framer-motion'
import { Pencil, Plus, Shuffle, Trash2, Layers3 } from 'lucide-react'
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
}

export function HomeShuffleSection({
  language,
  collections,
  summaries,
  onStartShuffleStudy,
  onCreateCollection,
  onEditCollection,
  onDeleteCollection,
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
  const editLabel = language === 'de' ? 'Bearbeiten' : 'Edit'
  const deleteLabel = language === 'de' ? 'Löschen' : 'Delete'
  const emptyLabel = language === 'de'
    ? 'Noch keine Shuffle-Sammlungen angelegt.'
    : 'No shuffle collections yet.'
  const todayLabel = language === 'de' ? 'heute auswählbar' : 'available today'
  const skippedLabel = language === 'de' ? 'werden aktuell übersprungen' : 'currently skipped'

  return (
    <div className="mb-4 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] p-3 sm:p-4">
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

      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={onCreateCollection}
          className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:border-amber-200/40 hover:bg-amber-300/15"
        >
          <Plus size={14} />
          {createLabel}
        </button>
      </div>

      {collections.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/15 bg-black/15 px-4 py-6 text-center">
          <p className="text-sm text-white/45">{emptyLabel}</p>
        </div>
      )}

      <div className="grid gap-2.5 sm:gap-3">
        {collections.map(collection => (
          <motion.div
            key={collection.id}
            whileTap={{ scale: 0.99 }}
            className="group rounded-2xl border border-white/10 bg-black/20 px-4 py-4 transition hover:border-amber-300/25 hover:bg-black/30"
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
                  onClick={() => onEditCollection(collection)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 text-white/55 transition hover:border-white/25 hover:text-white"
                  aria-label={editLabel}
                  title={editLabel}
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteCollection(collection)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-400/20 text-rose-200/70 transition hover:border-rose-300/35 hover:text-rose-100"
                  aria-label={deleteLabel}
                  title={deleteLabel}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => onStartShuffleStudy(collection)}
                className="shrink-0 rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-100 transition group-hover:border-amber-200/40 group-hover:bg-amber-300/15"
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
