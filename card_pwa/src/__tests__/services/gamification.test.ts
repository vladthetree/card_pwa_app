import { describe, expect, it } from 'vitest'
import { buildGamificationProfile, getLevelProgress, getReviewXp } from '../../utils/gamification'

const DAY_MS = 86_400_000

describe('gamification profile', () => {
  it('awards deterministic XP from rating and recall speed', () => {
    expect(getReviewXp(1, 20_000)).toBe(3)
    expect(getReviewXp(3, 20_000)).toBe(10)
    expect(getReviewXp(3, 8_000)).toBe(12)
    expect(getReviewXp(4, 8_000)).toBe(16)
  })

  it('computes current streak, longest streak, today XP, and achievements from reviews only', () => {
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
    expect(profile.todayXp).toBe(16)
    expect(profile.successRate).toBe(75)
    expect(profile.achievements.find(item => item.id === 'first-spark')?.unlocked).toBe(true)
    expect(profile.achievements.find(item => item.id === 'streak-3')?.unlocked).toBe(true)
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
