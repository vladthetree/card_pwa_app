import { describe, expect, it } from 'vitest'
import { buildHeatmap, calculateStreak, forecastDue } from '../../../utils/stats/aggregate'

describe('stats aggregate', () => {
  it('builds daily heatmap buckets for a year', () => {
    const result = buildHeatmap(
      [
        { cardId: 'c1', rating: 4, timeMs: 1, timestamp: new Date('2026-01-01T12:00:00Z').getTime() },
        { cardId: 'c2', rating: 3, timeMs: 1, timestamp: new Date('2026-01-01T16:00:00Z').getTime() },
      ],
      2026,
    )

    expect(result).toHaveLength(1)
    expect(result[0].count).toBe(2)
  })

  it('calculates current and longest streak', () => {
    const now = new Date('2026-04-26T10:00:00Z').getTime()
    const day = 86_400_000
    const base = new Date('2026-04-26T00:00:00Z').getTime()

    const streak = calculateStreak(
      [
        { cardId: 'c1', rating: 4, timeMs: 1, timestamp: base - 2 * day },
        { cardId: 'c1', rating: 4, timeMs: 1, timestamp: base - day },
        { cardId: 'c1', rating: 4, timeMs: 1, timestamp: base },
      ],
      now,
    )

    expect(streak.current).toBe(3)
    expect(streak.longest).toBe(3)
    expect(streak.atRisk).toBe(false)
  })

  it('forecasts future due counts by day', () => {
    const now = new Date('2026-04-26T10:00:00Z').getTime()
    const tomorrow = new Date('2026-04-27T00:00:00Z').getTime()
    const result = forecastDue(
      [
        {
          id: 'c1',
          noteId: 'n1',
          deckId: 'd1',
          front: 'Q',
          back: 'A',
          tags: [],
          extra: { acronym: '', examples: '', port: '', protocol: '' },
          type: 2,
          queue: 2,
          due: Math.floor(tomorrow / 86_400_000),
          dueAt: tomorrow,
          interval: 1,
          factor: 2500,
          reps: 1,
          lapses: 0,
          createdAt: now,
          algorithm: 'sm2',
        },
      ],
      3,
      now,
    )

    expect(result).toEqual([1, 0, 0])
  })
})
