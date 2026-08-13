/**
 * AI_CONTEXT: Utility module for numeric; tiny numeric guards shared across
 * scheduling-parameter normalization (algorithmParams, db/queries/reviews).
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
