/**
 * AI_CONTEXT: Utility module for time; provides pure helpers for scheduling, parsing, scoring, tags, video notes, backup, or app data transformations.
 */
/** One calendar day in milliseconds. */
export const DAY_MS = 86_400_000

/**
 * Resolves a card's due moment to epoch ms.
 * Prefers the precise `dueAt` timestamp; falls back to the legacy day-index
 * `due` field (days since epoch) when `dueAt` is not a finite number.
 */
export function resolveDueAtMs(card: { due: number; dueAt?: number }, dayMs = DAY_MS): number {
  if (Number.isFinite(card.dueAt)) return Math.round(card.dueAt as number)
  return Math.max(0, Math.floor(card.due)) * dayMs
}

/**
 * Returns the start of the study day in epoch ms.
 * When nextDayStartsAtHour > 0 (e.g. 4 = 04:00), hours before that threshold
 * are considered part of the previous calendar day.
 */
export function getDayStartMs(nowMs: number, nextDayStartsAtHour = 0): number {
  const d = new Date(nowMs)
  if (nextDayStartsAtHour > 0 && d.getHours() < nextDayStartsAtHour) {
    d.setDate(d.getDate() - 1)
  }
  d.setHours(nextDayStartsAtHour, 0, 0, 0)
  return d.getTime()
}