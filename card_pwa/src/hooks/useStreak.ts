import { useEffect, useState } from 'react'
import { db } from '../db'
import { REVIEW_UPDATED_EVENT } from '../constants/appIdentity'

interface StreakState {
  days: number
  atRisk: boolean
  reviewedToday: number
}

function startOfDayMs(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function useStreak(): StreakState {
  const [state, setState] = useState<StreakState>({ days: 0, atRisk: false, reviewedToday: 0 })

  useEffect(() => {
    let cancelled = false

    const compute = async () => {
      const now = new Date()
      const todayStart = startOfDayMs(now)
      const lookbackMs = todayStart - 400 * 86_400_000

      try {
        const rows = await db.reviews.where('timestamp').aboveOrEqual(lookbackMs).toArray()
        const byDay = new Map<number, number>()
        for (const row of rows) {
          const d = new Date(row.timestamp)
          const k = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
          byDay.set(k, (byDay.get(k) ?? 0) + 1)
        }

        const reviewedToday = byDay.get(todayStart) ?? 0
        const hasToday = reviewedToday > 0
        let cursor = hasToday ? todayStart : todayStart - 86_400_000
        let days = 0
        while ((byDay.get(cursor) ?? 0) > 0) {
          days += 1
          cursor -= 86_400_000
        }

        if (!cancelled) {
          setState({ days, atRisk: !hasToday && days > 0, reviewedToday })
        }
      } catch {
        if (!cancelled) setState({ days: 0, atRisk: false, reviewedToday: 0 })
      }
    }

    void compute()

    const onReviewUpdated = () => void compute()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void compute()
    }

    window.addEventListener(REVIEW_UPDATED_EVENT, onReviewUpdated)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      window.removeEventListener(REVIEW_UPDATED_EVENT, onReviewUpdated)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return state
}
