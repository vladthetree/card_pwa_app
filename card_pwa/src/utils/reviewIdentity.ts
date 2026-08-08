/**
 * AI_CONTEXT:
 * Role: Pure identity helpers that distinguish review attempts from cards reviewed once per study run.
 * Used by: streak, daily/global stats, gamification, and session progress.
 * Important: Legacy reviews without sessionRunId intentionally remain separate attempts; never infer sessions from timestamps.
 */

export interface SessionCardReviewIdentity {
  cardId?: string
  sessionRunId?: string
  timestamp?: number
}

/**
 * Returns the latest review for every (sessionRunId, cardId) pair. Reviews
 * written before session identities existed are kept individually so historic
 * data is not merged using an unsafe time-based guess.
 */
export function buildLatestSessionCardReviews<T extends SessionCardReviewIdentity>(reviews: readonly T[]): T[] {
  const latestByIdentity = new Map<string, { review: T; index: number }>()

  reviews.forEach((review, index) => {
    const cardId = typeof review.cardId === 'string' ? review.cardId.trim() : ''
    const sessionRunId = typeof review.sessionRunId === 'string' ? review.sessionRunId.trim() : ''
    const identity = cardId && sessionRunId
      ? `${sessionRunId}\u0000${cardId}`
      : `legacy\u0000${index}`
    const current = latestByIdentity.get(identity)
    const timestamp = Number.isFinite(review.timestamp) ? Number(review.timestamp) : 0
    const currentTimestamp = Number.isFinite(current?.review.timestamp)
      ? Number(current?.review.timestamp)
      : 0

    if (!current || timestamp >= currentTimestamp) {
      latestByIdentity.set(identity, { review, index })
    }
  })

  return Array.from(latestByIdentity.values())
    .sort((a, b) => a.index - b.index)
    .map(entry => entry.review)
}

export function countUniqueSessionCards(reviews: readonly SessionCardReviewIdentity[]): number {
  return buildLatestSessionCardReviews(reviews).length
}
