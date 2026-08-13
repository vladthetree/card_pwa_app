/**
 * AI_CONTEXT: Utility module for gamification; provides pure helpers for scheduling, parsing, scoring, tags, video notes, backup, or app data transformations.
 */
import type {
  GamificationProfile,
  GamificationQuest,
  GamificationRankTier,
  Rating,
} from '../types'
import { getDayStartMs } from './time'
import { buildLatestSessionCardReviews } from './reviewIdentity'

const DAY_MS = 86_400_000
const DAILY_REVIEW_GOAL = 20
const DAILY_SUCCESS_GOAL = 15
const QUEST_REVIEW_REWARD_XP = 40
const QUEST_SUCCESS_REWARD_XP = 35
const QUEST_STREAK_REWARD_XP = 25

export interface GamificationReviewInput {
  rating: Rating
  timeMs: number
  timestamp: number
  /** Card-level identity: a note can have several card variants, success is
   *  measured per card id (not per note). Optional for backward compatibility. */
  cardId?: string
  sessionRunId?: string
}

/**
 * Zwei getrennte Schwellen für zwei verschiedene Fragen (Trainer-Feedback,
 * 2026-08-08): „hast du's grundsätzlich gewusst" vs. „wie mühelos". Beide
 * nehmen bewusst `number` statt `Rating`, damit auch lose typisierte
 * DB-Leseresultate (z. B. `{ rating: number }[]`) sie ohne Cast nutzen können.
 */
/** Alles außer echtem „Nochmal" zählt als gewusst — Grundlage für Erfolgsquote
 *  und die tägliche Erfolgs-Quest. Ein ehrliches „Schwierig" ist kein Fehlschlag. */
export function isRecalledRating(rating: number): boolean {
  return rating >= 2
}

/** Nur „Gut"/„Leicht" — Grundlage für Combo-Kette und Tempo-Bonus, die gezielt
 *  Mühelosigkeit belohnen, nicht bloßes Wissen. */
export function isFluentRating(rating: number): boolean {
  return rating >= 3
}

export interface CardSuccessStats {
  cardId: string
  totalReviews: number
  successfulReviews: number
  /** 0–100, siehe isRecalledRating (alles außer „Nochmal" zählt). */
  successRate: number
  lastReviewedAt: number | null
}

/**
 * Aggregates review success per card id. Reviews without a cardId are skipped
 * (legacy events); existing note-level stats stay untouched.
 */
export function buildCardSuccessStats(reviews: GamificationReviewInput[]): Map<string, CardSuccessStats> {
  const stats = new Map<string, CardSuccessStats>()
  for (const review of reviews) {
    if (!review.cardId) continue
    let entry = stats.get(review.cardId)
    if (!entry) {
      entry = { cardId: review.cardId, totalReviews: 0, successfulReviews: 0, successRate: 0, lastReviewedAt: null }
      stats.set(review.cardId, entry)
    }
    entry.totalReviews += 1
    if (isRecalledRating(review.rating)) entry.successfulReviews += 1
    entry.lastReviewedAt = Math.max(entry.lastReviewedAt ?? 0, review.timestamp)
  }
  for (const entry of stats.values()) {
    entry.successRate = Math.round((entry.successfulReviews / entry.totalReviews) * 100)
  }
  return stats
}

export interface BuildGamificationProfileInput {
  reviews: GamificationReviewInput[]
  activeCardCount: number
  nextDayStartsAt?: number
  nowMs?: number
}

export function getReviewXp(rating: Rating, timeMs: number): number {
  const baseByRating: Record<Rating, number> = {
    1: 3,
    2: 6,
    3: 10,
    4: 14,
  }
  const cleanTimeMs = Number.isFinite(timeMs) ? Math.max(0, timeMs) : 0
  const speedBonus = isFluentRating(rating) && cleanTimeMs > 0 && cleanTimeMs <= 12_000 ? 2 : 0
  return baseByRating[rating] + speedBonus
}

/** Combo-Bonus für die n-te mühelose Antwort in Folge (comboCount 0 = Bruch). */
export function getComboBonusXp(comboCount: number): number {
  return Math.min(12, Math.floor(Math.max(0, comboCount) / 3) * 2)
}

/** Anzahl der letzten ununterbrochenen mühelosen Antworten (isFluentRating) in Zeitreihenfolge. */
export function getTrailingComboCount(reviews: Pick<GamificationReviewInput, 'rating' | 'timestamp'>[]): number {
  const ordered = [...reviews].sort((a, b) => a.timestamp - b.timestamp)
  let combo = 0
  for (const review of ordered) combo = isFluentRating(review.rating) ? combo + 1 : 0
  return combo
}

/**
 * XP eines Lerntags: Basis-XP plus Combo-Bonus in Review-Reihenfolge plus die
 * Quest-Belohnungen des Tages — deterministisch aus der Historie, damit
 * angezeigtes und gutgeschriebenes XP identisch bleiben.
 */
function computeDayXp(dayReviews: GamificationReviewInput[]): number {
  if (dayReviews.length === 0) return 0
  const ordered = [...dayReviews].sort((a, b) => a.timestamp - b.timestamp)
  let combo = 0
  let xp = 0
  for (const review of ordered) {
    combo = isFluentRating(review.rating) ? combo + 1 : 0
    xp += getReviewXp(review.rating, review.timeMs) + getComboBonusXp(combo)
  }
  const uniqueReviews = buildLatestSessionCardReviews(dayReviews)
  const uniqueSuccesses = uniqueReviews.filter(review => isRecalledRating(review.rating)).length
  if (uniqueReviews.length >= DAILY_REVIEW_GOAL) xp += QUEST_REVIEW_REWARD_XP
  if (uniqueSuccesses >= DAILY_SUCCESS_GOAL) xp += QUEST_SUCCESS_REWARD_XP
  return xp + QUEST_STREAK_REWARD_XP
}

