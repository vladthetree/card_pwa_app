import { useEffect, useState } from 'react'
import { db } from '../db'
import { REVIEW_UPDATED_EVENT } from '../constants/appIdentity'
import { runStatsStreak } from '../utils/workers/statsWorkerClient'

interface StreakState {
  days: number
  atRisk: boolean
  reviewedToday: number
}

export function useStreak(): StreakState {
  const [state, setState] = useState<StreakState>({ days: 0, atRisk: false, reviewedToday: 0 })

  useEffect(() => {
    let cancelled = false

    const compute = async () => {
      const nowMs = Date.now()
      const today = new Date(nowMs)
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
      const lookbackMs = todayStart - 400 * 86_400_000

      try {
        const rows = await db.reviews.where('timestamp').aboveOrEqual(lookbackMs).toArray()
        const streak = await runStatsStreak({
          type: 'streak',
          profileId: 'default',
          reviews: rows,
          nowMs,
        })

        if (!cancelled) {
          setState({ days: streak.current, atRisk: streak.atRisk, reviewedToday: streak.reviewedToday })
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
