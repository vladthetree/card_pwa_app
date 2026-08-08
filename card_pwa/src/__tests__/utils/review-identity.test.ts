/**
 * AI_CONTEXT: Regression coverage for unique study-run/card counting.
 */
import { describe, expect, it } from 'vitest'
import { buildLatestSessionCardReviews, countUniqueSessionCards } from '../../utils/reviewIdentity'

describe('review identity', () => {
  it('keeps only the latest attempt for each session/card pair', () => {
    const reviews = [
      { cardId: 'card-a', sessionRunId: 'run-1', rating: 1, timestamp: 100 },
      { cardId: 'card-a', sessionRunId: 'run-1', rating: 3, timestamp: 200 },
      { cardId: 'card-a', sessionRunId: 'run-2', rating: 4, timestamp: 300 },
      { cardId: 'card-b', sessionRunId: 'run-1', rating: 2, timestamp: 400 },
    ]

    const latest = buildLatestSessionCardReviews(reviews)
    expect(latest).toHaveLength(3)
    expect(latest.find(review => review.cardId === 'card-a' && review.sessionRunId === 'run-1')?.rating).toBe(3)
    expect(countUniqueSessionCards(reviews)).toBe(3)
  })

  it('does not guess identities for historical rows without a run id', () => {
    const legacy = [
      { cardId: 'card-a', rating: 1, timestamp: 100 },
      { cardId: 'card-a', rating: 3, timestamp: 200 },
    ]

    expect(countUniqueSessionCards(legacy)).toBe(2)
  })
})