export function getLevelProgress(totalXp: number): Pick<
  GamificationProfile,
  'level' | 'currentLevelXp' | 'nextLevelXp' | 'levelProgress'
> {
  let level = 1
  let remainingXp = Math.max(0, Math.floor(totalXp))
  let nextLevelXp = getXpRequiredForLevel(level)

  while (remainingXp >= nextLevelXp) {
    remainingXp -= nextLevelXp
    level += 1
    nextLevelXp = getXpRequiredForLevel(level)
  }

  return {
    level,
    currentLevelXp: remainingXp,
    nextLevelXp,
    levelProgress: nextLevelXp === 0 ? 100 : Math.round((remainingXp / nextLevelXp) * 100),
  }
}

function getXpRequiredForLevel(level: number): number {
  return 120 + level * 70 + Math.floor(Math.pow(level, 1.35) * 18)
}

function getRankTier(level: number): GamificationRankTier {
  if (level >= 30) return 'architect'
  if (level >= 20) return 'strategist'
  if (level >= 12) return 'engineer'
  if (level >= 7) return 'builder'
  if (level >= 3) return 'pilot'
  return 'cadet'
}

function getDayBuckets(reviews: GamificationReviewInput[], nextDayStartsAt: number): Map<number, GamificationReviewInput[]> {
  const buckets = new Map<number, GamificationReviewInput[]>()
  for (const review of reviews) {
    const dayStart = getDayStartMs(review.timestamp, nextDayStartsAt)
    const dayReviews = buckets.get(dayStart)
    if (dayReviews) {
      dayReviews.push(review)
    } else {
      buckets.set(dayStart, [review])
    }
  }
  return buckets
}

function getStreakStats(dayBuckets: Map<number, GamificationReviewInput[]>, nowMs: number, nextDayStartsAt: number): {
  currentStreak: number
  longestStreak: number
  streakAtRisk: boolean
} {
  const todayStart = getDayStartMs(nowMs, nextDayStartsAt)
  const hasToday = (dayBuckets.get(todayStart)?.length ?? 0) > 0
  let cursor = hasToday ? todayStart : todayStart - DAY_MS
  let currentStreak = 0

  while ((dayBuckets.get(cursor)?.length ?? 0) > 0) {
    currentStreak += 1
    cursor -= DAY_MS
  }

  const sortedDays = Array.from(dayBuckets.keys()).sort((a, b) => a - b)
  let longestStreak = 0
  let run = 0
  let previousDay: number | null = null

  for (const day of sortedDays) {
    run = previousDay !== null && day - previousDay === DAY_MS ? run + 1 : 1
    longestStreak = Math.max(longestStreak, run)
    previousDay = day
  }

  return {
    currentStreak,
    longestStreak,
    streakAtRisk: !hasToday && currentStreak > 0,
  }
}

function buildQuests(input: {
  reviewedToday: number
  successToday: number
}): GamificationQuest[] {
  return [
    {
      id: 'daily-review-goal',
      progress: Math.min(input.reviewedToday, DAILY_REVIEW_GOAL),
      target: DAILY_REVIEW_GOAL,
      rewardXp: QUEST_REVIEW_REWARD_XP,
      isComplete: input.reviewedToday >= DAILY_REVIEW_GOAL,
    },
    {
      id: 'daily-success-goal',
      progress: Math.min(input.successToday, DAILY_SUCCESS_GOAL),
      target: DAILY_SUCCESS_GOAL,
      rewardXp: QUEST_SUCCESS_REWARD_XP,
      isComplete: input.successToday >= DAILY_SUCCESS_GOAL,
    },
    {
      // Erste-Karte-Prinzip: ein Review am Lerntag sichert die Serie.
      id: 'streak-shield',
      progress: Math.min(input.reviewedToday, 1),
      target: 1,
      rewardXp: QUEST_STREAK_REWARD_XP,
      isComplete: input.reviewedToday > 0,
    },
  ]
}

export function buildGamificationProfile({
  reviews,
  activeCardCount,
  nextDayStartsAt = 0,
  nowMs = Date.now(),
}: BuildGamificationProfileInput): GamificationProfile {
  const dayBuckets = getDayBuckets(reviews, nextDayStartsAt)
  const todayStart = getDayStartMs(nowMs, nextDayStartsAt)
  const todayReviews = dayBuckets.get(todayStart) ?? []
  const uniqueTodayReviews = buildLatestSessionCardReviews(todayReviews)
  const totalReviews = reviews.length
  const successfulReviews = reviews.filter(review => isRecalledRating(review.rating)).length
  const successToday = uniqueTodayReviews.filter(review => isRecalledRating(review.rating)).length
  let totalXp = 0
  let todayXp = 0
  for (const [dayStart, dayReviews] of dayBuckets.entries()) {
    const dayXp = computeDayXp(dayReviews)
    totalXp += dayXp
    if (dayStart === todayStart) todayXp = dayXp
  }
  const successRate = totalReviews === 0 ? 0 : Math.round((successfulReviews / totalReviews) * 100)
  const streakStats = getStreakStats(dayBuckets, nowMs, nextDayStartsAt)
  const levelProgress = getLevelProgress(totalXp)

  return {
    ...levelProgress,
    rankTier: getRankTier(levelProgress.level),
    totalXp,
    totalReviews,
    successRate,
    reviewedToday: uniqueTodayReviews.length,
    successToday,
    todayXp,
    activeCardCount,
    quests: buildQuests({
      reviewedToday: uniqueTodayReviews.length,
      successToday,
    }),
    ...streakStats,
  }
}
