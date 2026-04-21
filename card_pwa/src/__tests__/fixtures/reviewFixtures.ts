import type { ReviewRecord } from '../../db'

/**
 * Create a review record for testing
 */
export function createReview(options?: {
  cardId?: string
  rating?: 1 | 2 | 3 | 4
  timeMs?: number
  timestamp?: number
}): Omit<ReviewRecord, 'id'> {
  return {
    cardId: options?.cardId ?? `card_${Date.now()}`,
    rating: (options?.rating ?? 3) as 1 | 2 | 3 | 4,
    timeMs: options?.timeMs ?? 5000,
    timestamp: options?.timestamp ?? Date.now(),
  }
}

/**
 * Create a batch of reviews
 */
export function createBatch(
  count: number,
  ratings?: Array<1 | 2 | 3 | 4>
): Array<Omit<ReviewRecord, 'id'>> {
  const result: Array<Omit<ReviewRecord, 'id'>> = []
  for (let i = 0; i < count; i++) {
    const rating = ratings?.[i % ratings.length] ?? (3 as const)
    result.push(
      createReview({
        cardId: `card_batch_${i}`,
        rating: rating as 1 | 2 | 3 | 4,
        timestamp: Date.now() + i * 1000,
      })
    )
  }
  return result
}
