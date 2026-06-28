/**
 * AI_CONTEXT:
 * Role: Pure card selection and ordering logic for study sessions, including due filtering, learning-step exemption, failure weighting, and seeded ordering.
 * Used by: StudyView, shuffle selection, deck queries, and session tests.
 * Important: This decides what the learner sees next; keep scheduling writes elsewhere and keep ordering deterministic under the same seed.
 */
import type { Card } from '../types'
import { DAY_MS, getDayStartMs, resolveDueAtMs } from '../utils/time'
import { compareByDueRank, getCardTypePriority, seededRank } from './cardOrdering'

export const WEIGHT_PRIORITY_WINDOW = 50

interface SortStudyCardsOptions {
  maxCards?: number
  nowMs?: number
  nextDayStartsAt?: number
  runSeed?: string | number
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
  const tomorrowStartMs = todayStartMs + DAY_MS

  const resolveDueAt = resolveDueAtMs

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

  const useFreshRunOrder = options.runSeed !== undefined

  const compareCards = (a: Card, b: Card): number => {
    const dueRankDiff = compareByDueRank(a, b, nowMs)
    if (dueRankDiff !== 0) return dueRankDiff

    const typeDiff = getCardTypePriority(a.type) - getCardTypePriority(b.type)
    if (typeDiff !== 0) return typeDiff

    // Earlier due cards first inside same type. For fresh runs, keep exact
    // timing for learning/relearning steps but vary review/new cards so aborting
    // and starting again does not recreate the same batch.
    const keepExactDueOrder = !useFreshRunOrder || a.type === 'learning' || a.type === 'relearning' || b.type === 'learning' || b.type === 'relearning'
    if (keepExactDueOrder) {
      const dueDiff = resolveDueAt(a) - resolveDueAt(b)
      if (dueDiff !== 0) return dueDiff
    }

    // For equal due cards, prioritize cards with higher failure pressure.
    const weightDiff = getCardWeight(b) - getCardWeight(a)
    if (weightDiff !== 0) return weightDiff

    if (useFreshRunOrder) {
      const seedDiff = seededRank(options.runSeed as string | number, a) - seededRank(options.runSeed as string | number, b)
      if (seedDiff !== 0) return seedDiff
    }

    return a.id.localeCompare(b.id)
  }

  // Learning and relearning are limit-exempt: they must complete their intraday
  // steps regardless of the session cap to avoid breaking spaced-repetition intervals.
  const exemptCards = dueCards.filter(c => c.type === 'learning' || c.type === 'relearning')
  const limitedCards = dueCards.filter(c => c.type !== 'learning' && c.type !== 'relearning')

  const cappedLimited = [...limitedCards].sort(compareCards).slice(0, maxCards)

  return [...exemptCards, ...cappedLimited].sort(compareCards)
}

