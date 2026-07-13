/**
 * AI_CONTEXT: React hook for use Day Start Ms; encapsulates browser, persistence, sync, layout, or learning state for UI components.
 */
import { useEffect, useState } from 'react'
import { DAY_MS, getDayStartMs } from '../utils/time'

/**
 * Beginn des aktuellen Lerntags (epoch ms), auch offline aktuell: ein Timer
 * feuert auf der nächsten Tagesgrenze und beim Sichtbarwerden wird nachgerechnet.
 * Damit setzen Daily Quests, Stats und das Heute-Paket an einem neuen
 * Kalendertag zurück, ohne dass ein Sync oder DB-Write nötig wäre.
 */
export function useDayStartMs(nextDayStartsAt = 0): number {
  const [dayStartMs, setDayStartMs] = useState(() => getDayStartMs(Date.now(), nextDayStartsAt))

  useEffect(() => {
    let timer: number | null = null

    const refresh = () => {
      // Gleicher Wert → React überspringt das Re-Render (Bail-out).
      setDayStartMs(getDayStartMs(Date.now(), nextDayStartsAt))
    }
    const scheduleNextBoundary = () => {
      const now = Date.now()
      const nextBoundaryMs = getDayStartMs(now, nextDayStartsAt) + DAY_MS
      // +1 s Puffer gegen Timer, die exakt auf der Grenze zu früh feuern.
      timer = window.setTimeout(() => {
        refresh()
        scheduleNextBoundary()
      }, Math.max(1000, nextBoundaryMs - now + 1000))
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    refresh()
    scheduleNextBoundary()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      if (timer !== null) window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [nextDayStartsAt])

  return dayStartMs
}
