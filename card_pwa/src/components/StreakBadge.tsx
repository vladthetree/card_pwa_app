import { Flame } from 'lucide-react'
import { STRINGS, useSettings } from '../contexts/SettingsContext'
import { useStreak } from '../hooks/useStreak'

interface Props {
  compact?: boolean
}

export default function StreakBadge({ compact = false }: Props) {
  const { settings } = useSettings()
  const t = STRINGS[settings.language]
  const { days, atRisk } = useStreak()

  if (days === 0 && !atRisk) return null

  const colorClass = atRisk
    ? 'border-amber-500/35 bg-amber-500/10 text-amber-300'
    : 'border-rose-500/35 bg-rose-500/10 text-rose-300 streak-badge-active'

  const title = atRisk ? t.streak_at_risk_hint : `${days} ${t.streak_days}`

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-2xl border px-2 py-1 font-mono text-xs tracking-wide ${colorClass}`}
      title={title}
      aria-label={title}
    >
      <Flame size={compact ? 12 : 13} className={atRisk ? '' : 'streak-flame-glow'} aria-hidden="true" />
      <span className="font-bold tabular-nums">{days}</span>
      {!compact && <span className="opacity-70 text-[10px] uppercase">{t.streak_days}</span>}
    </div>
  )
}
