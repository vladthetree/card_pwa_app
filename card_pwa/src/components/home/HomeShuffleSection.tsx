import { motion } from 'framer-motion'
import { Shuffle, Layers3 } from 'lucide-react'
import type { ShuffleCollection } from '../../types'

interface Props {
  language: 'de' | 'en'
  collections: ShuffleCollection[]
  onStartShuffleStudy: (collection: ShuffleCollection) => void
}

export function HomeShuffleSection({ language, collections, onStartShuffleStudy }: Props) {
  if (collections.length === 0) return null

  const title = language === 'de' ? 'Shuffle-Sammlungen' : 'Shuffle Collections'
  const subtitle = language === 'de'
    ? 'Deck-übergreifende Sessions mit unverändertem Review-Rückfluss.'
    : 'Cross-deck sessions with reviews still flowing back to each source deck.'
  const decksLabel = (count: number) => language === 'de'
    ? `${count} Deck${count === 1 ? '' : 's'}`
    : `${count} deck${count === 1 ? '' : 's'}`
  const startLabel = language === 'de' ? 'Shuffle starten' : 'Start shuffle'

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

      <div className="grid gap-2.5 sm:gap-3">
        {collections.map(collection => (
          <motion.button
            key={collection.id}
            type="button"
            onClick={() => onStartShuffleStudy(collection)}
            whileTap={{ scale: 0.99 }}
            className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-left transition hover:border-amber-300/25 hover:bg-black/30"
          >
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-white">{collection.name}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-white/45">
                <Layers3 size={13} />
                <span>{decksLabel(collection.deckIds.length)}</span>
              </div>
            </div>
            <span className="shrink-0 rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-100 transition group-hover:border-amber-200/40 group-hover:bg-amber-300/15">
              {startLabel}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
