import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingDown, TrendingUp, Minus, X } from 'lucide-react'
import { getShuffleCollectionMetricsSnapshot } from '../db/queries'
import { STRINGS } from '../contexts/SettingsContext'
import { UI_TOKENS } from '../constants/ui'
import { formatDeckName } from '../utils/cardTextParser'
import type { Deck, MetricsPeriod, ShuffleCollection, ShuffleCollectionMetricsSnapshot } from '../types'

interface Props {
  collection: ShuffleCollection
  decks: Deck[]
  language: 'de' | 'en'
  onClose: () => void
}

export function ShuffleMetricsModal({ collection, decks, language, onClose }: Props) {
  const t = STRINGS[language]
  const [period, setPeriod] = useState<MetricsPeriod>('all')
  const [metrics, setMetrics] = useState<ShuffleCollectionMetricsSnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  const deckNameById = useMemo(
    () => new Map(decks.map(deck => [deck.id, formatDeckName(deck.name)])),
    [decks],
  )

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      const result = await getShuffleCollectionMetricsSnapshot(collection.deckIds, period)
      if (!cancelled) {
        setMetrics(result)
        setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [collection.deckIds, period])

  const hasReviews = (metrics?.totalReviews ?? 0) > 0
  const trendIcon = metrics && metrics.trendDelta !== 0
    ? metrics.trendDelta > 0
      ? <TrendingUp size={14} className="text-emerald-300" />
      : <TrendingDown size={14} className="text-rose-300" />
    : <Minus size={14} className="text-white/55" />

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={UI_TOKENS.modal.overlay}
    >
      <button type="button" className={UI_TOKENS.modal.backdrop} onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        className={`${UI_TOKENS.modal.shell} max-w-3xl`}
      >
        <div className={UI_TOKENS.modal.header}>
          <div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-amber-200/75">
              <BarChart3 size={14} />
              <span>{language === 'de' ? 'Shuffle-Metriken' : 'Shuffle metrics'}</span>
            </div>
            <h3 className={`${UI_TOKENS.modal.title} mt-2`}>{collection.name}</h3>
            <p className={UI_TOKENS.modal.subtitle}>
              {language === 'de'
                ? 'Aggregiert aus den Originaldecks der Sammlung.'
                : 'Aggregated from the source decks in this collection.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className={UI_TOKENS.modal.closeButton}>
            <X size={16} />
          </button>
        </div>

        <div className={UI_TOKENS.modal.body}>
        <div className="mt-1 inline-flex w-full overflow-hidden rounded-2xl border border-zinc-900 transition-all duration-300 ease-out sm:w-auto">
          <button
            type="button"
            onClick={() => setPeriod('all')}
            className={`flex-1 px-3 py-2 text-xs sm:text-sm transition-all duration-300 ease-out active:scale-95 ${period === 'all' ? 'bg-white text-black' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
          >
            {t.metrics_period_all}
          </button>
          <button
            type="button"
            onClick={() => setPeriod('7d')}
            className={`flex-1 px-3 py-2 text-xs sm:text-sm transition-all duration-300 ease-out active:scale-95 ${period === '7d' ? 'bg-white text-black' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
          >
            {t.metrics_period_7d}
          </button>
        </div>

        {loading || !metrics ? (
          <div className="mt-5 h-44 animate-pulse rounded-xl border border-white/10 bg-white/5" />
        ) : (
          <>
            <div className="mt-5 rounded-[2.5rem] border border-zinc-900 bg-black p-5 sm:p-6 transition-all duration-300 ease-out">
              <p className="text-xs uppercase tracking-wide text-amber-100/70">{t.metrics_success_rate}</p>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <p className="text-6xl leading-none font-black text-amber-300 sm:text-8xl">{metrics.successRate}%</p>
                <p className="pb-2 text-xs font-light text-amber-100/70 sm:text-sm">
                  {t.metrics_reviews_total}: {metrics.totalReviews}
                </p>
              </div>
              {!hasReviews && (
                <p className="mt-2 text-xs text-amber-100/70 sm:text-sm">
                  {language === 'de'
                    ? `Noch keine Reviews in ${metrics.deckCount} Decks dieser Sammlung.`
                    : `No reviews yet across ${metrics.deckCount} decks in this collection.`}
                </p>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              <div className="rounded-xl border border-zinc-900 bg-black p-3">
                <p className="text-xs font-light text-white/55">{language === 'de' ? 'Decks' : 'Decks'}</p>
                <p className="text-lg font-black text-white sm:text-xl">{metrics.deckCount}</p>
              </div>
              <div className="rounded-xl border border-zinc-900 bg-black p-3">
                <p className="text-xs font-light text-white/55">{t.metrics_cards_total}</p>
                <p className="text-lg font-black text-white sm:text-xl">{metrics.cardCount}</p>
              </div>
              <div className="rounded-xl border border-zinc-900 bg-black p-3">
                <p className="text-xs font-light text-white/55">{t.metrics_reviewed_cards}</p>
                <p className="text-lg font-black text-white sm:text-xl">{metrics.reviewedCardCount}</p>
              </div>
              <div className="rounded-xl border border-zinc-900 bg-black p-3">
                <p className="text-xs font-light text-white/55">{t.metrics_trend}</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-black text-emerald-500 sm:text-base">
                  {trendIcon}
                  {metrics.trendDelta > 0 ? '+' : ''}{metrics.trendDelta}%
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-zinc-900 bg-black p-3">
              <p className="mb-2 text-xs font-light text-white/55">{t.metrics_rating_distribution}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[1, 2, 3, 4].map(rating => (
                  <div key={rating} className="rounded-lg border border-zinc-900 bg-black px-2 py-2 text-center">
                    <p className="text-xs font-light text-white/50">{rating}</p>
                    <p className="text-sm font-black text-white">{metrics.ratingCounts[rating as 1 | 2 | 3 | 4]}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-zinc-900 bg-black p-3">
              <p className="mb-3 text-xs font-light text-white/55">
                {language === 'de' ? 'Beitrag pro Ursprungsdeck' : 'Contribution by source deck'}
              </p>
              <div className="grid gap-2">
                {metrics.decks
                  .slice()
                  .sort((a, b) => b.totalReviews - a.totalReviews || a.deckId.localeCompare(b.deckId))
                  .map(entry => (
                    <div key={entry.deckId} className="flex items-center justify-between rounded-xl border border-zinc-900 bg-black px-3 py-2">
                      <div className="min-w-0 pr-3">
                        <p className="truncate text-sm font-semibold text-white">
                          {deckNameById.get(entry.deckId) ?? entry.deckId}
                        </p>
                        <p className="mt-1 text-xs text-white/45">
                          {entry.cardCount} {language === 'de' ? 'Karten' : 'cards'} · {entry.reviewedCardCount} {language === 'de' ? 'reviewt' : 'reviewed'}
                        </p>
                      </div>
                      <div className="text-right text-xs text-white/65">
                        <p>{entry.totalReviews} {language === 'de' ? 'Reviews' : 'reviews'}</p>
                        <p>{entry.successRate}% {language === 'de' ? 'Erfolg' : 'success'}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}
        </div>
      </motion.div>
    </motion.div>
  )
}
