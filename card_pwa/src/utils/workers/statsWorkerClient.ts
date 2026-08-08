/**
 * AI_CONTEXT: Web-worker utility for stats Worker Client; moves heavy parsing, import, sync, or stats work off the UI thread.
 */
import type { CardRecord, ReviewRecord } from '../../db'
import { createWorker } from './workerPool'
import { buildHeatmap, calculateStreak, forecastDue, type HeatmapBucket, type StreakStats } from '../stats/aggregate'

type HeatmapRequest = {
  type: 'heatmap'
  profileId?: string
  reviews: ReviewRecord[]
  year: number
}

type StreakRequest = {
  type: 'streak'
  profileId?: string
  reviews: ReviewRecord[]
  nowMs?: number
  nextDayStartsAt?: number
}

type ForecastRequest = {
  type: 'forecast'
  profileId?: string
  cards: CardRecord[]
  days: number
  nowMs?: number
}

type StatsRequest = HeatmapRequest | StreakRequest | ForecastRequest

type StatsResponse = HeatmapBucket[] | StreakStats | number[]

const statsWorker = createWorker<StatsRequest, StatsResponse>(
  () => new Worker(new URL('./stats.worker.ts', import.meta.url), { type: 'module' }),
  (payload) => {
    if (payload.type === 'heatmap') return buildHeatmap(payload.reviews, payload.year)
    if (payload.type === 'streak') return calculateStreak(payload.reviews, payload.nowMs, payload.nextDayStartsAt)
    return forecastDue(payload.cards, payload.days, payload.nowMs)
  },
)

export async function runStatsHeatmap(payload: HeatmapRequest): Promise<HeatmapBucket[]> {
  return statsWorker.run(payload) as Promise<HeatmapBucket[]>
}

export async function runStatsStreak(payload: StreakRequest): Promise<StreakStats> {
  return statsWorker.run(payload) as Promise<StreakStats>
}

export async function runStatsForecast(payload: ForecastRequest): Promise<number[]> {
  return statsWorker.run(payload) as Promise<number[]>
}
