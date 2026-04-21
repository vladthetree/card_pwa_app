import { describe, it, expect } from 'vitest'
import { calculateCardStateAfterReview } from '../utils/sm2'
import { calculateCardStateAfterReviewFSRS } from '../utils/fsrs'
import { createNewCard } from './fixtures/cardFixtures'
import { createBatch } from './fixtures/reviewFixtures'

describe('Edge Cases & Bounds', () => {
  describe('Boundary Values', () => {
    it('should handle SM2 ease at minimum boundary (1300)', () => {
      const card = createNewCard({
        factor: 1300,
        reps: 1,
        type: 2,
        queue: 2,
      })
      const result = calculateCardStateAfterReview(card, 1)

      expect(result.factor).toBeGreaterThanOrEqual(1300)
      expect(result.factor).toBeLessThanOrEqual(5000)
    })

    it('should handle SM2 ease at maximum boundary (5000)', () => {
      const card = createNewCard({
        factor: 5000,
        reps: 5,
        type: 2,
        queue: 2,
      })
      const result = calculateCardStateAfterReview(card, 4)

      expect(result.factor).toBeLessThanOrEqual(5000)
    })

    it('should handle FSRS difficulty at minimum (1) and maximum (10)', () => {
      const cardMin = createNewCard({
        stability: 10,
        difficulty: 1,
        reps: 5,
        type: 2,
        queue: 2,
      })
      const cardMax = createNewCard({
        stability: 5,
        difficulty: 10,
        reps: 5,
        type: 2,
        queue: 2,
      })

      const resultMin = calculateCardStateAfterReviewFSRS(cardMin, 4)
      const resultMax = calculateCardStateAfterReviewFSRS(cardMax, 1)

      expect(resultMin.difficulty).toBeGreaterThanOrEqual(1)
      expect(resultMax.difficulty).toBeLessThanOrEqual(10)
    })

    it('should handle very large stability (100+)', () => {
      const card = createNewCard({
        stability: 100,
        difficulty: 5,
        reps: 50,
        type: 2,
        queue: 2,
      })
      const result = calculateCardStateAfterReviewFSRS(card, 3)

      expect(result.stability).toBeGreaterThan(0)
      expect(result.interval).toBeGreaterThan(0)
    })

    it('should handle interval at boundary (0, 1, 999 days)', () => {
      const intervals = [0, 1, 999]

      intervals.forEach(interval => {
        const card = createNewCard({
          interval,
          reps: 1,
          type: 2,
          queue: 2,
        })
        const result = calculateCardStateAfterReview(card, 3)

        expect(result.interval).toBeGreaterThanOrEqual(1)
      })
    })
  })

  describe('Invalid States', () => {
    it('should handle card with negative reps (reset to valid)', () => {
      const card = createNewCard({
        reps: -5,
        type: 2,
        queue: 2,
      })

      // Should not crash; reps should be handled
      const result = calculateCardStateAfterReview(card, 3)
      expect(result.reps).toBeGreaterThanOrEqual(0)
    })

    it('should clamp interval to minimum when negative', () => {
      const card = createNewCard({
        interval: -10,
        reps: 1,
        type: 2,
        queue: 2,
      })
      const result = calculateCardStateAfterReview(card, 3)

      expect(result.interval).toBeGreaterThanOrEqual(1)
    })

    it('should handle NaN in difficulty calculation gracefully', () => {
      const card = createNewCard({
        stability: NaN,
        difficulty: NaN,
        reps: 1,
        type: 2,
        queue: 2,
      })

      // Should initialize to defaults
      const result = calculateCardStateAfterReviewFSRS(card, 3)
      expect(Number.isNaN(result.difficulty)).toBe(false)
    })

    it('should initialize missing stability/difficulty fields', () => {
      const card = createNewCard({
        stability: undefined as any,
        difficulty: undefined as any,
        factor: 2500,
        interval: 20,
        reps: 5,
        type: 2,
        queue: 2,
      })

      const result = calculateCardStateAfterReviewFSRS(card, 3)
      expect(result.stability).toBeDefined()
      expect(result.difficulty).toBeDefined()
    })
  })

  describe('Rating Sequences', () => {
    it('should handle repeated failures (Again→Again→Again)', () => {
      let card: Parameters<typeof calculateCardStateAfterReview>[0] = createNewCard({ reps: 1, type: 2, queue: 2 })

      // First Again
      card = calculateCardStateAfterReview(card, 1)
      expect(card.interval).toBe(0)
      expect(card.lapses).toBe(1)

      // Second Again
      card = calculateCardStateAfterReview(card, 1)
      expect(card.lapses).toBe(2)

      // Third Again
      card = calculateCardStateAfterReview(card, 1)
      expect(card.lapses).toBe(3)
      expect(card.interval).toBe(0)
    })

    it('should handle increasing confidence (Hard→Good→Easy)', () => {
      let card: Parameters<typeof calculateCardStateAfterReview>[0] = createNewCard({ reps: 1, type: 2, queue: 2, factor: 2500 })

      // Hard
      card = calculateCardStateAfterReview(card, 2)
      const hardInterval = card.interval
      expect(hardInterval).toBeGreaterThan(0)

      // Good
      card = calculateCardStateAfterReview(card, 3)
      const goodInterval = card.interval
      expect(goodInterval).toBeGreaterThanOrEqual(hardInterval)

      // Easy
      card = calculateCardStateAfterReview(card, 4)
      const easyInterval = card.interval
      expect(easyInterval).toBeGreaterThanOrEqual(goodInterval)
    })

    it('should handle relearning recovery (Easy→Again→Easy)', () => {
      let card: Parameters<typeof calculateCardStateAfterReview>[0] = createNewCard({
        reps: 5,
        type: 2,
        queue: 2,
        interval: 30,
        lapses: 0,
      })

      // First Easy
      card = calculateCardStateAfterReview(card, 4)

      // Then Again (lapse)
      card = calculateCardStateAfterReview(card, 1)
      expect(card.type).toBe(3) // Relearning
      expect(card.interval).toBe(0)
      expect(card.lapses).toBe(1)

      // Then Easy again
      card = calculateCardStateAfterReview(card, 4)
      expect(card.interval).toBeGreaterThan(0)
    })
  })

  describe('High-load consistency', () => {
    it('keeps scheduler output valid for 100 sequential SM2 reviews', () => {
      let card = createNewCard({ reps: 1, type: 2, queue: 2, interval: 3, factor: 2500 })
      const ratings = createBatch(100).map(entry => entry.rating)

      ratings.forEach((rating) => {
        const next = calculateCardStateAfterReview(card, rating)

        expect(next.type).toBeGreaterThanOrEqual(0)
        expect(next.type).toBeLessThanOrEqual(3)
        expect(next.queue).toBeGreaterThanOrEqual(0)
        expect(next.queue).toBeLessThanOrEqual(2)
        expect(next.factor).toBeGreaterThanOrEqual(1300)
        expect(next.factor).toBeLessThanOrEqual(5000)
        expect(next.dueAt).toBeGreaterThanOrEqual(Date.now())

        card = { ...card, ...next }
      })
    })

    it('keeps scheduler output valid for 100 sequential FSRS reviews', () => {
      let card = createNewCard({
        reps: 3,
        type: 2,
        queue: 2,
        interval: 5,
        stability: 4,
        difficulty: 5,
      })
      const ratings = createBatch(100).map(entry => entry.rating)

      ratings.forEach((rating) => {
        const next = calculateCardStateAfterReviewFSRS(card, rating)

        expect(next.interval).toBeGreaterThanOrEqual(1)
        expect(next.stability).toBeGreaterThanOrEqual(0.5)
        expect(next.difficulty).toBeGreaterThanOrEqual(1)
        expect(next.difficulty).toBeLessThanOrEqual(10)
        expect(next.dueAt).toBeGreaterThanOrEqual(Date.now())

        card = { ...card, ...next }
      })
    })

    it('handles 1000-rep SM2 review card without invalid transitions', () => {
      const card = createNewCard({
        reps: 1000,
        type: 2,
        queue: 2,
        interval: 365,
        factor: 2500,
      })

      const result = calculateCardStateAfterReview(card, 3)

      expect(result.type).toBe(2)
      expect(result.queue).toBe(2)
      expect(result.interval).toBeGreaterThan(card.interval)
      expect(result.reps).toBe(1001)
    })
  })
})
