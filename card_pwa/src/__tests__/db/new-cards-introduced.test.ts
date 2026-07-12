/**
 * AI_CONTEXT: Regression coverage for the daily new-card counter after the
 * reviews compound index was removed in DB v16.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReviewRecord } from '../../db'

const mockedRuntime = vi.hoisted(() => {
  const state = { reviews: [] as ReviewRecord[] }
  const where = vi.fn((field: string) => {
    if (field === 'timestamp') {
      return {
        aboveOrEqual: (sinceMs: number) => ({
          toArray: async () => state.reviews.filter(review => review.timestamp >= sinceMs),
        }),
      }
    }
    if (field === 'cardId') {
      return {
        anyOf: (cardIds: string[]) => ({
          toArray: async () => state.reviews.filter(review => cardIds.includes(review.cardId)),
        }),
      }
    }
    throw new Error(`Unerwarteter oder entfernter Index: ${field}`)
  })
  return { state, where }
})

vi.mock('../../db', () => ({
  db: {
    reviews: { where: mockedRuntime.where },
  },
}))

import { countNewCardsIntroducedToday } from '../../db/queries/reviews'

function review(cardId: string, timestamp: number): ReviewRecord {
  return { cardId, rating: 3, timeMs: 1000, timestamp }
}

describe('countNewCardsIntroducedToday', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-12T12:00:00.000Z'))
    mockedRuntime.state.reviews = []
    mockedRuntime.where.mockClear()
  })

  it('zaehlt pro Karten-ID nur Karten ohne Review vor dem Lerntag', async () => {
    const todayStart = new Date(2026, 6, 12).getTime()
    mockedRuntime.state.reviews = [
      review('new-today', todayStart + 1000),
      review('new-today', todayStart + 2000),
      review('known-before', todayStart - 1000),
      review('known-before', todayStart + 3000),
      review('also-new', todayStart + 4000),
    ]

    await expect(countNewCardsIntroducedToday(0)).resolves.toBe(2)
    expect(mockedRuntime.where).toHaveBeenNthCalledWith(1, 'timestamp')
    expect(mockedRuntime.where).toHaveBeenNthCalledWith(2, 'cardId')
    expect(mockedRuntime.where).not.toHaveBeenCalledWith('[cardId+timestamp]')
  })

  it('beendet sich ohne zweite Abfrage, wenn heute nichts bewertet wurde', async () => {
    await expect(countNewCardsIntroducedToday(0)).resolves.toBe(0)
    expect(mockedRuntime.where).toHaveBeenCalledTimes(1)
  })
})
