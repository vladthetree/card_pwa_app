import type { Card } from '../types'
import { getDayStartMs } from '../utils/time'

export const WEIGHT_PRIORITY_WINDOW = 50

interface SortStudyCardsOptions {
  maxCards?: number
  nowMs?: number
  nextDayStartsAt?: number
}

export function getCardWeight(card: Card): number {
  const reps = Math.max(0, card.reps || 0)
  const lapses = Math.max(0, card.lapses || 0)
  const incorrectRatio = lapses / Math.max(1, reps)

  // All cards start with the same base weight; repeated failures increase urgency.
  return 1 + lapses * 2.5 + incorrectRatio * 3
}

export function sortStudyCards(cards: Card[], options: SortStudyCardsOptions = {}): Card[] {
  const nowMs = options.nowMs ?? Date.now()
  const nextDayStartsAt = Number.isInteger(options.nextDayStartsAt)
    ? Math.max(0, Math.min(23, Number(options.nextDayStartsAt)))
    : 0
  const todayStartMs = getDayStartMs(nowMs, nextDayStartsAt)
  const tomorrowStartMs = todayStartMs + 86_400_000

  function resolveDueAt(card: Card): number {
    if (Number.isFinite(card.dueAt)) return Math.round(card.dueAt as number)
    return Math.max(0, Math.floor(card.due)) * 86_400_000
  }

  const dueCards = cards.filter(card => {
    if (card.type === 'new') return true
    if (card.type === 'learning' || card.type === 'relearning') {
      // Keep intraday learning/relearning steps in the active todo queue
      // for the whole study day so interrupted sessions can resume cleanly.
      return resolveDueAt(card) < tomorrowStartMs
    }
    // review: due today means dueAt before tomorrow 00:00 local
    return resolveDueAt(card) < tomorrowStartMs
  })

  const maxCards = Number.isFinite(options.maxCards)
    ? Math.max(1, Math.floor(options.maxCards as number))
    : dueCards.length

  const getPriority = (cardType: Card['type']): number => {
    // Learning/relearning steps have short intraday intervals (minutes) and are
    // time-sensitive: delaying them past their window degrades retention.
    // Review cards have day-scale intervals and tolerate a few hours' delay fine.
    const priority: Record<Card['type'], number> = {
      learning: 0,
      relearning: 1,
      review: 2,
      new: 3,
    }
    return priority[cardType]
  }

  const compareCards = (a: Card, b: Card): number => {
    const aIsTimeBound = a.type !== 'new'
    const bIsTimeBound = b.type !== 'new'
    if (aIsTimeBound || bIsTimeBound) {
      const aDueRank = aIsTimeBound && resolveDueAt(a) <= nowMs ? 0 : 1
      const bDueRank = bIsTimeBound && resolveDueAt(b) <= nowMs ? 0 : 1
      if (aDueRank !== bDueRank) return aDueRank - bDueRank
    }

    const typeDiff = getPriority(a.type) - getPriority(b.type)
    if (typeDiff !== 0) return typeDiff

    // Earlier due cards first inside same type.
    const dueDiff = resolveDueAt(a) - resolveDueAt(b)
    if (dueDiff !== 0) return dueDiff

    // For equal due cards, prioritize cards with higher failure pressure.
    const weightDiff = getCardWeight(b) - getCardWeight(a)
    if (weightDiff !== 0) return weightDiff

    return a.id.localeCompare(b.id)
  }

  // Learning and relearning are limit-exempt: they must complete their intraday
  // steps regardless of the session cap to avoid breaking spaced-repetition intervals.
  const exemptCards = dueCards.filter(c => c.type === 'learning' || c.type === 'relearning')
  const limitedCards = dueCards.filter(c => c.type !== 'learning' && c.type !== 'relearning')

  const cappedLimited = [...limitedCards].sort(compareCards).slice(0, maxCards)

  return [...exemptCards, ...cappedLimited].sort(compareCards)
}


