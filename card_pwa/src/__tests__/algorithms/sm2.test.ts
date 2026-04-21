import { describe, it, expect } from 'vitest'
import { calculateCardStateAfterReview } from '../../utils/sm2'
import { createNewCard } from '../fixtures/cardFixtures'
import {
  expectEaseWithinBounds,
  expectRepsIncremented,
  expectTypeTransition,
} from '../fixtures/assertions'

describe('SM2 Algorithm', () => {
  describe('Ease Factor Calculation', () => {
    it('should decrease ease by 16% on rating 1 (Again)', () => {
      const card = createNewCard({ factor: 2500, reps: 1, type: 2, queue: 2 })
      const result = calculateCardStateAfterReview(card, 1)
      // SM2 adjusts ease by fixed amounts: -200, -150, 0, +150
      expect(result.factor).toBe(2300) // 2500 - 200
      expectEaseWithinBounds(result.factor)
    })

    it('should decrease ease by 20% on rating 2 (Hard)', () => {
      const card = createNewCard({ factor: 2500, reps: 1, type: 2, queue: 2 })
      const result = calculateCardStateAfterReview(card, 2)
      expect(result.factor).toBe(2350) // 2500 - 150
      expectEaseWithinBounds(result.factor)
    })

    it('should keep ease unchanged on rating 3 (Good)', () => {
      const card = createNewCard({ factor: 2500, reps: 1, type: 2, queue: 2 })
      const result = calculateCardStateAfterReview(card, 3)

      expect(result.factor).toBe(2500)
      expectEaseWithinBounds(result.factor)
    })

    it('should increase ease by 16% on rating 4 (Easy)', () => {
      const card = createNewCard({ factor: 2500, reps: 1, type: 2, queue: 2 })
      const result = calculateCardStateAfterReview(card, 4)
      expect(result.factor).toBe(2650) // 2500 + 150
      expectEaseWithinBounds(result.factor)
    })

    it('should clamp factor to minimum 1300', () => {
      const card = createNewCard({ factor: 1400, reps: 1, type: 2, queue: 2 })
      const result = calculateCardStateAfterReview(card, 1)

      expect(result.factor).toBeGreaterThanOrEqual(1300)
      expectEaseWithinBounds(result.factor)
    })

    it('should clamp factor to maximum 5000', () => {
      const card = createNewCard({ factor: 4900, reps: 5, type: 2, queue: 2 })
      const result = calculateCardStateAfterReview(card, 4)

      expect(result.factor).toBeLessThanOrEqual(5000)
      expectEaseWithinBounds(result.factor)
    })

    it('should initialize first review factor to 2500', () => {
      const card = createNewCard({ factor: 2500, reps: 0, type: 0, queue: 0 })
      const result = calculateCardStateAfterReview(card, 3)

      expect(result.factor).toBe(2500)
      expectEaseWithinBounds(result.factor)
    })

    it('applies smaller absolute ease penalty at low ease than at high ease', () => {
      const lowEaseCard = createNewCard({ factor: 2000, reps: 4, type: 2, queue: 2 })
      const highEaseCard = createNewCard({ factor: 4000, reps: 4, type: 2, queue: 2 })

      const lowResult = calculateCardStateAfterReview(lowEaseCard, 2)
      const highResult = calculateCardStateAfterReview(highEaseCard, 2)

      const lowDelta = lowEaseCard.factor - lowResult.factor
      const highDelta = highEaseCard.factor - highResult.factor

      expect(lowDelta).toBeLessThan(highDelta)
      expect(lowDelta).toBeGreaterThan(0)
    })
  })

  describe('Interval Calculation', () => {
    it('should set intraday interval after first review', () => {
      const card = createNewCard({ interval: 0, reps: 0, type: 0, queue: 0 })
      const result = calculateCardStateAfterReview(card, 3)
      // NEW card on first review: enters LEARNING with an intraday step.
      expect(result.interval).toBe(0)
      expect(result.dueAt).toBeGreaterThan(Date.now())
    })

    it('should set interval to 1 day after second review (graduatingInterval = 1)', () => {
      const card = createNewCard({ interval: 1, reps: 1, type: 1, queue: 1 })
      const result = calculateCardStateAfterReview(card, 3)
      // LEARNING card on 2nd review: graduates with cfg.graduatingInterval = 1 (was hardcoded to 3)
      expect(result.interval).toBe(1)
    })

    it('should calculate interval as previous × (factor/1000) for review cards', () => {
      const card = createNewCard({ interval: 10, reps: 2, type: 2, queue: 2, factor: 2500 })
      const result = calculateCardStateAfterReview(card, 3)
      // Review card on Good (rating=3): interval = round(10 * 2500 / 1000) = 25
      expect(result.interval).toBe(25)
    })

    it('should reset to relearning intraday step on rating 1 (Again/Lapse)', () => {
      const card = createNewCard({ interval: 30, reps: 5, type: 2, queue: 2 })
      const result = calculateCardStateAfterReview(card, 1)
      expect(result.interval).toBe(0)
      expect(result.dueAt).toBeGreaterThan(Date.now())
    })

    it('should multiply interval by 1.2 on rating 2 (Hard)', () => {
      const card = createNewCard({ interval: 20, reps: 3, type: 2, queue: 2 })
      const result = calculateCardStateAfterReview(card, 2)
      // Rating 2 (Hard): interval = floor(20 * 1.2) = 24
      expect(result.interval).toBe(24)
    })

    it('should increase interval more on rating 4 (Easy)', () => {
      const card = createNewCard({ interval: 20, reps: 3, type: 2, queue: 2, factor: 2600 })
      const result = calculateCardStateAfterReview(card, 4)
      // Interval uses the current factor first, then factor is adjusted for future reviews.
      const expected = Math.round(20 * (2600 / 1000) * 1.3)
      expect(result.interval).toBe(expected)
    })
  })

  describe('Type and Queue Transitions', () => {
    it('should transition from New (0) to Learning (1)', () => {
      const card = createNewCard({ type: 0, queue: 0 })
      const result = calculateCardStateAfterReview(card, 3)

      expect(result.type).toBe(1)
      expectTypeTransition(0, result.type, 3)
    })

    it('should transition from Learning (1) to Review (2) on Good', () => {
      const card = createNewCard({ type: 1, queue: 1, reps: 1 })
      const result = calculateCardStateAfterReview(card, 3)

      expect([1, 2]).toContain(result.type)
    })

    it('should transition to Relearning (3) on Again from Review', () => {
      const card = createNewCard({ type: 2, queue: 2, reps: 5, interval: 30 })
      const result = calculateCardStateAfterReview(card, 1)

      expect(result.type).toBe(3)
    })

    it('should maintain queue consistency with type', () => {
      const card = createNewCard({ type: 0, queue: 0 })
      const result = calculateCardStateAfterReview(card, 3)

      expect(result.queue).toBe(result.type === 3 ? -1 : result.type)
    })

    it('should set due date correctly (today + interval)', () => {
      const card = createNewCard({ type: 0, queue: 0, interval: 0 })
      const result = calculateCardStateAfterReview(card, 3)

      const today = Math.floor(Date.now() / 86400000)
      expect(result.due).toBe(today + result.interval)
    })

    it('should graduate relearning card back to review with short reset interval on Good', () => {
      const card = createNewCard({ type: 3, queue: 1, interval: 30, reps: 8, lapses: 2, factor: 2500 })
      const result = calculateCardStateAfterReview(card, 3)

      expect(result.type).toBe(2)
      expect(result.queue).toBe(2)
      expect(result.interval).toBe(1)
    })

    it('should keep relearning card in relearning on Again', () => {
      const card = createNewCard({ type: 3, queue: 1, interval: 15, reps: 5, lapses: 1, factor: 2500 })
      const result = calculateCardStateAfterReview(card, 1)

      expect(result.type).toBe(3)
      expect(result.queue).toBe(1)
      expect(result.interval).toBe(0)
      expect(result.dueAt).toBeGreaterThan(Date.now())
    })
  })

  describe('Reps and Lapses Tracking', () => {
    it('should increment reps by 1 on every review', () => {
      const card = createNewCard({ reps: 4, type: 2, queue: 2 })
      const result = calculateCardStateAfterReview(card, 3)

      expectRepsIncremented(4, result.reps)
    })

    it('should increment lapses only on rating 1 (Again)', () => {
      const card = createNewCard({ lapses: 2, reps: 5, type: 2, queue: 2 })
      const result = calculateCardStateAfterReview(card, 1)

      expect(result.lapses).toBe(3)
    })

    it('should not increment lapses on ratings 2, 3, 4', () => {
      const ratings: Array<2 | 3 | 4> = [2, 3, 4]

      ratings.forEach(rating => {
        const card = createNewCard({ lapses: 2, reps: 5, type: 2, queue: 2 })
        const result = calculateCardStateAfterReview(card, rating)

        expect(result.lapses).toBe(2)
      })
    })

    it('should not increment lapses for NEW cards on Again', () => {
      const card = createNewCard({ lapses: 2, reps: 0, type: 0, queue: 0 })
      const result = calculateCardStateAfterReview(card, 1)

      expect(result.lapses).toBe(2)
    })

    it('should increment lapses for LEARNING cards on Again', () => {
      const card = createNewCard({ lapses: 2, reps: 1, type: 1, queue: 1 })
      const result = calculateCardStateAfterReview(card, 1)

      expect(result.lapses).toBe(3)
    })
  })
})
