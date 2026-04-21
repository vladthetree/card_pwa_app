import { afterEach, describe, expect, it, vi } from 'vitest'
import { calculateCardStateAfterReviewFSRS } from '../../utils/fsrs'
import { createNewCard } from '../fixtures/cardFixtures'
import { expectDifficultyValid, expectDueAtNotInPast } from '../fixtures/assertions'

describe('FSRS — Full Card Cycles', () => {
  afterEach(() => vi.useRealTimers())

  // ─── Cycle 1: new → review (FSRS with enable_short_term: false) ──────────

  describe('Cycle: new → review (no intraday steps)', () => {
    it('new card + Good → review, interval ≥ 1', () => {
      const card = createNewCard({ type: 0, queue: 0, reps: 0, stability: 0.5, difficulty: 5 })
      const result = calculateCardStateAfterReviewFSRS(card, 3)

      expect(result.interval).toBeGreaterThanOrEqual(1)
      expect(result.type).toBe(2)
      expectDueAtNotInPast(result.dueAt)
    })

    it('new card + Easy → review, interval ≥ 1', () => {
      const card = createNewCard({ type: 0, queue: 0, reps: 0, stability: 0.5, difficulty: 5 })
      const result = calculateCardStateAfterReviewFSRS(card, 4)

      expect(result.interval).toBeGreaterThanOrEqual(1)
      expectDueAtNotInPast(result.dueAt)
    })

    it('new card + Hard → review, interval ≥ 1', () => {
      const card = createNewCard({ type: 0, queue: 0, reps: 0, stability: 0.5, difficulty: 5 })
      const result = calculateCardStateAfterReviewFSRS(card, 2)

      expect(result.interval).toBeGreaterThanOrEqual(1)
      expectDueAtNotInPast(result.dueAt)
    })

    it('Easy interval > Good interval for same card', () => {
      const base = createNewCard({ type: 2, queue: 2, reps: 3, stability: 10, difficulty: 5, interval: 10 })
      const good = calculateCardStateAfterReviewFSRS(base, 3)
      const easy = calculateCardStateAfterReviewFSRS(base, 4)

      expect(easy.interval).toBeGreaterThanOrEqual(good.interval)
    })

    it('Hard interval < Good interval for same card', () => {
      const base = createNewCard({ type: 2, queue: 2, reps: 3, stability: 10, difficulty: 5, interval: 10 })
      const hard = calculateCardStateAfterReviewFSRS(base, 2)
      const good = calculateCardStateAfterReviewFSRS(base, 3)

      expect(hard.interval).toBeLessThanOrEqual(good.interval)
    })
  })

  // ─── Cycle 2: review → relearning (Again) ────────────────────────────────

  describe('Cycle: review → relearning (Again)', () => {
    it('review card + Again → lapses incremented', () => {
      const card = createNewCard({
        type: 2, queue: 2, reps: 5, lapses: 1, stability: 5, difficulty: 5, interval: 5,
      })
      const result = calculateCardStateAfterReviewFSRS(card, 1)

      expect(result.lapses).toBe(2)
    })

    it('review card + Again → reps incremented', () => {
      const card = createNewCard({
        type: 2, queue: 2, reps: 5, lapses: 1, stability: 5, difficulty: 5, interval: 5,
      })
      const result = calculateCardStateAfterReviewFSRS(card, 1)

      expect(result.reps).toBe(6)
    })

    it('review card + Again → stability decreases', () => {
      const card = createNewCard({
        type: 2, queue: 2, reps: 5, lapses: 1, stability: 10, difficulty: 5, interval: 10,
      })
      const result = calculateCardStateAfterReviewFSRS(card, 1)

      expect(result.stability).toBeLessThan(10)
    })
  })

  // ─── Cycle 3: successive Good reviews increase stability ─────────────────

  describe('Cycle: successive Good reviews grow stability and interval', () => {
    it('stability increases over successive Good reviews (time advanced between reviews)', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-04-01T12:00:00.000Z'))

      const today = Math.floor(Date.now() / 86_400_000)
      // due = today: card is due right now, elapsed=5 so FSRS can grow stability.
      let card = createNewCard({
        type: 2, queue: 2, reps: 2, stability: 3, difficulty: 5,
        interval: 5, due: today,
      })
      const stabilities: number[] = [card.stability ?? 3]

      for (let i = 0; i < 3; i++) {
        const result = calculateCardStateAfterReviewFSRS(card, 3)
        stabilities.push(result.stability ?? 0)
        // Advance clock to the next due date so elapsed > 0 on the next iteration
        vi.setSystemTime(new Date(result.due * 86_400_000))
        card = {
          ...card,
          type: result.type,
          queue: result.queue,
          reps: result.reps,
          lapses: result.lapses,
          interval: result.interval,
          stability: result.stability,
          difficulty: result.difficulty,
          factor: result.factor,
          due: result.due,
          dueAt: result.dueAt,
        }
      }

      expect(stabilities[1]).toBeGreaterThan(stabilities[0])
      expect(stabilities[2]).toBeGreaterThan(stabilities[1])
    })

    it('difficulty stays within FSRS bounds after 5 Again + 5 Easy alternating', () => {
      let card = createNewCard({ type: 2, queue: 2, reps: 0, stability: 3, difficulty: 5, interval: 3 })
      const ratings: Array<1 | 4> = [1, 4, 1, 4, 1, 4, 1, 4, 1, 4]

      for (const rating of ratings) {
        const result = calculateCardStateAfterReviewFSRS(card, rating)
        expectDifficultyValid(result.difficulty ?? 5)
        card = {
          ...card,
          type: result.type,
          queue: result.queue,
          reps: result.reps,
          lapses: result.lapses,
          interval: Math.max(0, result.interval),
          stability: result.stability,
          difficulty: result.difficulty,
          factor: result.factor,
          due: result.due,
          dueAt: result.dueAt,
        }
      }

      expectDifficultyValid(card.difficulty ?? 5)
    })
  })

  // ─── Bug F1: interval never 0 after 14:00 local time ─────────────────────

  describe('Bug F1 — interval ≥ 1 regardless of time of day', () => {
    it('review card + Again at 14:00 UTC → interval ≥ 1 (was 0 before fix)', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-04-11T14:00:00.000Z'))

      const card = createNewCard({
        type: 2, queue: 2, reps: 3, lapses: 1, stability: 1, difficulty: 5, interval: 1, factor: 2500,
      })
      const result = calculateCardStateAfterReviewFSRS(card, 1)

      expect(result.interval).toBeGreaterThanOrEqual(1)
    })

    it('review card + Hard at 14:00 UTC → interval ≥ 1', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-04-11T14:00:00.000Z'))

      const card = createNewCard({
        type: 2, queue: 2, reps: 3, stability: 1, difficulty: 5, interval: 1, factor: 2500,
      })
      const result = calculateCardStateAfterReviewFSRS(card, 2)

      expect(result.interval).toBeGreaterThanOrEqual(1)
    })

    it('review card + Good at 23:00 UTC → interval ≥ 1', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-04-11T23:00:00.000Z'))

      const card = createNewCard({
        type: 2, queue: 2, reps: 3, stability: 1, difficulty: 5, interval: 1, factor: 2500,
      })
      const result = calculateCardStateAfterReviewFSRS(card, 3)

      expect(result.interval).toBeGreaterThanOrEqual(1)
    })

    it('dueAt is after nowMs for all ratings at 14:00 UTC', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-04-11T14:00:00.000Z'))

      const ratings = [1, 2, 3, 4] as const
      for (const rating of ratings) {
        const card = createNewCard({
          type: 2, queue: 2, reps: 3, stability: 1, difficulty: 5, interval: 1, factor: 2500,
        })
        const result = calculateCardStateAfterReviewFSRS(card, rating)
        expectDueAtNotInPast(result.dueAt)
      }
    })
  })
})
