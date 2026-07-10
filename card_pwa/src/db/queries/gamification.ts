/**
 * AI_CONTEXT: Database module for gamification; provides IndexedDB schema/query access for persistent learning data.
 */
import { db } from '../../db'
import { buildGamificationProfile, getTrailingComboCount } from '../../utils/gamification'
import { getDayStartMs } from '../../utils/time'
import type { GamificationProfile, Rating } from '../../types'

export async function getGamificationProfile(nextDayStartsAt = 0): Promise<GamificationProfile> {
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
 * Aktuelle Combo des Lerntags (letzte ununterbrochene Erfolge). Seed für die
 * Session-Momentum-Anzeige, damit Toast-XP und gutgeschriebenes XP aus
 * buildGamificationProfile identisch bleiben.
 */
export async function getTodayTrailingCombo(nextDayStartsAt = 0): Promise<number> {
  const todayStart = getDayStartMs(Date.now(), nextDayStartsAt)
  const rows = await db.reviews.where('timestamp').aboveOrEqual(todayStart).sortBy('timestamp')
  return getTrailingComboCount(rows.map(row => ({ rating: row.rating as Rating, timestamp: row.timestamp })))
}
