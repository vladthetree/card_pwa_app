import type { ShuffleCollectionRecord } from '../db'
import { fetchDeckStudyCandidates } from '../db/queries'
import { getDayStartMs } from '../utils/time'
import type { Card } from '../types'
import { getCardWeight, sortStudyCards } from './StudySessionManager'
import { getSyncedDeckIds } from './syncedDeckScope'

const DAY_MS = 86_400_000

export interface ShuffleStudyCard extends Card {
  deckId: string
}

interface ShuffleSelectionOptions {
  maxCards?: number
  nowMs?: number
  nextDayStartsAt?: number
}

export function getShuffleWeight(card: Card, nowMs = Date.now()): number {
  const baseWeight = getCardWeight(card)
  const dueAtMs = Number.isFinite(card.dueAt)
    ? Math.round(card.dueAt as number)
    : Math.max(0, Math.floor(card.due)) * DAY_MS
  const overdueDays = Math.max(0, (nowMs - dueAtMs) / DAY_MS)
  const overdueBoost = 1 + Math.min(overdueDays / 14, 1)

  return baseWeight * overdueBoost
}

function dedupeShuffleCards(cards: ShuffleStudyCard[]): ShuffleStudyCard[] {
  const seen = new Set<string>()
  const deduped: ShuffleStudyCard[] = []

  for (const card of cards) {
    if (seen.has(card.id)) continue
    seen.add(card.id)
    deduped.push(card)
  }

  return deduped
}

function asShuffleStudyCards(cards: Card[]): ShuffleStudyCard[] {
  return cards.filter((card): card is ShuffleStudyCard => typeof (card as ShuffleStudyCard).deckId === 'string')
}

function interleaveDecks(cards: ShuffleStudyCard[]): ShuffleStudyCard[] {
  const deckOrder: string[] = []
  const queueByDeck = new Map<string, ShuffleStudyCard[]>()

  for (const card of cards) {
    if (!queueByDeck.has(card.deckId)) {
      queueByDeck.set(card.deckId, [])
      deckOrder.push(card.deckId)
    }
    queueByDeck.get(card.deckId)?.push(card)
  }

  if (deckOrder.length < 4) return [...cards]

  const result: ShuffleStudyCard[] = []
  while (result.length < cards.length) {
    let pushedThisRound = false
    for (const deckId of deckOrder) {
      const queue = queueByDeck.get(deckId)
      const nextCard = queue?.shift()
      if (!nextCard) continue
      result.push(nextCard)
      pushedThisRound = true
    }

    if (!pushedThisRound) break
  }

  return result
}

function resolveDueAt(card: Card): number {
  if (Number.isFinite(card.dueAt)) return Math.round(card.dueAt as number)
  return Math.max(0, Math.floor(card.due)) * DAY_MS
}

function getTypePriority(cardType: Card['type']): number {
  const priority: Record<Card['type'], number> = {
    learning: 0,
    relearning: 1,
    review: 2,
    new: 3,
  }
  return priority[cardType]
}

function compareShuffleCards(a: Card, b: Card, nowMs: number): number {
  const aIsTimeBound = a.type !== 'new'
  const bIsTimeBound = b.type !== 'new'
  if (aIsTimeBound || bIsTimeBound) {
    const aDueRank = aIsTimeBound && resolveDueAt(a) <= nowMs ? 0 : 1
    const bDueRank = bIsTimeBound && resolveDueAt(b) <= nowMs ? 0 : 1
    if (aDueRank !== bDueRank) return aDueRank - bDueRank
  }

  const typeDiff = getTypePriority(a.type) - getTypePriority(b.type)
  if (typeDiff !== 0) return typeDiff

  const dueDiff = resolveDueAt(a) - resolveDueAt(b)
  if (dueDiff !== 0) return dueDiff

  const weightDiff = getShuffleWeight(b, nowMs) - getShuffleWeight(a, nowMs)
  if (weightDiff !== 0) return weightDiff

  const baseWeightDiff = getCardWeight(b) - getCardWeight(a)
  if (baseWeightDiff !== 0) return baseWeightDiff

  return a.id.localeCompare(b.id)
}

export async function buildShufflePool(
  collection: Pick<ShuffleCollectionRecord, 'deckIds'>,
  options: { userId?: string; nextDayStartsAt?: number } = {},
): Promise<ShuffleStudyCard[]> {
  const syncedDeckIds = await getSyncedDeckIds(options.userId)
  const syncedDeckIdSet = new Set(syncedDeckIds)
  const effectiveDeckIds = collection.deckIds.filter(deckId => syncedDeckIdSet.has(deckId))

  if (effectiveDeckIds.length === 0) return []

  const deckCardSets = await Promise.all(
    effectiveDeckIds.map(async deckId => {
      const cards = await fetchDeckStudyCandidates(deckId, options.nextDayStartsAt)
      return cards.map(card => ({ ...card, deckId }))
    }),
  )

  return dedupeShuffleCards(deckCardSets.flat())
}

export function selectShuffleCards(
  pool: ShuffleStudyCard[],
  options: ShuffleSelectionOptions = {},
): ShuffleStudyCard[] {
  const nowMs = options.nowMs ?? Date.now()
  const sorted = asShuffleStudyCards(sortStudyCards(pool, options))
  const weighted = [...sorted].sort((a, b) => compareShuffleCards(a, b, nowMs))
  return interleaveDecks(weighted)
}

export async function buildSelectedShuffleCards(
  collection: Pick<ShuffleCollectionRecord, 'deckIds'>,
  options: ShuffleSelectionOptions & { userId?: string } = {},
): Promise<ShuffleStudyCard[]> {
  const pool = await buildShufflePool(collection, {
    userId: options.userId,
    nextDayStartsAt: options.nextDayStartsAt,
  })
  return selectShuffleCards(pool, options)
}

export function isShuffleCardDueToday(card: Card, nowMs = Date.now(), nextDayStartsAt = 0): boolean {
  const tomorrowStartMs = getDayStartMs(nowMs, nextDayStartsAt) + DAY_MS
  const dueAtMs = Number.isFinite(card.dueAt)
    ? Math.round(card.dueAt as number)
    : Math.max(0, Math.floor(card.due)) * DAY_MS

  if (card.type === 'new') return true
  return dueAtMs < tomorrowStartMs
}
