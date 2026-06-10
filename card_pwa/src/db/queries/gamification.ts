import { db } from '../../db'
import { buildGamificationProfile, buildCardSuccessStats, type CardSuccessStats } from '../../utils/gamification'
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

/**
 * Success metrics per card id (card variant), not per note: a note can have
 * several card variants and each one tracks its own success history.
 * Without `cardIds` all reviews are aggregated.
 */
export async function fetchCardSuccessStats(cardIds?: string[]): Promise<Map<string, CardSuccessStats>> {
  const reviews = cardIds && cardIds.length > 0
    ? await db.reviews.where('cardId').anyOf(cardIds).toArray()
    : await db.reviews.toArray()

  return buildCardSuccessStats(reviews.map(review => ({
    rating: review.rating as Rating,
    timeMs: review.timeMs,
    timestamp: review.timestamp,
    cardId: review.cardId,
  })))
}
