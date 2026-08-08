/**
 * AI_CONTEXT: Reusable React component for daily Goal Ring; contributes to the card-learning UI and shared app interactions.
 */
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

  const { pct, ringColor, reached } = useMemo(() => {
    const safeGoal = goal > 0 ? goal : 0
    const raw = safeGoal > 0 ? reviewedToday / safeGoal : 0
    const clamped = Math.max(0, Math.min(1, raw))
    const done = safeGoal > 0 && reviewedToday >= safeGoal
    // Fortschritt signalisiert allein der Ring; die Ziffer bleibt in
    // Theme-Ink, damit sie auf hellen wie dunklen Flächen lesbar ist.
    let ring = 'var(--brand-primary)'
    if (done) {
      ring = '#059669'
    } else if (clamped >= 0.66) {
      ring = '#10b981'
    } else if (clamped >= 0.33) {
      ring = '#f59e0b'
    }
    return { pct: clamped, ringColor: ring, reached: done }
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
          stroke="var(--ds-border)"
          strokeOpacity={0.15}
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
          className="font-mono font-bold tabular-nums text-ds-fg"
          fontSize={size * 0.32}
          fill="currentColor"
        >
          {reviewedToday}
        </text>
      </svg>
      {showLabel && (
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] font-mono uppercase tracking-wider text-ds-muted">{t.daily_goal_label}</span>
          <span className="text-xs font-bold tabular-nums text-ds-fg">{progressText}</span>
        </div>
      )}
    </div>
  )
}
