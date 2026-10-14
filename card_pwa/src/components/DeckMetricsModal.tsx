/**
 * AI_CONTEXT: Reusable React component for deck Metrics Modal; contributes to the card-learning UI and shared app interactions.
 */
import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { getDeckMetricsSnapshot } from '../db/queries'
import { STRINGS } from '../contexts/SettingsContext'
import { Dialog } from '../ui/overlays/Dialog'
import { formatDeckName } from '../utils/cardTextParser'
import { resolveDateLocale } from '../utils/time'
import type { Deck, MetricsPeriod, DeckMetricsSnapshot } from '../types'

export function DeckMetricsModal({ deck, language, onClose }: { deck: Deck; language: 'de' | 'en'; onClose: () => void }) {
  const t = STRINGS[language]
  const [period, setPeriod] = useState<MetricsPeriod>('all')
  const [metrics, setMetrics] = useState<DeckMetricsSnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  const formatMetricTimestamp = (timestamp: number | null) => {
    if (!timestamp) return t.metrics_never_pressed
    return new Intl.DateTimeFormat(resolveDateLocale(language), {
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
  const ratingSegments = metrics
    ? ([
        { rating: 1 as const, label: t.rating_again, color: 'bg-rose-500' },
        { rating: 2 as const, label: t.rating_hard, color: 'bg-amber-400' },
        { rating: 3 as const, label: t.rating_good, color: 'bg-sky-400' },
        { rating: 4 as const, label: t.rating_easy, color: 'bg-emerald-400' },
      ]).map(segment => ({
        ...segment,
        count: metrics.ratingCounts[segment.rating],
        percent: metrics.totalReviews > 0
          ? (metrics.ratingCounts[segment.rating] / metrics.totalReviews) * 100
          : 0,
      }))
    : []

  const trendIcon = metrics && metrics.trendDelta !== 0
    ? metrics.trendDelta > 0
      ? <TrendingUp size={14} strokeWidth={1.5} className="text-emerald-300" />
      : <TrendingDown size={14} strokeWidth={1.5} className="text-rose-300" />
    : <Minus size={14} strokeWidth={1.5} className="text-white/55" />

  return (
    <Dialog
      title={t.metrics_success_rate}
      subtitle={formatDeckName(deck.name)}
      closeLabel={language === 'de' ? 'Metriken schließen' : 'Close metrics'}
      onClose={() => onClose()}
      size="lg"
      className="overflow-y-auto p-4 sm:p-5"
    >
        <div className="mt-1 inline-flex w-full overflow-hidden rounded-ds-xl border border-[#18181b] bg-[#0c0c0c] transition-all duration-300 ease-out sm:w-auto">
          <button
            type="button"
            onClick={() => setPeriod('all')}
            className={`flex-1 px-3 py-2 text-xs sm:text-sm transition-all duration-300 ease-out active:scale-95 ${period === 'all' ? 'bg-white text-black' : 'text-white/75 hover:text-white hover:bg-[#111]'}`}
          >
            {t.metrics_period_all}
          </button>
          <button
            type="button"
            onClick={() => setPeriod('7d')}
            className={`flex-1 px-3 py-2 text-xs sm:text-sm transition-all duration-300 ease-out active:scale-95 ${period === '7d' ? 'bg-white text-black' : 'text-white/75 hover:text-white hover:bg-[#111]'}`}
          >
            {t.metrics_period_7d}
          </button>
        </div>

        {loading || !metrics ? (
          <div className="mt-5 h-36 rounded-ds-xl border border-[#18181b] bg-[#0c0c0c] animate-pulse" />
        ) : (
          <>
            <div className="mt-5 rounded-ds-2xl border border-[#18181b] bg-[#0c0c0c] p-5 shadow-card transition-all duration-300 ease-out sm:p-6">
              <p className="text-xs uppercase tracking-wide text-emerald-100/70">{t.metrics_success_rate}</p>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <p className="text-6xl leading-none font-black text-emerald-400 sm:text-8xl">{metrics.successRate}%</p>
                <p className="pb-1 text-xs font-light text-emerald-200/70 sm:pb-2 sm:text-sm">{t.metrics_reviews_total}: {metrics.totalReviews}</p>
              </div>
              {!hasReviews && (
                <p className="mt-2 text-xs sm:text-sm text-emerald-100/70">{t.metrics_empty_with_cards.replace('{count}', String(metrics.cardCount))}</p>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="rounded-ds-xl border border-[#18181b] bg-[#0a0a0a] p-3">
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
              <div className="rounded-ds-xl border border-[#18181b] bg-[#0a0a0a] p-3">
                <p className="text-xs font-light text-white/55">{t.metrics_reviews_total}</p>
                <p className="text-lg sm:text-xl font-black text-white">{metrics.totalReviews}</p>
              </div>
              <div className="rounded-ds-xl border border-[#18181b] bg-[#0a0a0a] p-3">
                <p className="text-xs font-light text-white/55">{t.metrics_cards_total}</p>
                <p className="text-lg sm:text-xl font-black text-white">{metrics.cardCount}</p>
              </div>
              <div className="rounded-ds-xl border border-[#18181b] bg-[#0a0a0a] p-3">
                <p className="text-xs font-light text-white/55">{t.metrics_reviewed_cards}</p>
                <p className="text-lg sm:text-xl font-black text-white">{metrics.reviewedCardCount}</p>
              </div>
            </div>

            <div className="mt-4 rounded-ds-xl border border-[#18181b] bg-[#0a0a0a] p-3">
              <p className="text-xs font-light text-white/55 mb-2">{t.metrics_rating_distribution}</p>
              {hasReviews && (
                <div className="mb-3">
                  <div
                    className="flex h-8 w-full overflow-hidden rounded-[6px] border border-white/10 bg-[#070707]"
                    role="img"
                    aria-label={ratingSegments.map(segment => `${segment.label}: ${segment.count}`).join(', ')}
                    data-testid="rating-distribution-bar"
                  >
                    {ratingSegments.filter(segment => segment.count > 0).map(segment => (
                      <div
                        key={segment.rating}
                        className={`flex min-w-0 items-center justify-center ${segment.color} text-[10px] font-black text-black`}
                        style={{ width: `${segment.percent}%` }}
                        title={`${segment.label}: ${segment.count} (${Math.round(segment.percent)}%)`}
                        data-rating={segment.rating}
                      >
                        {segment.percent >= 12 ? `${Math.round(segment.percent)}%` : null}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4">
                    {ratingSegments.map(segment => (
                      <div key={segment.rating} className="flex min-w-0 items-center gap-1.5 text-[10px] text-white/60">
                        <span className={`h-2 w-2 shrink-0 rounded-sm ${segment.color}`} aria-hidden="true" />
                        <span className="truncate">{segment.label}</span>
                        <span className="ml-auto font-mono tabular-nums text-white/85">{Math.round(segment.percent)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[1, 2, 3, 4].map((rating) => (
                  <div key={rating} className="rounded-[6px] border border-[#18181b] bg-[#0c0c0c] px-2 py-2 text-center">
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
    </Dialog>
  )
}
