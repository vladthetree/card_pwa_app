import { describe, expect, it } from 'vitest'
import { buildLearningCoachSummary } from '../../services/learningCoach'
import type { Card, Rating, SessionReviewEvent } from '../../types'

function createCard(id: string, front = `front-${id}`, lapses = 0): Card {
  return {
    id,
    noteId: `note-${id}`,
    type: 'review',
    front,
    back: `back-${id}`,
    extra: { acronym: '', examples: '', port: '', protocol: '' },
    tags: [],
    interval: 1,
    due: 0,
    reps: 1,
    lapses,
    queue: 2,
  }
}

function event(cardId: string, rating: Rating, elapsedMs: number): SessionReviewEvent {
  return { cardId, rating, elapsedMs }
}

describe('learning coach summary', () => {
  it('summarizes ratings, pace and repair-focused problem cards', () => {
    const weak = createCard('weak', 'Weak prompt', 2)
    const unclear = createCard('unclear', 'Unclear prompt')
    const stable = createCard('stable', 'Stable prompt')

    const summary = buildLearningCoachSummary({
      reviewEvents: [
        event('weak', 1, 30_000),
        event('unclear', 3, 8_000),
        event('stable', 4, 7_000),
      ],
      cards: [stable, unclear, weak],
      againCounts: { weak: 3 },
      lowRatingCounts: { weak: 3, unclear: 2 },
      forcedTomorrowCardIds: ['weak'],
    })

    expect(summary.reviewedCount).toBe(3)
    expect(summary.successRate).toBe(67)
    expect(summary.averageElapsedMs).toBe(15_000)
    expect(summary.slowReviewCount).toBe(1)
    expect(summary.ratingCounts).toEqual({ 1: 1, 2: 0, 3: 1, 4: 1 })
    expect(summary.focus).toBe('repair')
    expect(summary.problemCards.map(problem => problem.card.id)).toEqual(['weak', 'unclear'])
  })

  it('recommends slowing down when successful answers are consistently slow', () => {
    const summary = buildLearningCoachSummary({
      reviewEvents: [
        event('a', 3, 28_000),
        event('b', 4, 27_000),
        event('c', 4, 9_000),
      ],
      cards: [createCard('a'), createCard('b'), createCard('c')],
      againCounts: {},
      lowRatingCounts: {},
      forcedTomorrowCardIds: [],
    })

    expect(summary.successRate).toBe(100)
    expect(summary.focus).toBe('slow_down')
  })

  it('recommends a short break after a long stable block', () => {
    const reviewEvents = Array.from({ length: 30 }, (_, index) => event(`card-${index}`, 4, 5_000))
    const cards = reviewEvents.map(reviewEvent => createCard(reviewEvent.cardId))

    const summary = buildLearningCoachSummary({
      reviewEvents,
      cards,
      againCounts: {},
      lowRatingCounts: {},
      forcedTomorrowCardIds: [],
    })

    expect(summary.successRate).toBe(100)
    expect(summary.focus).toBe('short_break')
  })
})
