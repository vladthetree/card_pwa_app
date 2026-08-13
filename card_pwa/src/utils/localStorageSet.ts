/**
 * AI_CONTEXT: Utility module for localStorageSet; shared read/persist mechanics
 * for a string set stored as a JSON array under one localStorage key
 * (used by labProgress.ts and labTraining.ts, which keep separate keys/domains).
 */
export function readStringSetFromStorage(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((value): value is string => typeof value === 'string'))
  } catch {
    return new Set()
  }
}

export function persistStringSetToStorage(key: string, value: Set<string>, options: { max?: number } = {}): void {
  if (typeof window === 'undefined') return
  try {
    const entries = options.max !== undefined
      ? Array.from(value).slice(-options.max)
      : Array.from(value)
    window.localStorage.setItem(key, JSON.stringify(entries))
  } catch {
    // localStorage voll/blockiert: Fortschritt geht nur für diese Session verloren.
  }
}
