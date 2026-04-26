import type { Card, Rating, SessionReviewEvent } from '../types'

export type LearningCoachFocus = 'continue' | 'repair' | 'slow_down' | 'short_break'

export interface LearningCoachProblemCard {
  card: Card
  againCount: number
  lowRatingCount: number
  forcedTomorrow: boolean
  score: number
}

export interface LearningCoachSummary {
  reviewedCount: number
  successRate: number
  averageElapsedMs: number
  slowReviewCount: number
  ratingCounts: Record<Rating, number>
  problemCards: LearningCoachProblemCard[]
  focus: LearningCoachFocus
}

const SLOW_REVIEW_MS = 25_000

function emptyRatingCounts(): Record<Rating, number> {
  return { 1: 0, 2: 0, 3: 0, 4: 0 }
}

export function buildLearningCoachSummary(input: {
  reviewEvents: SessionReviewEvent[]
  cards: Card[]
  againCounts: Record<string, number>
  lowRatingCounts: Record<string, number>
  forcedTomorrowCardIds: string[]
}): LearningCoachSummary {
  const ratingCounts = emptyRatingCounts()
  let successful = 0
  let totalElapsedMs = 0
  let slowReviewCount = 0

  for (const event of input.reviewEvents) {
    ratingCounts[event.rating] += 1
    if (event.rating >= 3) successful += 1
    totalElapsedMs += Math.max(0, event.elapsedMs)
    if (event.elapsedMs >= SLOW_REVIEW_MS) slowReviewCount += 1
  }

  const reviewedCount = input.reviewEvents.length
  const successRate = reviewedCount === 0 ? 0 : Math.round((successful / reviewedCount) * 100)
  const averageElapsedMs = reviewedCount === 0 ? 0 : Math.round(totalElapsedMs / reviewedCount)
  const forcedTomorrowSet = new Set(input.forcedTomorrowCardIds)
  const cardById = new Map(input.cards.map(card => [card.id, card]))

  const problemCards = Array.from(new Set([
    ...Object.keys(input.againCounts),
    ...Object.keys(input.lowRatingCounts).filter(cardId => (input.lowRatingCounts[cardId] ?? 0) >= 2),
    ...input.forcedTomorrowCardIds,
  ]))
    .map(cardId => {
      const card = cardById.get(cardId)
      if (!card) return null

      const againCount = input.againCounts[cardId] ?? 0
      const lowRatingCount = input.lowRatingCounts[cardId] ?? 0
      const forcedTomorrow = forcedTomorrowSet.has(cardId)
      const score = againCount * 4 + lowRatingCount * 2 + (forcedTomorrow ? 6 : 0) + Math.min(4, card.lapses)

      return { card, againCount, lowRatingCount, forcedTomorrow, score }
    })
    .filter((entry): entry is LearningCoachProblemCard => entry !== null)
    .sort((a, b) => b.score - a.score || a.card.front.localeCompare(b.card.front))
    .slice(0, 5)

  const slowRatio = reviewedCount === 0 ? 0 : slowReviewCount / reviewedCount
  const focus: LearningCoachFocus =
    problemCards.length >= 3 || successRate < 70
      ? 'repair'
      : averageElapsedMs >= SLOW_REVIEW_MS || slowRatio >= 0.35
        ? 'slow_down'
        : reviewedCount >= 30
          ? 'short_break'
          : 'continue'

  return {
    reviewedCount,
    successRate,
    averageElapsedMs,
    slowReviewCount,
    ratingCounts,
    problemCards,
    focus,
  }
}
