import { useMemo, useState } from 'react'
import { STRINGS, useSettings } from '../contexts/SettingsContext'
import { useTheme } from '../contexts/ThemeContext'
import { useHeatmap } from '../hooks/useHeatmap'

// Hex colour → [r, g, b]
function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [155, 93, 229]
}

interface Props {
  year?: number
}

interface HeatmapDay {
  date: Date
  key: string
  count: number
}

interface MonthGrid {
  month: number
  label: string
  weeks: Array<Array<HeatmapDay | null>>
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function startOfDayMs(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function formatTooltip(language: 'de' | 'en', day: HeatmapDay): string {
  const formatted = new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(day.date)

  if (language === 'de') {
    return `${day.count} Review${day.count === 1 ? '' : 's'} am ${formatted}`
  }

  return `${day.count} review${day.count === 1 ? '' : 's'} on ${formatted}`
}

export default function ReviewHeatmap({ year }: Props) {
  const { settings } = useSettings()
  const { theme } = useTheme()
  const t = STRINGS[settings.language]
  const [showFullYear, setShowFullYear] = useState(false)

  const activeYear = year ?? new Date().getFullYear()
  const { entries, streak, loading } = useHeatmap('default', activeYear)

  const maxCount = useMemo(() => {
    if (!entries.length) return 0
    return entries.reduce((m, d) => Math.max(m, d.count), 0)
  }, [entries])

  const todayStartMs = useMemo(() => startOfDayMs(new Date()), [])

  const countsByDay = useMemo(() => {
    const map = new Map<string, number>()
    for (const entry of entries) map.set(entry.key, entry.count)
    return map
  }, [entries])

  const monthLabelFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(settings.language === 'de' ? 'de-DE' : 'en-US', {
        month: 'long',
      }),
    [settings.language]
  )

  const buildMonthGrid = (targetYear: number, month: number): MonthGrid => {
    const firstDay = new Date(targetYear, month, 1)
    const lastDay = new Date(targetYear, month + 1, 0)
    const days: HeatmapDay[] = []

    const cursor = new Date(firstDay)
    while (cursor <= lastDay) {
      const d = new Date(cursor)
      const key = dateKey(d)
      days.push({ date: d, key, count: countsByDay.get(key) ?? 0 })
      cursor.setDate(cursor.getDate() + 1)
    }

    const mondayIndex = (firstDay.getDay() + 6) % 7
    const padded: Array<HeatmapDay | null> = [...Array(mondayIndex).fill(null), ...days]
    const weeks: Array<Array<HeatmapDay | null>> = []
    for (let i = 0; i < padded.length; i += 7) {
      const week = padded.slice(i, i + 7)
      while (week.length < 7) week.push(null)
      weeks.push(week)
    }

    return {
      month,
      label: monthLabelFormatter.format(firstDay),
      weeks,
    }
  }

  const allMonths = useMemo(() => {
    const result: MonthGrid[] = []
    for (let month = 0; month < 12; month += 1) {
      result.push(buildMonthGrid(activeYear, month))
    }
    return result
  }, [activeYear, countsByDay, monthLabelFormatter])

  const focusedMonths = useMemo(() => {
    const now = new Date()
    const currentMonthIndex = activeYear === now.getFullYear() ? now.getMonth() : 0
    const prevMonthIndex = currentMonthIndex - 1

    return {
      previous: prevMonthIndex >= 0 ? buildMonthGrid(activeYear, prevMonthIndex) : null,
      current: buildMonthGrid(activeYear, currentMonthIndex),
    }
  }, [activeYear, countsByDay, monthLabelFormatter])

  // ── Theme-aware cell colours ──────────────────────────────────────────────
  const [pr, pg, pb] = hexToRgb(theme.primary)
  const [sr, sg, sb] = hexToRgb(theme.secondary)
  const [ar, ag, ab] = hexToRgb(theme.accent)

  const neonLevels: React.CSSProperties[] = [
    { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', boxShadow: 'none' },
    { backgroundColor: 'var(--brand-primary-20)', borderColor: 'var(--brand-primary-25)', boxShadow: 'none' },
    { backgroundColor: 'var(--brand-primary-50)', borderColor: 'var(--brand-primary-50)', boxShadow: 'none' },
    { backgroundColor: 'var(--brand-primary-80)', borderColor: 'var(--brand-primary-80)', boxShadow: 'none' },
    { backgroundColor: 'var(--brand-primary)', borderColor: 'var(--brand-primary)', boxShadow: 'none' },
  ]

  const getCellStyle = (count: number, isFuture: boolean): React.CSSProperties => {
    if (isFuture) return { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)', boxShadow: 'none', opacity: 0.35 }
    if (count <= 0 || maxCount === 0) return neonLevels[0]
    const ratio = count / maxCount
    if (ratio < 0.2)  return neonLevels[1]
    if (ratio < 0.45) return neonLevels[2]
    if (ratio < 0.72) return neonLevels[3]
    return neonLevels[4]
  }

  const CELL_H = 13
  const CELL_H_SM = 9
  const GAP = 3

  const DAY_LABELS: Record<string, string[]> = {
    de: ['Mo', '', 'Mi', '', 'Fr', '', 'So'],
    en: ['Mo', '', 'We', '', 'Fr', '', 'Su'],
  }

  // Full-width GitHub-style month (focus view)
  const renderMonthWide = (month: MonthGrid) => {
    const dayLabels = DAY_LABELS[settings.language] ?? DAY_LABELS['en']
    return (
      <div style={{ width: '100%' }}>
        {/* Month name */}
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: '0.58rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: theme.primary,
            textShadow: `0 0 8px rgba(${pr},${pg},${pb},0.5)`,
            marginBottom: '6px',
          }}
        >
          {month.label}
        </div>

        <div style={{ display: 'flex', gap: '5px', width: '100%' }}>
          {/* Day-of-week labels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: GAP, width: '16px', flexShrink: 0 }}>
            {dayLabels.map((lbl, i) => (
              <div
                key={i}
                style={{
                  height: CELL_H,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  fontFamily: 'monospace',
                  fontSize: '0.40rem',
                  letterSpacing: '0.04em',
                  color: i >= 5 ? `rgba(${sr},${sg},${sb},0.5)` : `rgba(${pr},${pg},${pb},0.35)`,
                  lineHeight: 1,
                }}
              >
                {lbl}
              </div>
            ))}
          </div>

          {/* Week columns */}
          <div style={{ display: 'flex', gap: GAP, flex: 1 }}>
            {month.weeks.map((week, wi) => (
              <div key={wi} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: GAP }}>
                {week.map((day, di) => {
                  if (!day) {
                    return (
                      <div
                        key={`e-${wi}-${di}`}
                        style={{
                          height: CELL_H,
                          width: '100%',
                          borderRadius: '3px',
                          border: `1px solid rgba(${pr},${pg},${pb},0.05)`,
                        }}
                      />
                    )
                  }
                  const isFuture = startOfDayMs(day.date) > todayStartMs
                  return (
                    <div
                      key={day.key}
                      title={formatTooltip(settings.language, day)}
                      style={{
                        height: CELL_H,
                        width: '100%',
                        borderRadius: '3px',
                        border: '1px solid',
                        cursor: 'default',
                        ...getCellStyle(day.count, isFuture),
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Compact month for year overview
  const renderMonthCompact = (month: MonthGrid) => (
    <div
      key={`month-grid-${month.month}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '6px',
        padding: '6px 8px 8px',
        background: 'var(--theme-surface)',
        border: '1px solid var(--theme-border)',
      }}
    >
      <div
        style={{
          fontFamily: 'monospace',
          fontSize: '0.46rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '5px',
          color: `rgba(${pr},${pg},${pb},0.55)`,
        }}
      >
        {month.label}
      </div>
      <div style={{ display: 'flex', gap: '2px', flex: 1 }}>
        {month.weeks.map((week, wi) => (
          <div key={wi} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {week.map((day, di) => {
              if (!day) {
                return (
                  <div
                    key={`e-${wi}-${di}`}
                    style={{ height: CELL_H_SM, width: '100%', borderRadius: '2px', border: `1px solid rgba(${pr},${pg},${pb},0.05)` }}
                  />
                )
              }
              const isFuture = startOfDayMs(day.date) > todayStartMs
              return (
                <div
                  key={day.key}
                  title={formatTooltip(settings.language, day)}
                  style={{
                    height: CELL_H_SM,
                    width: '100%',
                    borderRadius: '2px',
                    border: '1px solid',
                    cursor: 'default',
                    ...getCellStyle(day.count, isFuture),
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--theme-surface)',
        border: '1px solid var(--theme-border)',
        boxShadow: `0 0 30px rgba(${pr},${pg},${pb},0.06), 0 0 60px rgba(${sr},${sg},${sb},0.04)`,
        borderRadius: '14px',
        padding: '10px 12px 12px',
      }}
    >
      {/* Scanline overlay */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '14px',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '0.70rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: theme.primary,
              textShadow: `0 0 10px rgba(${pr},${pg},${pb},0.65)`,
            }}
          >
            {t.heatmap_title}
          </span>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '0.50rem',
              letterSpacing: '0.06em',
              color: theme.textMuted ?? 'var(--theme-text-muted)',
              textTransform: 'uppercase',
            }}
          >
            {activeYear}
          </span>
          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '2px' }}>
            {neonLevels.map((s, idx) => (
              <span
                key={idx}
                style={{ width: '8px', height: '8px', borderRadius: '2px', border: '1px solid', display: 'inline-block', ...s }}
              />
            ))}
          </div>
          <div
            title={streak.atRisk ? t.heatmap_streak_risk : undefined}
            style={{
              marginLeft: '6px',
              fontFamily: 'monospace',
              fontSize: '0.52rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: streak.atRisk ? `rgba(${ar},${ag},${ab},0.95)` : `rgba(${sr},${sg},${sb},0.9)`,
              textShadow: streak.days > 0 ? `0 0 8px rgba(${sr},${sg},${sb},0.35)` : 'none',
            }}
          >
            {'🔥 '}
            {t.heatmap_streak_label}: {streak.days}
          </div>
        </div>
        <button
          onClick={() => setShowFullYear(v => !v)}
          title={showFullYear ? t.heatmap_focus_view : t.heatmap_year_view}
          style={{
            fontFamily: 'monospace',
            fontSize: '0.52rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: theme.primary,
            background: `rgba(${pr},${pg},${pb},0.06)`,
            border: `1px solid rgba(${pr},${pg},${pb},0.30)`,
            borderRadius: '4px',
            padding: '3px 8px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {showFullYear ? t.heatmap_focus_view : t.heatmap_year_view}
        </button>
      </div>

      {/* Content */}
      <div style={{ position: 'relative' }}>
        {loading ? (
          <div style={{ height: '110px', borderRadius: '7px', background: `rgba(${pr},${pg},${pb},0.05)` }} />
        ) : entries.every(d => d.count === 0) ? (
          <p
            style={{
              fontFamily: 'monospace',
              fontSize: '0.62rem',
              color: theme.textMuted ?? 'var(--theme-text-muted)',
              letterSpacing: '0.06em',
              margin: 0,
            }}
          >
            {t.heatmap_empty}
          </p>
        ) : showFullYear ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '8px',
            }}
          >
            {allMonths.map(month => renderMonthCompact(month))}
          </div>
        ) : (
          renderMonthWide(focusedMonths.current)
        )}
      </div>
    </div>
  )
}
