/**
 * Pure helper functions for the Backlog Smoother (README §5).
 *
 * Trigger condition: overdueCount > BACKLOG_TRIGGER_MULTIPLIER × sessionLimit
 * Spread: distribute excess cards (sorted by highest stability first) over
 *         BACKLOG_SPREAD_DAYS days with ±BACKLOG_FUZZ_FACTOR relative fuzz.
 *
 * All functions are pure and accept an optional `rng` parameter so unit tests
 * can use a deterministic pseudo-random source.
 */

export const BACKLOG_TRIGGER_MULTIPLIER = 3
export const BACKLOG_SPREAD_DAYS = 14
export const BACKLOG_FUZZ_FACTOR = 0.05

/**
 * Returns true when the smoother should fire.
 */
export function shouldSmoothBacklog(overdueCount: number, sessionLimit: number): boolean {
  return overdueCount > BACKLOG_TRIGGER_MULTIPLIER * sessionLimit
}

/**
 * Returns the target day offset (1-based, within [1, spreadDays]) for the
 * card at position `index` in an array of `total` cards to distribute.
 *
 * Cards are sorted highest-stability-first, so index 0 (most stable, can
 * wait longest) maps to the far end of the window; index total-1 maps to day 1.
 */
export function targetDayForIndex(
  index: number,
  total: number,
  spreadDays = BACKLOG_SPREAD_DAYS,
): number {
  if (total <= 0 || spreadDays <= 0) return 1
  // Linear mapping: index 0 → spreadDays, index total-1 → 1
  return Math.max(1, spreadDays - Math.floor((index * spreadDays) / total))
}

/**
 * Applies relative fuzz of ±fuzzFactor to a day offset.
 * `rng` must return a value in [0, 1).
 */
export function applyDayFuzz(
  targetDay: number,
  fuzzFactor = BACKLOG_FUZZ_FACTOR,
  rng: () => number = Math.random,
): number {
  const fuzz = rng() * 2 * fuzzFactor - fuzzFactor // in [-fuzzFactor, +fuzzFactor)
  return Math.max(1, targetDay + Math.round(targetDay * fuzz))
}

/**
 * Computes the new due day (days since Unix epoch) for a card to be
 * redistributed. Combines position-based spread + fuzz in one call.
 */
export function computeNewDueDay(
  index: number,
  total: number,
  todayDays: number,
  spreadDays = BACKLOG_SPREAD_DAYS,
  fuzzFactor = BACKLOG_FUZZ_FACTOR,
  rng: () => number = Math.random,
): number {
  const targetDay = targetDayForIndex(index, total, spreadDays)
  const fuzzedDay = applyDayFuzz(targetDay, fuzzFactor, rng)
  return todayDays + fuzzedDay
}
