import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, X } from 'lucide-react'
import { getDeckMetricsSnapshot } from '../db/queries'
import { STRINGS } from '../contexts/SettingsContext'
import { UI_TOKENS } from '../constants/ui'
import { formatDeckName } from '../utils/cardTextParser'
import type { Deck, MetricsPeriod, DeckMetricsSnapshot } from '../types'

export function DeckMetricsModal({ deck, language, onClose }: { deck: Deck; language: 'de' | 'en'; onClose: () => void }) {
  const t = STRINGS[language]
  const [period, setPeriod] = useState<MetricsPeriod>('all')
  const [metrics, setMetrics] = useState<DeckMetricsSnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  const formatMetricTimestamp = (timestamp: number | null) => {
    if (!timestamp) return t.metrics_never_pressed
    return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp)
  }

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      const result = await getDeckMetricsSnapshot(deck.id, period)
      if (!cancelled) {
        setMetrics(result)
        setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [deck.id, period])

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
      style={{
        paddingTop: 'calc(var(--safe-top) + 1rem)',
        paddingBottom: 'calc(var(--safe-bottom) + 1rem)',
      }}
    >
      <button type="button" className={UI_TOKENS.modal.backdrop} onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        className={`${UI_TOKENS.modal.shell} max-w-xl p-5 sm:p-6`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className={UI_TOKENS.modal.title}>{t.metrics_success_rate}</h3>
            <p className={UI_TOKENS.modal.subtitle}>{formatDeckName(deck.name)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={UI_TOKENS.modal.closeButton}
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 inline-flex rounded-2xl border border-zinc-900 overflow-hidden transition-all duration-300 ease-out">
          <button
            type="button"
            onClick={() => setPeriod('all')}
            className={`px-3 py-1.5 text-xs sm:text-sm transition-all duration-300 ease-out active:scale-95 ${period === 'all' ? 'bg-white text-black' : 'text-white/75 hover:text-white hover:bg-white/10'}`}
          >
            {t.metrics_period_all}
          </button>
          <button
            type="button"
            onClick={() => setPeriod('7d')}
            className={`px-3 py-1.5 text-xs sm:text-sm transition-all duration-300 ease-out active:scale-95 ${period === '7d' ? 'bg-white text-black' : 'text-white/75 hover:text-white hover:bg-white/10'}`}
          >
            {t.metrics_period_7d}
          </button>
        </div>

        {loading || !metrics ? (
          <div className="mt-5 h-36 rounded-xl border border-white/10 bg-white/5 animate-pulse" />
        ) : (
          <>
            <div className="mt-5 rounded-[2.5rem] border border-zinc-900 bg-black p-5 sm:p-6 transition-all duration-300 ease-out">
              <p className="text-xs uppercase tracking-wide text-emerald-100/70">{t.metrics_success_rate}</p>
              <div className="mt-2 flex items-end gap-2">
                <p className="text-8xl leading-none font-black text-emerald-400">{metrics.successRate}%</p>
                <p className="text-xs sm:text-sm font-light text-emerald-200/70 pb-2">{t.metrics_reviews_total}: {metrics.totalReviews}</p>
              </div>
              {!hasReviews && (
                <p className="mt-2 text-xs sm:text-sm text-emerald-100/70">{t.metrics_empty_with_cards.replace('{count}', String(metrics.cardCount))}</p>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="rounded-xl border border-zinc-900 bg-black p-3">
                <p className="text-xs font-light text-white/55">{t.metrics_trend}</p>
                {hasReviews ? (
                  <p className="text-sm sm:text-base font-black text-emerald-500 drop-shadow-sm mt-1 inline-flex items-center gap-1.5">
                    {trendIcon}
                    {metrics.trendDelta > 0 ? '+' : ''}{metrics.trendDelta}%
                  </p>
                ) : (
                  <p className="text-sm sm:text-base font-light text-white/65 mt-1">{t.metrics_trend_no_data}</p>
                )}
              </div>
              <div className="rounded-xl border border-zinc-900 bg-black p-3">
                <p className="text-xs font-light text-white/55">{t.metrics_reviews_total}</p>
                <p className="text-lg sm:text-xl font-black text-white">{metrics.totalReviews}</p>
              </div>
              <div className="rounded-xl border border-zinc-900 bg-black p-3">
                <p className="text-xs font-light text-white/55">{t.metrics_cards_total}</p>
                <p className="text-lg sm:text-xl font-black text-white">{metrics.cardCount}</p>
              </div>
              <div className="rounded-xl border border-zinc-900 bg-black p-3">
                <p className="text-xs font-light text-white/55">{t.metrics_reviewed_cards}</p>
                <p className="text-lg sm:text-xl font-black text-white">{metrics.reviewedCardCount}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-zinc-900 bg-black p-3">
              <p className="text-xs font-light text-white/55 mb-2">{t.metrics_rating_distribution}</p>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((rating) => (
                  <div key={rating} className="rounded-lg border border-zinc-900 bg-black px-2 py-2 text-center">
                    <p className="text-xs font-light text-white/50">{rating}</p>
                    <p className="text-sm font-black text-white">{metrics.ratingCounts[rating as 1 | 2 | 3 | 4]}</p>
                    <p className="mt-1 text-[10px] leading-tight text-white/45">{t.metrics_last_pressed}</p>
                    <p className="text-[10px] leading-tight text-white/65">{formatMetricTimestamp(metrics.lastRatingAt[rating as 1 | 2 | 3 | 4])}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
