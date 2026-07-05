/**
 * AI_CONTEXT: Database module for gamification; provides IndexedDB schema/query access for persistent learning data.
 */
import { db } from '../../db'
import { buildGamificationProfile } from '../../utils/gamification'
import type { GamificationProfile, Rating } from '../../types'

export async function fetchGamificationProfile(nextDayStartsAt = 0): Promise<GamificationProfile> {
  const [reviews, activeCardCount] = await Promise.all([
    db.reviews.toArray(),
    db.cards.filter(card => !card.isDeleted).count(),
  ])

  return buildGamificationProfile({
    reviews: reviews.map(review => ({
      rating: review.rating as Rating,
      timeMs: review.timeMs,
      timestamp: review.timestamp,
      cardId: review.cardId,
    })),
    activeCardCount,
    nextDayStartsAt,
  })
}
