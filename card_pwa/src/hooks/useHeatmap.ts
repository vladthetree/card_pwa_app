/**
 * AI_CONTEXT: React hook for use Heatmap; encapsulates browser, persistence, sync, layout, or learning state for UI components.
 */
import { useEffect, useState } from 'react'
import { db } from '../db'
import { listReviewsSince } from '../db/queries'
import { REVIEW_UPDATED_EVENT } from '../constants/appIdentity'
import { runStatsHeatmap, runStatsStreak } from '../utils/workers/statsWorkerClient'
import { getDayStartMs } from '../utils/time'

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
    // Signatur der zuletzt geladenen Reviews (Anzahl + jüngster Timestamp):
    // erlaubt beim Sichtbarwerden eine billige indizierte Probe statt jedes Mal
    // alle Jahres-Reviews zu laden und beide Worker-Läufe neu zu starten.
    let lastLoadedSignature: string | null = null

    const computeSignature = async (fromMs: number): Promise<string> => {
      const range = db.reviews.where('timestamp').aboveOrEqual(fromMs)
      const [count, latest] = await Promise.all([range.count(), range.last()])
      return `${count}:${latest?.timestamp ?? 0}`
    }

    const load = async () => {
      try {
        const start = new Date(year, 0, 1)
        const end = new Date(year, 11, 31)
        const fromMs = getDayStartMs(start.getTime())

        const baseDays: HeatmapEntry[] = []
        const cursor = new Date(start)
        while (cursor <= end) {
          const d = new Date(cursor)
          baseDays.push({ date: d, key: dateKey(d), count: 0 })
          cursor.setDate(cursor.getDate() + 1)
        }

        const rows = await listReviewsSince(fromMs)
        lastLoadedSignature = `${rows.length}:${rows.reduce((max, row) => Math.max(max, row.timestamp), 0)}`
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
      if (document.visibilityState !== 'visible') return
      // Nur neu laden, wenn seit dem letzten Load Reviews dazukamen/wegfielen
      // (z. B. via Sync im Hintergrund) — sonst ist der Reload reine Doppelarbeit.
      void (async () => {
        try {
          const fromMs = getDayStartMs(new Date(year, 0, 1).getTime())
          const signature = await computeSignature(fromMs)
          if (!cancelled && signature !== lastLoadedSignature) {
            void load()
          }
        } catch {
          if (!cancelled) void load()
        }
      })()
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
