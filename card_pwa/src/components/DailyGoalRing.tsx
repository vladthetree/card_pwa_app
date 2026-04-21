import { useMemo } from 'react'
import { STRINGS, useSettings } from '../contexts/SettingsContext'
import { useStreak } from '../hooks/useStreak'

interface Props {
  size?: number
  strokeWidth?: number
  showLabel?: boolean
}

export default function DailyGoalRing({ size = 44, strokeWidth = 4, showLabel = false }: Props) {
  const { settings } = useSettings()
  const t = STRINGS[settings.language]
  const { reviewedToday } = useStreak()
  const goal = settings.dailyGoal

  const { pct, ringColor, labelColor, reached } = useMemo(() => {
    const safeGoal = goal > 0 ? goal : 0
    const raw = safeGoal > 0 ? reviewedToday / safeGoal : 0
    const clamped = Math.max(0, Math.min(1, raw))
    const done = safeGoal > 0 && reviewedToday >= safeGoal
    let ring = 'var(--brand-primary)'
    let label = 'text-white/75'
    if (done) {
      ring = '#10b981'
      label = 'text-emerald-300'
    } else if (clamped >= 0.66) {
      ring = '#34d399'
      label = 'text-emerald-200'
    } else if (clamped >= 0.33) {
      ring = '#fbbf24'
      label = 'text-amber-200'
    } else {
      ring = 'var(--brand-primary)'
      label = 'text-white/75'
    }
    return { pct: clamped, ringColor: ring, labelColor: label, reached: done }
  }, [reviewedToday, goal])

  if (goal <= 0) return null

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct)

  const progressText = t.daily_goal_reviewed
    .replace('{count}', String(reviewedToday))
    .replace('{goal}', String(goal))
  const ariaLabel = reached ? t.daily_goal_reached : `${t.daily_goal_label}: ${progressText}`

  return (
    <div
      className="inline-flex items-center gap-2"
      role="img"
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={reached ? 'daily-goal-ring-reached' : ''}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 520ms cubic-bezier(0.22, 1, 0.36, 1), stroke 220ms ease' }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className={`font-mono font-bold tabular-nums ${labelColor}`}
          fontSize={size * 0.32}
          fill="currentColor"
        >
          {reviewedToday}
        </text>
      </svg>
      {showLabel && (
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/55">{t.daily_goal_label}</span>
          <span className={`text-xs font-bold tabular-nums ${labelColor}`}>{progressText}</span>
        </div>
      )}
    </div>
  )
}
