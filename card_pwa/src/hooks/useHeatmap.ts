import { useEffect, useState } from 'react'
import { db } from '../db'
import { REVIEW_UPDATED_EVENT } from '../constants/appIdentity'
import { runStatsHeatmap, runStatsStreak } from '../utils/workers/statsWorkerClient'

export interface HeatmapEntry {
  date: Date
  key: string
  count: number
}

interface HeatmapState {
  entries: HeatmapEntry[]
  streak: { days: number; atRisk: boolean }
  loading: boolean
}

function startOfDayMs(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function useHeatmap(profileId: string, year: number): HeatmapState {
  const [state, setState] = useState<HeatmapState>({
    entries: [],
    streak: { days: 0, atRisk: false },
    loading: true,
  })

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const start = new Date(year, 0, 1)
        const end = new Date(year, 11, 31)
        const fromMs = startOfDayMs(start)

        const baseDays: HeatmapEntry[] = []
        const cursor = new Date(start)
        while (cursor <= end) {
          const d = new Date(cursor)
          baseDays.push({ date: d, key: dateKey(d), count: 0 })
          cursor.setDate(cursor.getDate() + 1)
        }

        const rows = await db.reviews.where('timestamp').aboveOrEqual(fromMs).toArray()
        const [heatmapBuckets, streakStats] = await Promise.all([
          runStatsHeatmap({
            type: 'heatmap',
            profileId,
            reviews: rows,
            year,
          }),
          runStatsStreak({
            type: 'streak',
            profileId,
            reviews: rows,
            nowMs: Date.now(),
          }),
        ])

        const byDay = new Map(baseDays.map(d => [d.key, d]))
        for (const bucket of heatmapBuckets) {
          const key = dateKey(new Date(bucket.dayStartMs))
          const hit = byDay.get(key)
          if (hit) hit.count = bucket.count
        }

        if (!cancelled) {
          setState({
            entries: baseDays,
            streak: { days: streakStats.current, atRisk: streakStats.atRisk },
            loading: false,
          })
        }
      } catch {
        if (!cancelled) {
          setState({ entries: [], streak: { days: 0, atRisk: false }, loading: false })
        }
      }
    }

    void load()

    const onReviewUpdated = () => void load()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }

    window.addEventListener(REVIEW_UPDATED_EVENT, onReviewUpdated)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      window.removeEventListener(REVIEW_UPDATED_EVENT, onReviewUpdated)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [profileId, year])

  return state
}
