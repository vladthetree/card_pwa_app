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