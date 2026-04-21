import { expect } from 'vitest'

/**
 * Custom assertion: Ease factor within SM2 bounds (1300-5000)
 */
export function expectEaseWithinBounds(factor: number): void {
  expect(factor).toBeGreaterThanOrEqual(1300)
  expect(factor).toBeLessThanOrEqual(5000)
}

/**
 * Custom assertion: Stability valid (≥0.5)
 */
export function expectStabilityValid(stability: number): void {
  expect(stability).toBeGreaterThanOrEqual(0.5)
  expect(typeof stability).toBe('number')
  expect(Number.isNaN(stability)).toBe(false)
}

/**
 * Custom assertion: Difficulty within FSRS bounds (1-10)
 */
export function expectDifficultyValid(difficulty: number): void {
  expect(difficulty).toBeGreaterThanOrEqual(1)
  expect(difficulty).toBeLessThanOrEqual(10)
}

/**
 * Custom assertion: Interval increased after review
 */
export function expectIntervalIncreased(
  beforeInterval: number,
  afterInterval: number,
  rating: 1 | 2 | 3 | 4
): void {
  if (rating === 1) {
    // Again: interval resets to 1
    expect(afterInterval).toBe(1)
  } else {
    // Hard, Good, Easy: interval stays same or increases
    expect(afterInterval).toBeGreaterThanOrEqual(beforeInterval)
  }
}

/**
 * Custom assertion: Type transition is valid
 */
export function expectTypeTransition(
  before: number,
  after: number,
  rating: 1 | 2 | 3 | 4
): void {
  // Valid transitions based on rating
  if (before === 0) {
    // New → Learning or Review
    expect([1, 2]).toContain(after)
  } else if (before === 1) {
    // Learning → Review or back to Learning
    expect([1, 2]).toContain(after)
  } else if (before === 2) {
    // Review → Review or Relearning
    if (rating === 1) {
      expect(after).toBe(3) // Relearning on Again
    } else {
      expect([2]).toContain(after)
    }
  }
}

/**
 * Custom assertion: Reps incremented
 */
export function expectRepsIncremented(before: number, after: number): void {
  expect(after).toBe(before + 1)
}

/**
 * Custom assertion: Lapses only on rating 1
 */
export function expectLapsesOrUnchanged(
  before: number,
  after: number,
  rating: 1 | 2 | 3 | 4
): void {
  if (rating === 1) {
    expect(after).toBe(before + 1)
  } else {
    expect(after).toBe(before)
  }
}

/**
 * Custom assertion: Due date is in future
 */
export function expectDueInFuture(dueDate: number, interval: number): void {
  const today = Math.floor(Date.now() / 86400000)
  const expectedDue = today + interval
  expect(dueDate).toBe(expectedDue)
}

/**
 * Custom assertion: dueAt is anchored to local midnight + intervalDays * 86400000 (Bug 4 fix).
 * Uses the same calculation as sm2.ts after the fix.
 */
export function expectDueAtOnLocalDayOffset(dueAt: number, intervalDays: number): void {
  const localMidnight = new Date()
  localMidnight.setHours(0, 0, 0, 0)
  const expected = localMidnight.getTime() + intervalDays * 86_400_000
  expect(dueAt).toBe(expected)
}

/**
 * Custom assertion: dueAt is not in the past (guards against UTC off-by-one on late-evening reviews).
 */
export function expectDueAtNotInPast(dueAt: number): void {
  expect(dueAt).toBeGreaterThanOrEqual(Date.now())
}
