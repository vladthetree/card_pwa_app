import type { CardRecord, ReviewRecord } from '../../db'

export interface HeatmapBucket {
  dayStartMs: number
  count: number
}

export interface StreakStats {
  current: number
  longest: number
  atRisk: boolean
  reviewedToday: number
}

function startOfDayMs(ts: number): number {
  const d = new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export function buildHeatmap(reviews: ReviewRecord[], year: number): HeatmapBucket[] {
  const start = new Date(year, 0, 1).getTime()
  const end = new Date(year + 1, 0, 1).getTime()
  const counts = new Map<number, number>()

  for (const review of reviews) {
    if (!Number.isFinite(review.timestamp)) continue
    const timestamp = Number(review.timestamp)
    if (timestamp < start || timestamp >= end) continue
    const key = startOfDayMs(timestamp)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([dayStartMs, count]) => ({ dayStartMs, count }))
    .sort((a, b) => a.dayStartMs - b.dayStartMs)
}

export function calculateStreak(reviews: ReviewRecord[], nowMs = Date.now()): StreakStats {
  const byDay = new Map<number, number>()
  for (const review of reviews) {
    if (!Number.isFinite(review.timestamp)) continue
    const key = startOfDayMs(Number(review.timestamp))
    byDay.set(key, (byDay.get(key) ?? 0) + 1)
  }

  const todayStart = startOfDayMs(nowMs)
  const reviewedToday = byDay.get(todayStart) ?? 0
  const hasToday = reviewedToday > 0

  let current = 0
  let cursor = hasToday ? todayStart : todayStart - 86_400_000
  while ((byDay.get(cursor) ?? 0) > 0) {
    current += 1
    cursor -= 86_400_000
  }

  const sortedDays = Array.from(byDay.keys()).sort((a, b) => a - b)
  let longest = 0
  let run = 0
  let prev: number | null = null
  for (const day of sortedDays) {
    if (prev !== null && day === prev + 86_400_000) {
      run += 1
    } else {
      run = 1
    }
    longest = Math.max(longest, run)
    prev = day
  }

  return {
    current,
    longest,
    atRisk: !hasToday && current > 0,
    reviewedToday,
  }
}

export function forecastDue(cards: CardRecord[], days: number, nowMs = Date.now()): number[] {
  const normalizedDays = Number.isFinite(days) ? Math.max(1, Math.floor(days)) : 15
  const dayMs = 86_400_000
  const todayStart = startOfDayMs(nowMs)
  const tomorrowStart = todayStart + dayMs
  const horizonEnd = tomorrowStart + normalizedDays * dayMs
  const result = Array.from({ length: normalizedDays }, () => 0)

  for (const card of cards) {
    if (card.isDeleted) continue
    if (card.type !== 1 && card.type !== 2 && card.type !== 3) continue

    const dueAtMs = Number.isFinite(card.dueAt)
      ? Math.round(card.dueAt as number)
      : Math.max(0, Math.floor(card.due)) * dayMs

    if (dueAtMs < tomorrowStart || dueAtMs >= horizonEnd) continue

    const dayIndex = Math.floor((dueAtMs - tomorrowStart) / dayMs)
    if (dayIndex >= 0 && dayIndex < result.length) {
      result[dayIndex] += 1
    }
  }

  return result
}
