import { describe, it, expect } from 'vitest'
import { calculateCardStateAfterReviewFSRS } from '../../utils/fsrs'
import { createNewCard } from '../fixtures/cardFixtures'
import { expectDifficultyValid } from '../fixtures/assertions'

describe('FSRS Algorithm', () => {
  describe('Core behavior', () => {
    it('keeps review state on rating 1 in current FSRS integration', () => {
      const card = createNewCard({ stability: 3, difficulty: 5, reps: 5, lapses: 2, type: 2, queue: 2 })
      const result = calculateCardStateAfterReviewFSRS(card, 1)

      expect(result.interval).toBeGreaterThanOrEqual(1)
      expect(result.dueAt).toBeGreaterThan(Date.now())
      expect(result.type).toBe(2)
      expect(result.queue).toBe(2)
      expect(result.lapses).toBe(3)
      expect(result.reps).toBe(6)
    })

    it('should keep review state and increment reps on ratings 2-4', () => {
      ;([2, 3, 4] as const).forEach((rating) => {
        const card = createNewCard({ stability: 3, difficulty: 5, reps: 5, lapses: 2, type: 2, queue: 2 })
        const result = calculateCardStateAfterReviewFSRS(card, rating)

        expect(result.type).toBe(2)
        expect(result.queue).toBe(2)
        expect(result.reps).toBe(6)
        expect(result.lapses).toBe(2)
      })
    })

    it('always returns interval >= 1 and due mapped to current day + interval', () => {
      const card = createNewCard({ stability: 3, difficulty: 5, reps: 2, type: 2, queue: 2 })
      const result = calculateCardStateAfterReviewFSRS(card, 4)

      expect(typeof result.interval).toBe('number')
      expect(Number.isNaN(result.interval)).toBe(false)
      expect(result.interval).toBeGreaterThanOrEqual(1)
      const today = Math.floor(Date.now() / 86400000)
      expect(result.due).toBe(today + result.interval)
      expect(result.dueAt).toBeGreaterThan(Date.now())
    })
  })

  describe('Difficulty handling', () => {
    it('should keep difficulty within [1, 10]', () => {
      const low = calculateCardStateAfterReviewFSRS(
        createNewCard({ stability: 3, difficulty: 1, reps: 2, type: 2, queue: 2 }),
        1,
      )
      const high = calculateCardStateAfterReviewFSRS(
        createNewCard({ stability: 3, difficulty: 10, reps: 2, type: 2, queue: 2 }),
        4,
      )

      expect(low.difficulty).toBeGreaterThanOrEqual(1)
      expect(high.difficulty).toBeLessThanOrEqual(10)
      expectDifficultyValid(low.difficulty)
      expectDifficultyValid(high.difficulty)
    })

    it('should initialize difficulty from factor when difficulty is missing', () => {
      const card = createNewCard({ stability: 3, difficulty: undefined, factor: 2500, reps: 2, type: 2, queue: 2 })
      const result = calculateCardStateAfterReviewFSRS(card, 3)

      expect(result.difficulty).toBeCloseTo(5, 1)
      expect(result.factor).toBe(Math.round(result.difficulty * 500))
      expectDifficultyValid(result.difficulty)
    })

    it('should initialize difficulty from default factor fallback when both missing', () => {
      const card = createNewCard({ stability: 3, difficulty: undefined, factor: undefined, reps: 0, type: 0, queue: 0 })
      const result = calculateCardStateAfterReviewFSRS(card, 3)

      expect(result.difficulty).toBeCloseTo(5, 1)
      expectDifficultyValid(result.difficulty)
    })
  })

  describe('Stability inputs and outputs', () => {
    it('should use interval as fallback stability when stability is missing', () => {
      const card = createNewCard({ stability: undefined, interval: 4, difficulty: 5, reps: 2, type: 2, queue: 2 })
      const result = calculateCardStateAfterReviewFSRS(card, 2)

      expect(typeof result.stability).toBe('number')
      expect(Number.isNaN(result.stability)).toBe(false)
    })

    it('enforces minimum initial stability fallback at 0.5 and keeps day-based interval', () => {
      const card = createNewCard({ stability: undefined, interval: 0, difficulty: 5, reps: 0, type: 0, queue: 0 })
      const result = calculateCardStateAfterReviewFSRS(card, 1)

      expect(result.interval).toBeGreaterThanOrEqual(1)
      expect(result.dueAt).toBeGreaterThan(Date.now())
      expect(typeof result.stability).toBe('number')
      expect(Number.isNaN(result.stability)).toBe(false)
    })
  })
})
