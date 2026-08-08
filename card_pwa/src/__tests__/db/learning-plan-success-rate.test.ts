import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReviewRecord } from '../../db'

const mockedReviews = vi.hoisted(() => {
  const state = { rows: [] as ReviewRecord[] }
  return {
    state,
    table: {
      where: vi.fn((field: string) => {
        if (field !== 'cardId') throw new Error(`Unexpected index ${field}`)
        return {
          anyOf: (cardIds: readonly string[]) => ({
            toArray: async () => state.rows.filter(review => cardIds.includes(review.cardId)),
          }),
        }
      }),
    },
  }
})

vi.mock('../../db', () => ({
  db: {
    reviews: mockedReviews.table,
  },
}))

import {
  computeCanonicalReviewSuccessRate,
  getCardSetSuccessRates,
} from '../../db/queries/reviews'

function review(cardId: string, rating: 1 | 2 | 3 | 4, timestamp: number): ReviewRecord {
  return { cardId, rating, timeMs: 1000, timestamp }
}

describe('kanonische Lernplan-Erfolgsrate', () => {
  beforeEach(() => {
    mockedReviews.state.rows = []
    mockedReviews.table.where.mockClear()
  })

  it('zählt alles außer Nochmal (Rating 1) als Erfolg, nutzt die gesamte Historie und rundet nur die Anzeige', () => {
    const stats = computeCanonicalReviewSuccessRate([
      review('c1', 1, 1),
      review('c1', 2, 2),
      review('c1', 3, 3),
      review('c1', 4, 4),
      review('c1', 3, 5),
    ])

    expect(stats).toEqual({
      rate: 80,
      ratio: 0.8,
      successful: 4,
      total: 5,
    })
  })

  it('behandelt 0 Antworten als nicht beantwortet statt als Erfolgsbeleg', () => {
    expect(computeCanonicalReviewSuccessRate([])).toEqual({
      rate: 0,
      ratio: 0,
      successful: 0,
      total: 0,
    })
  })

  it('aggregiert über stabile Card-IDs und ignoriert ihre physische Deckposition', async () => {
    mockedReviews.state.rows = [
      review('moved-card', 4, 1),
      review('moved-card', 3, 2),
      review('other-card', 1, 3),
    ]

    const rates = await getCardSetSuccessRates({
      'sy0-701-objective-1-1': ['moved-card'],
    })

    expect(rates['sy0-701-objective-1-1']).toMatchObject({
      ratio: 1,
      rate: 100,
      total: 2,
    })
  })

  it('übernimmt ein Review aus dem echten Deck beim nächsten Lernplan-Read sofort', async () => {
    const scope = { 'sy0-701-objective-4-5': ['real-card-id'] }
    expect((await getCardSetSuccessRates(scope))['sy0-701-objective-4-5'].total).toBe(0)

    // Derselbe append-only Review-Datensatz, den die normale Deck-Session
    // schreibt; es existiert kein Lernplan-spezifischer Speicher.
    mockedReviews.state.rows.push(review('real-card-id', 4, 10))

    expect((await getCardSetSuccessRates(scope))['sy0-701-objective-4-5']).toMatchObject({
      total: 1,
      rate: 100,
      ratio: 1,
    })
  })
})
