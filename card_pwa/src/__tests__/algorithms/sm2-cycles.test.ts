import { afterEach, describe, expect, it, vi } from 'vitest'
import { calculateCardStateAfterReview } from '../../utils/sm2'
import { createNewCard, createLearningCard } from '../fixtures/cardFixtures'
import { expectDueAtOnLocalDayOffset, expectDueAtNotInPast } from '../fixtures/assertions'

describe('SM2 — Full Card Cycles', () => {
  afterEach(() => vi.useRealTimers())

  // ─── Cycle 1: new → learning → review (Good path) ───────────────────────

  describe('Cycle: new → learning → review (Good path)', () => {
    it('new card + Good → learning, reps=1, intraday dueAt (~10 min)', () => {
      const card = createNewCard({ type: 0, queue: 0, reps: 0 })
      const result = calculateCardStateAfterReview(card, 3)

      expect(result.type).toBe(1)          // LEARNING
      expect(result.reps).toBe(1)
      expect(result.interval).toBe(0)      // intraday — no day interval yet
      expect(result.dueAt).toBeGreaterThan(Date.now())
      expect(result.dueAt).toBeLessThan(Date.now() + 12 * 60_000) // within 12 min
    })

    it('learning card (reps=1) + Good → review, interval=1 (Bug 2 fix: was 3)', () => {
      const card = createLearningCard({ reps: 1 })
      const result = calculateCardStateAfterReview(card, 3)

      expect(result.type).toBe(2)          // REVIEW
      expect(result.interval).toBe(1)      // graduatingInterval = 1, was hardcoded to 3
      expect(result.reps).toBe(2)
    })

    it('graduated dueAt uses local midnight as base, not UTC epoch (Bug 4 fix)', () => {
      const card = createLearningCard({ reps: 1 })
      const result = calculateCardStateAfterReview(card, 3)

      expect(result.type).toBe(2)
      expectDueAtOnLocalDayOffset(result.dueAt, result.interval)
    })

    it('graduated dueAt is never in the past', () => {
      const card = createLearningCard({ reps: 1 })
      const result = calculateCardStateAfterReview(card, 3)

      expectDueAtNotInPast(result.dueAt)
    })
  })

  // ─── Cycle 2: new → review (Easy direct graduation) ──────────────────────

  describe('Cycle: new → review (Easy path)', () => {
    it('new card + Easy → review immediately, interval=4 (easyInterval)', () => {
      const card = createNewCard({ type: 0, queue: 0, reps: 0 })
      const result = calculateCardStateAfterReview(card, 4)

      expect(result.type).toBe(2)
      expect(result.interval).toBe(4)
      expect(result.reps).toBe(1)
      expectDueAtOnLocalDayOffset(result.dueAt, 4)
    })

    it('Easy dueAt is not in the past', () => {
      const card = createNewCard({ type: 0, queue: 0, reps: 0 })
      const result = calculateCardStateAfterReview(card, 4)

      expectDueAtNotInPast(result.dueAt)
    })
  })

  // ─── Cycle 3: new → learning → review (Hard graduating) ──────────────────

  describe('Cycle: new → learning → review (Hard graduating)', () => {
    it('new card + Hard → learning, reps=1', () => {
      const card = createNewCard({ type: 0, queue: 0, reps: 0 })
      const result = calculateCardStateAfterReview(card, 2)

      expect(result.type).toBe(1)
      expect(result.reps).toBe(1)
    })

    it('learning card (reps=1) + Hard → review, interval=1 (hardGraduatingInterval — Bug 2 fix: was 2)', () => {
      const card = createLearningCard({ reps: 1 })
      const result = calculateCardStateAfterReview(card, 2)

      expect(result.type).toBe(2)
      expect(result.interval).toBe(1)      // hardGraduatingInterval = 1, was hardcoded to 2
      expectDueAtOnLocalDayOffset(result.dueAt, 1)
    })
  })

  // ─── Cycle 4: review → relearning (Again/Lapse path) ─────────────────────

  describe('Cycle: review → relearning (Again path)', () => {
    it('new card + Again → learning reset, lapses=1, dueAt ~1 min from now', () => {
      const card = createNewCard({ type: 0, queue: 0, reps: 0, lapses: 0 })
      const result = calculateCardStateAfterReview(card, 1)

      expect(result.type).toBe(1)          // back to LEARNING
        expect(result.lapses).toBe(0)
      expect(result.reps).toBe(0)          // reps reset
      expect(result.dueAt).toBeGreaterThan(Date.now())
      expect(result.dueAt).toBeLessThan(Date.now() + 3 * 60_000)
    })

    it('review card + Again → relearning (type=3), lapses incremented', () => {
      const card = createNewCard({ type: 2, queue: 2, reps: 5, lapses: 1, interval: 10, factor: 2500 })
      const result = calculateCardStateAfterReview(card, 1)

      expect(result.type).toBe(3)          // RELEARNING
      expect(result.lapses).toBe(2)
      expect(result.interval).toBe(0)      // intraday step
      expect(result.dueAt).toBeGreaterThan(Date.now())
    })

    it('After lapse, review card reps are NOT reset (different from new card Again)', () => {
      const card = createNewCard({ type: 2, queue: 2, reps: 5, lapses: 0, interval: 10, factor: 2500 })
      const result = calculateCardStateAfterReview(card, 1)

      // Review lapse does NOT reset reps — only learning path resets
      expect(result.reps).toBe(5)
    })
  })

  // ─── Cycle 5: relearning → review regraduation ───────────────────────────

  describe('Cycle: relearning → review (regraduation)', () => {
    it('relearning card (reps≥2) + Good → back to review, interval > 0', () => {
      const card = createNewCard({ type: 3, queue: 1, reps: 3, lapses: 1, interval: 0, factor: 2500 })
      const result = calculateCardStateAfterReview(card, 3)

      expect(result.type).toBe(2)          // back to REVIEW
      expect(result.interval).toBeGreaterThanOrEqual(1)
    })
  })

  // ─── Bug 4: Late-evening review must not produce dueAt in the past ────────

  describe('Bug 4 — late-evening local time dueAt', () => {
    it('dueAt at 22:00 local (20:00 UTC) is not in the past after graduating Good', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-04-11T20:00:00.000Z'))

      const card = createLearningCard({ reps: 1 })
      const result = calculateCardStateAfterReview(card, 3)

      expect(result.type).toBe(2)
      expectDueAtOnLocalDayOffset(result.dueAt, result.interval)
      expectDueAtNotInPast(result.dueAt)
    })

    it('dueAt for Easy at 22:00 local is not in the past', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-04-11T20:00:00.000Z'))

      const card = createNewCard({ type: 0, queue: 0, reps: 0 })
      const result = calculateCardStateAfterReview(card, 4)

      expectDueAtOnLocalDayOffset(result.dueAt, 4)
      expectDueAtNotInPast(result.dueAt)
    })
  })

  // ─── Review cycle: multi-step Good review progression ────────────────────

  describe('Review cycle: interval growth over multiple Good reviews', () => {
    it('review interval grows on successive Good ratings', () => {
      let card = createNewCard({ type: 2, queue: 2, reps: 2, factor: 2500, interval: 3 })
      const intervals: number[] = [card.interval]

      for (let i = 0; i < 3; i++) {
        const result = calculateCardStateAfterReview(card, 3)
        intervals.push(result.interval)
        // carry state forward
        card = {
          ...card,
          type: result.type,
          queue: result.queue,
          reps: result.reps,
          lapses: result.lapses,
          interval: result.interval,
          factor: result.factor,
          due: result.due,
          dueAt: result.dueAt,
        }
      }

      // Each Good rating should increase the interval
      expect(intervals[1]).toBeGreaterThan(intervals[0])
      expect(intervals[2]).toBeGreaterThan(intervals[1])
      expect(intervals[3]).toBeGreaterThan(intervals[2])
    })
  })
})
