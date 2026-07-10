/**
 * AI_CONTEXT: Vitest coverage for gamification; protects services behavior from regressions in the learning PWA.
 */
import { describe, expect, it } from 'vitest'
import {
  buildGamificationProfile,
  getComboBonusXp,
  getLevelProgress,
  getReviewXp,
  getTrailingComboCount,
} from '../../utils/gamification'

const DAY_MS = 86_400_000

describe('gamification profile', () => {
  it('awards deterministic XP from rating and recall speed', () => {
    expect(getReviewXp(1, 20_000)).toBe(3)
    expect(getReviewXp(3, 20_000)).toBe(10)
    expect(getReviewXp(3, 8_000)).toBe(12)
    expect(getReviewXp(4, 8_000)).toBe(16)
  })

  it('grows the combo bonus every third consecutive success and caps at 12', () => {
    expect(getComboBonusXp(0)).toBe(0)
    expect(getComboBonusXp(2)).toBe(0)
    expect(getComboBonusXp(3)).toBe(2)
    expect(getComboBonusXp(9)).toBe(6)
    expect(getComboBonusXp(18)).toBe(12)
    expect(getComboBonusXp(30)).toBe(12)
  })

  it('counts trailing consecutive successes in timestamp order', () => {
    expect(getTrailingComboCount([])).toBe(0)
    expect(getTrailingComboCount([
      { rating: 3 as const, timestamp: 3_000 },
      { rating: 1 as const, timestamp: 1_000 },
      { rating: 4 as const, timestamp: 2_000 },
    ])).toBe(2)
    expect(getTrailingComboCount([
      { rating: 3 as const, timestamp: 1_000 },
      { rating: 1 as const, timestamp: 3_000 },
      { rating: 4 as const, timestamp: 2_000 },
    ])).toBe(0)
  })

  it('computes current streak, longest streak, and today XP from reviews only', () => {
    const nowMs = new Date('2026-04-18T12:00:00.000Z').getTime()
    const reviews = [
      { rating: 4 as const, timeMs: 6_000, timestamp: nowMs - 60_000 },
      { rating: 3 as const, timeMs: 20_000, timestamp: nowMs - DAY_MS + 60_000 },
      { rating: 2 as const, timeMs: 20_000, timestamp: nowMs - DAY_MS * 2 + 60_000 },
      { rating: 3 as const, timeMs: 8_000, timestamp: nowMs - DAY_MS * 4 + 60_000 },
    ]

    const profile = buildGamificationProfile({
      reviews,
      activeCardCount: 42,
      nowMs,
    })

    expect(profile.totalReviews).toBe(4)
    expect(profile.currentStreak).toBe(3)
    expect(profile.longestStreak).toBe(3)
    expect(profile.streakAtRisk).toBe(false)
    // 16 Basis-XP (rating 4, Speed-Bonus) + 25 XP Streak-Shield-Quest des Tages
    expect(profile.todayXp).toBe(41)
    // Tage: 16+25, 10+25, 6+25, 12+25
    expect(profile.totalXp).toBe(144)
    expect(profile.successRate).toBe(75)
  })

  it('credits quest rewards and combo bonuses per learning day', () => {
    const nowMs = new Date('2026-04-18T12:00:00.000Z').getTime()
    const reviews = Array.from({ length: 20 }, (_, index) => ({
      rating: 3 as const,
      timeMs: 20_000,
      timestamp: nowMs - 3_600_000 + index * 60_000,
    }))

    const profile = buildGamificationProfile({ reviews, activeCardCount: 20, nowMs })

    // 20 × 10 Basis + 126 Combo + 40 (20 Reviews) + 35 (15 Erfolge) + 25 (Streak-Shield)
    expect(profile.totalXp).toBe(426)
    expect(profile.todayXp).toBe(426)
    expect(profile.quests.every(quest => quest.isComplete)).toBe(true)
  })

  it('marks an existing streak at risk when today has no review', () => {
    const nowMs = new Date('2026-04-18T12:00:00.000Z').getTime()
    const profile = buildGamificationProfile({
      reviews: [
        { rating: 3 as const, timeMs: 10_000, timestamp: nowMs - DAY_MS + 60_000 },
        { rating: 3 as const, timeMs: 10_000, timestamp: nowMs - DAY_MS * 2 + 60_000 },
      ],
      activeCardCount: 2,
      nowMs,
    })

    expect(profile.currentStreak).toBe(2)
    expect(profile.streakAtRisk).toBe(true)
    expect(profile.quests.find(quest => quest.id === 'streak-shield')?.isComplete).toBe(false)
  })

  it('keeps level progress bounded for large XP totals', () => {
    const progress = getLevelProgress(12_000)

    expect(progress.level).toBeGreaterThan(1)
    expect(progress.currentLevelXp).toBeGreaterThanOrEqual(0)
    expect(progress.currentLevelXp).toBeLessThan(progress.nextLevelXp)
    expect(progress.levelProgress).toBeGreaterThanOrEqual(0)
    expect(progress.levelProgress).toBeLessThanOrEqual(100)
  })
})
