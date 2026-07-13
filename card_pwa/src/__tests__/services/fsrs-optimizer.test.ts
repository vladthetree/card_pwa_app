import { describe, expect, it } from 'vitest'
import { buildFsrsTrainingHistories } from '../../services/fsrsOptimizer'
import type { ReviewRecord } from '../../db'

describe('FSRS optimizer histories', () => {
  it('groups chronologically and creates one history per trainable outcome', () => {
    const day = 86_400_000
    const reviews: ReviewRecord[] = [
      { cardId: 'a', rating: 4, timestamp: 3 * day, timeMs: 1 },
      { cardId: 'b', rating: 3, timestamp: day, timeMs: 1 },
      { cardId: 'a', rating: 1, timestamp: day, timeMs: 1 },
      { cardId: 'a', rating: 3, timestamp: 2 * day, timeMs: 1 },
    ]

    expect(buildFsrsTrainingHistories(reviews)).toEqual([
      [{ rating: 1, deltaT: 0 }, { rating: 3, deltaT: 1 }],
      [{ rating: 1, deltaT: 0 }, { rating: 3, deltaT: 1 }, { rating: 4, deltaT: 1 }],
    ])
  })
})
