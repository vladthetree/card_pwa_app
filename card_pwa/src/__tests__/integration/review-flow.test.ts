import { describe, expect, it, vi } from 'vitest'
import { calculateCardStateAfterReview } from '../../utils/sm2'
import { calculateCardStateAfterReviewFSRS } from '../../utils/fsrs'
import { createNewCard } from '../fixtures/cardFixtures'

describe('Review Flow Integration', () => {
  it('SM2: new -> learning -> review on two Good ratings', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-13T10:00:00.000Z'))

    const newCard = createNewCard({ type: 0, queue: 0, reps: 0, interval: 0 })
    const step1 = calculateCardStateAfterReview(newCard, 3)

    expect(step1.type).toBe(1)
    expect(step1.queue).toBe(1)
    expect(step1.interval).toBe(0)
    expect(step1.reps).toBe(1)
    expect(step1.dueAt).toBeGreaterThan(Date.now())

    const step2 = calculateCardStateAfterReview({ ...newCard, ...step1 }, 3)

    expect(step2.type).toBe(2)
    expect(step2.queue).toBe(2)
    expect(step2.interval).toBe(1)
    expect(step2.reps).toBe(2)
  })

  it('SM2: review Again moves card to relearning and increments lapses', () => {
    const reviewCard = createNewCard({
      type: 2,
      queue: 2,
      reps: 5,
      lapses: 1,
      interval: 12,
      factor: 2500,
    })

    const result = calculateCardStateAfterReview(reviewCard, 1)

    expect(result.type).toBe(3)
    expect(result.queue).toBe(1)
    expect(result.interval).toBe(0)
    expect(result.lapses).toBe(2)
    // In SM2 review lapse path reps are preserved.
    expect(result.reps).toBe(5)
  })

  it('FSRS: Hard/Good/Easy preserve review state and produce ordered intervals', () => {
    const base = createNewCard({
      type: 2,
      queue: 2,
      reps: 8,
      lapses: 1,
      interval: 10,
      stability: 12,
      difficulty: 5,
    })

    const hard = calculateCardStateAfterReviewFSRS(base, 2)
    const good = calculateCardStateAfterReviewFSRS(base, 3)
    const easy = calculateCardStateAfterReviewFSRS(base, 4)

    expect(hard.type).toBe(2)
    expect(good.type).toBe(2)
    expect(easy.type).toBe(2)

    expect(hard.queue).toBe(2)
    expect(good.queue).toBe(2)
    expect(easy.queue).toBe(2)

    expect(hard.interval).toBeLessThanOrEqual(good.interval)
    expect(good.interval).toBeLessThanOrEqual(easy.interval)
  })

  it('FSRS: review Again keeps review state and increments reps+lapses', () => {
    const base = createNewCard({
      type: 2,
      queue: 2,
      reps: 3,
      lapses: 0,
      interval: 4,
      stability: 3,
      difficulty: 5,
    })

    const result = calculateCardStateAfterReviewFSRS(base, 1)

    expect(result.type).toBe(2)
    expect(result.queue).toBe(2)
    expect(result.reps).toBe(4)
    expect(result.lapses).toBe(1)
    expect(result.interval).toBeGreaterThanOrEqual(1)
    expect(result.dueAt).toBeGreaterThanOrEqual(Date.now())
  })

  it('algorithm switch path remains valid from SM2 output to FSRS input', () => {
    const sm2Card = createNewCard({
      type: 2,
      queue: 2,
      reps: 4,
      lapses: 1,
      interval: 6,
      factor: 2600,
      stability: undefined,
      difficulty: undefined,
    })

    const sm2Result = calculateCardStateAfterReview(sm2Card, 3)
    const fsrsInput = {
      ...sm2Card,
      ...sm2Result,
      algorithm: 'fsrs' as const,
      // Use the same migration fallback semantics as app logic.
      stability: Math.max(0.5, sm2Result.interval || 1),
      difficulty: sm2Result.factor / 500,
    }

    const fsrsResult = calculateCardStateAfterReviewFSRS(fsrsInput, 3)

    expect(fsrsResult.type).toBe(2)
    expect(fsrsResult.queue).toBe(2)
    expect(fsrsResult.stability).toBeGreaterThanOrEqual(0.5)
    expect(fsrsResult.difficulty).toBeGreaterThanOrEqual(1)
    expect(fsrsResult.difficulty).toBeLessThanOrEqual(10)
  })

  it('sequential SM2 ratings keep scheduler fields consistent', () => {
    let card = createNewCard({ type: 0, queue: 0, reps: 0, lapses: 0, interval: 0 })
    const ratings: Array<1 | 2 | 3 | 4> = [3, 3, 4, 1, 3]

    for (const rating of ratings) {
      const next = calculateCardStateAfterReview(card, rating)

      expect(next.queue).toBeGreaterThanOrEqual(0)
      expect(next.queue).toBeLessThanOrEqual(2)
      expect(next.type).toBeGreaterThanOrEqual(0)
      expect(next.type).toBeLessThanOrEqual(3)
      expect(next.dueAt).toBeGreaterThanOrEqual(Date.now())

      card = { ...card, ...next }
    }
  })

  it('throws on invalid ratings for both algorithms', () => {
    const card = createNewCard({ type: 2, queue: 2, reps: 3, interval: 3 })

    expect(() => calculateCardStateAfterReview(card, 0 as unknown as 1 | 2 | 3 | 4)).toThrow(RangeError)
    expect(() => calculateCardStateAfterReview(card, 5 as unknown as 1 | 2 | 3 | 4)).toThrow(RangeError)

    expect(() => calculateCardStateAfterReviewFSRS(card, 0 as unknown as 1 | 2 | 3 | 4)).toThrow(RangeError)
    expect(() => calculateCardStateAfterReviewFSRS(card, 5 as unknown as 1 | 2 | 3 | 4)).toThrow(RangeError)
  })
})
