import { STRINGS, useSettings } from '../contexts/SettingsContext'
import type { Card } from '../types'

interface Props {
  /** Card metrics to display */
  card: Card
}

/**
 * MetricsCard: Displays Anki learning metrics for a card
 * Shows interval, ease factor, repetitions, lapses, and card type
 */
export default function MetricsCard({ card }: Props) {
  const { settings } = useSettings()
  const t = STRINGS[settings.language]
  const metricLabel = card.algorithm === 'fsrs' ? 'Difficulty' : 'Ease'
  const metricValue = card.algorithm === 'fsrs'
    ? (card.fsrsDifficulty != null ? card.fsrsDifficulty.toFixed(2) : '–')
    : (card.sm2Ease != null ? `${card.sm2Ease.toFixed(2)}×` : '–')

  return (
    <aside className="ds-card p-6 text-sm text-white/80 lg:w-72 flex-shrink-0 transition-all duration-300 ease-out">
      <p className="text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-4">{t.metrics_title}</p>
      <div className="space-y-3 text-sm text-white/80">
        <MetricRow label={t.interval} value={`${card.interval} ${t.days_suffix}`} />
        <MetricRow
          label={metricLabel}
          value={metricValue}
        />
        <MetricRow label={t.repetitions} value={String(card.reps)} />
        <MetricRow label={t.lapses} value={String(card.lapses)} />
        <MetricRow label={t.type} value={localizeType(card.type, t)} />
      </div>
    </aside>
  )
}

/**
 * MetricRow: Displays a single metric label-value pair
 */
function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="font-light">{label}</span>
      <span className="font-black text-white">{value}</span>
    </div>
  )
}

/**
 * Capitalize first letter of string
 */
function localizeType(str: string, t: Record<string, string>): string {
  const key = `type_${str}`
  return t[key] ?? str
}
