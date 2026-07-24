/**
 * Strict local-calendar handling for exam dates.
 *
 * `Date.parse()` and the multi-argument `Date` constructor normalize invalid
 * values such as 2026-02-31 instead of rejecting them. Exam dates must retain
 * their exact YYYY-MM-DD meaning, so every consumer uses the same round-trip
 * validation.
 */
const ISO_CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseLocalExamDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const match = ISO_CALENDAR_DATE.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null

  // `new Date(0, …)` maps years 0–99 to 1900–1999. Start with a neutral date
  // and set the full year explicitly, then require an exact component round trip.
  const localDate = new Date(0)
  localDate.setHours(0, 0, 0, 0)
  localDate.setFullYear(year, month - 1, day)
  if (
    localDate.getFullYear() !== year
    || localDate.getMonth() !== month - 1
    || localDate.getDate() !== day
  ) return null

  return localDate
}

export function isValidExamDateIso(value: unknown): value is string {
  return parseLocalExamDate(value) !== null
}

export function normalizeExamDateIso(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return isValidExamDateIso(trimmed) ? trimmed : null
}
