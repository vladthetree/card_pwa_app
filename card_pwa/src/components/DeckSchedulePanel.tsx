import { useEffect, useState } from 'react'
import { BookOpen, Lightbulb, RotateCcw } from 'lucide-react'
import { STRINGS } from '../contexts/SettingsContext'
import type { DeckScheduleOverview } from '../types'

export function DeckSchedulePanel({
  language,
  schedule,
}: {
  language: 'de' | 'en'
  schedule?: DeckScheduleOverview
}) {
  const t = STRINGS[language]
  const [activeInfoKey, setActiveInfoKey] = useState<string | null>(null)

  useEffect(() => {
    if (!activeInfoKey) return

    const timer = window.setTimeout(() => {
      setActiveInfoKey(null)
    }, 3000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [activeInfoKey])
  if (!schedule) {
    return (
      <div className="rounded-xl bg-white/[0.03] p-2 animate-pulse h-[84px]" />
    )
  }

  const rows = [
    { key: 'today', label: t.stats_today, data: schedule.today },
    { key: 'tomorrow', label: t.schedule_tomorrow, data: schedule.tomorrow },
  ] as const

  const headerItems = [
    {
      key: 'due',
      label: t.stats_due,
      icon: BookOpen,
      iconClass: 'text-white/70',
      info: language === 'de'
        ? 'Karten, die heute gemacht werden müssen.'
        : 'Cards that must be completed today.',
    },
    {
      key: 'new',
      label: t.stats_new,
      icon: Lightbulb,
      iconClass: 'text-white/80',
      info: language === 'de'
        ? 'Neue Karten, die noch nicht gelernt wurden.'
        : 'New cards that have not been studied yet.',
    },
    {
      key: 'review',
      label: t.schedule_review,
      icon: RotateCcw,
      iconClass: 'text-zinc-300/80',
      info: language === 'de'
        ? 'Wiederholungskarten zur Festigung des Gelernten.'
        : 'Review cards to reinforce what you learned.',
    },
  ] as const

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-[3.9rem_repeat(3,minmax(1.5rem,1fr))] gap-1.5 sm:grid-cols-[4.5rem_repeat(3,minmax(0,1fr))] sm:gap-2">
        <div />
        {headerItems.map((item) => {
          const Icon = item.icon
          const isInfoOpen = activeInfoKey === item.key
          return (
            <div key={item.key} className="relative flex items-center justify-center gap-1.5 px-1 py-1 sm:px-1.5 sm:py-0.5">
              <Icon className={`h-[18px] w-[18px] sm:h-3.5 sm:w-3.5 ${item.iconClass}`} aria-hidden="true" />
              <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-[0.12em] text-white/50">{item.label}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveInfoKey(prev => (prev === item.key ? null : item.key))
                }}
                onBlur={() => {
                  setActiveInfoKey(prev => (prev === item.key ? null : prev))
                }}
                className="hidden sm:inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] text-[10px] font-semibold text-white/65 hover:text-white hover:border-white/35 transition"
                title={item.info}
                aria-label={`${item.label}: ${item.info}`}
                aria-expanded={isInfoOpen}
              >
                i
              </button>
              {isInfoOpen && (
                <div
                  className="absolute left-1/2 top-[calc(100%+0.35rem)] z-20 w-44 -translate-x-1/2 rounded-md border border-white/15 bg-black px-2.5 py-2 text-[10px] leading-relaxed text-white/80 shadow-lg shadow-black/50"
                  role="tooltip"
                >
                  {item.info}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {rows.map(row => (
        <div key={row.key} className="grid grid-cols-[3.9rem_repeat(3,minmax(1.5rem,1fr))] gap-1.5 sm:grid-cols-[4.5rem_repeat(3,minmax(0,1fr))] sm:gap-2">
          <div className="flex items-center justify-center rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 sm:px-3 sm:py-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-zinc-500 text-center leading-tight sm:tracking-widest">
              {row.label}
            </span>
          </div>
          <div
            className="flex min-h-[2.15rem] items-center justify-center rounded-xl border px-1.5 sm:min-h-[2.55rem] sm:px-2"
            style={{ borderColor: 'var(--brand-primary-25)', background: 'var(--brand-primary-12)' }}
          >
            <p className="text-xl sm:text-3xl font-mono tabular-nums leading-none" style={{ color: 'var(--brand-primary)' }}>{row.data.total}</p>
          </div>
          <div
            className="flex min-h-[2.15rem] items-center justify-center rounded-xl border px-1.5 sm:min-h-[2.55rem] sm:px-2"
            style={{ borderColor: 'var(--brand-secondary-25)', background: 'var(--brand-secondary-12)' }}
          >
            <p className="text-xl sm:text-3xl font-mono tabular-nums leading-none" style={{ color: 'var(--brand-secondary)' }}>{row.data.new}</p>
          </div>
          <div className="flex min-h-[2.15rem] items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50 px-1.5 sm:min-h-[2.55rem] sm:px-2">
            <p className="text-xl sm:text-3xl font-mono text-zinc-300 tabular-nums leading-none">{row.data.review}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
