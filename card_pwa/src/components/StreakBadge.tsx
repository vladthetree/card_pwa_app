/**
 * AI_CONTEXT: Reusable React component for streak Badge; contributes to the card-learning UI and shared app interactions.
 */
import { Flame } from 'lucide-react'
import { STRINGS, useSettings } from '../contexts/SettingsContext'
import { useStreak } from '../hooks/useStreak'

interface Props {
  compact?: boolean
  iconButton?: boolean
}

export default function StreakBadge({ compact = false, iconButton = false }: Props) {
  const { settings } = useSettings()
  const t = STRINGS[settings.language]
  const { days, atRisk } = useStreak(settings.nextDayStartsAt)

  if (days === 0 && !atRisk) return null

  // Aktiver Streak in Brand-Orange (positive Metrik); Warnfarbe nur bei Risiko.
  const colorClass = atRisk
    ? 'border-amber-500/35 bg-amber-500/10 text-amber-300'
    : 'border-[--brand-primary-50] bg-[--brand-primary-12] text-[--brand-primary] streak-badge-active'

  const title = atRisk ? t.streak_at_risk_hint : `${days} ${t.streak_days}`

  return (
    <div
      className={`inline-flex items-center rounded-ds-xl border font-mono text-xs tracking-wide ${
        iconButton
          ? 'h-11 w-11 flex-shrink-0 justify-center gap-1 p-0'
          : 'gap-1.5 px-2 py-1'
      } ${colorClass}`}
      title={title}
      aria-label={title}
    >
      <Flame size={iconButton ? 14 : compact ? 12 : 13} strokeWidth={1.5} className={atRisk ? '' : 'streak-flame-glow'} aria-hidden="true" />
      <span className="font-bold tabular-nums">{days}</span>
      {!compact && <span className="opacity-70 text-[10px] uppercase">{t.streak_days}</span>}
    </div>
  )
}
