/**
 * AI_CONTEXT: Application service for card Ordering; owns business logic outside React components for learning, sync, profile, update, or session flows.
 */
import type { Card } from '../types'
import { fnv1a32 } from '../utils/hash'
import { resolveDueAtMs } from '../utils/time'

/**
 * Study-queue priority by card type (lower = earlier).
 * Learning/relearning steps have short intraday intervals (minutes) and are
 * time-sensitive: delaying them past their window degrades retention. Review
 * cards have day-scale intervals and tolerate a few hours' delay fine; new
 * cards have no deadline and come last.
 */
export const CARD_TYPE_PRIORITY: Record<Card['type'], number> = {
  learning: 0,
  relearning: 1,
  review: 2,
  new: 3,
}

export function getCardTypePriority(cardType: Card['type']): number {
  return CARD_TYPE_PRIORITY[cardType]
}

/**
 * Deterministic per-run rank derived from a seed and the card id. Lets a fresh
 * run vary card order without a PRNG, while staying stable within the run.
 */
export function seededRank(seed: string | number, card: Card): number {
  return fnv1a32(`${seed}:${card.id}`)
}

/**
 * Orders cards by due urgency before type: a time-bound card (learning/
 * relearning/review) that is already due at `nowMs` outranks one that is not.
 * Returns a comparator delta (0 when neither side gains an urgency edge).
 */
export function compareByDueRank(a: Card, b: Card, nowMs: number): number {
  const aIsTimeBound = a.type !== 'new'
  const bIsTimeBound = b.type !== 'new'
  if (!aIsTimeBound && !bIsTimeBound) return 0

  const aDueRank = aIsTimeBound && resolveDueAtMs(a) <= nowMs ? 0 : 1
  const bDueRank = bIsTimeBound && resolveDueAtMs(b) <= nowMs ? 0 : 1
  return aDueRank - bDueRank
}
