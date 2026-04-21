import type {
  GamificationAchievement,
  GamificationProfile,
  GamificationQuest,
  Rating,
} from '../types'
import { getDayStartMs } from './time'

const DAY_MS = 86_400_000
const DAILY_REVIEW_GOAL = 20
const DAILY_SUCCESS_GOAL = 15

export interface GamificationReviewInput {
  rating: Rating
  timeMs: number
  timestamp: number
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
  const speedBonus = rating >= 3 && cleanTimeMs > 0 && cleanTimeMs <= 12_000 ? 2 : 0
  return baseByRating[rating] + speedBonus
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

function getRankTitle(level: number): string {
  if (level >= 30) return 'Neural Architect'
  if (level >= 20) return 'Recall Strategist'
  if (level >= 12) return 'Memory Engineer'
  if (level >= 7) return 'Focus Builder'
  if (level >= 3) return 'Review Pilot'
  return 'Warm-up Cadet'
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

function makeAchievement(
  id: string,
  title: string,
  description: string,
  progress: number,
  target: number,
  rarity: GamificationAchievement['rarity'],
): GamificationAchievement {
  const normalizedProgress = Math.max(0, Math.min(target, Math.floor(progress)))
  return {
    id,
    title,
    description,
    progress: normalizedProgress,
    target,
    rarity,
    unlocked: normalizedProgress >= target,
  }
}

function buildAchievements(input: {
  totalReviews: number
  reviewedToday: number
  successRate: number
  currentStreak: number
  longestStreak: number
  activeCardCount: number
}): GamificationAchievement[] {
  return [
    makeAchievement('first-spark', 'First Spark', 'Erstes Review abgeschlossen', input.totalReviews, 1, 'common'),
    makeAchievement('daily-20', 'Daily Engine', '20 Karten an einem Lerntag reviewen', input.reviewedToday, 20, 'common'),
    makeAchievement('streak-3', 'Three-Day Signal', '3 Tage Lernserie erreichen', Math.max(input.currentStreak, input.longestStreak), 3, 'rare'),
    makeAchievement('streak-7', 'Week Protocol', '7 Tage Lernserie erreichen', Math.max(input.currentStreak, input.longestStreak), 7, 'epic'),
    makeAchievement('accuracy-80', 'Clean Recall', '80% Erfolgsrate nach 30 Reviews', input.totalReviews >= 30 && input.successRate >= 80 ? 1 : 0, 1, 'rare'),
    makeAchievement('hundred-reviews', 'Hundred Loop', '100 Reviews insgesamt schaffen', input.totalReviews, 100, 'rare'),
    makeAchievement('deck-builder', 'Deck Builder', '100 aktive Karten im System haben', input.activeCardCount, 100, 'common'),
  ]
}

function buildQuests(input: {
  reviewedToday: number
  successToday: number
  currentStreak: number
  streakAtRisk: boolean
}): GamificationQuest[] {
  const streakProgress = input.streakAtRisk ? 0 : Math.min(1, input.currentStreak > 0 ? 1 : 0)
  return [
    {
      id: 'daily-review-goal',
      title: 'Daily Calibration',
      description: `${DAILY_REVIEW_GOAL} Reviews für einen stabilen Lernimpuls`,
      progress: Math.min(input.reviewedToday, DAILY_REVIEW_GOAL),
      target: DAILY_REVIEW_GOAL,
      rewardXp: 40,
      isComplete: input.reviewedToday >= DAILY_REVIEW_GOAL,
    },
    {
      id: 'daily-success-goal',
      title: 'Precision Run',
      description: `${DAILY_SUCCESS_GOAL} sichere Antworten heute`,
      progress: Math.min(input.successToday, DAILY_SUCCESS_GOAL),
      target: DAILY_SUCCESS_GOAL,
      rewardXp: 35,
      isComplete: input.successToday >= DAILY_SUCCESS_GOAL,
    },
    {
      id: 'streak-shield',
      title: 'Streak Shield',
      description: input.streakAtRisk ? 'Heute ein Review machen, um die Serie zu halten' : 'Lernserie ist für heute geschützt',
      progress: streakProgress,
      target: 1,
      rewardXp: 25,
      isComplete: streakProgress >= 1,
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
  const totalReviews = reviews.length
  const successfulReviews = reviews.filter(review => review.rating >= 3).length
  const successToday = todayReviews.filter(review => review.rating >= 3).length
  const totalXp = reviews.reduce((sum, review) => sum + getReviewXp(review.rating, review.timeMs), 0)
  const todayXp = todayReviews.reduce((sum, review) => sum + getReviewXp(review.rating, review.timeMs), 0)
  const successRate = totalReviews === 0 ? 0 : Math.round((successfulReviews / totalReviews) * 100)
  const streakStats = getStreakStats(dayBuckets, nowMs, nextDayStartsAt)
  const levelProgress = getLevelProgress(totalXp)
  const achievements = buildAchievements({
    totalReviews,
    reviewedToday: todayReviews.length,
    successRate,
    currentStreak: streakStats.currentStreak,
    longestStreak: streakStats.longestStreak,
    activeCardCount,
  })

  return {
    ...levelProgress,
    title: getRankTitle(levelProgress.level),
    totalXp,
    totalReviews,
    successRate,
    reviewedToday: todayReviews.length,
    successToday,
    todayXp,
    activeCardCount,
    achievements,
    quests: buildQuests({
      reviewedToday: todayReviews.length,
      successToday,
      currentStreak: streakStats.currentStreak,
      streakAtRisk: streakStats.streakAtRisk,
    }),
    ...streakStats,
  }
}
