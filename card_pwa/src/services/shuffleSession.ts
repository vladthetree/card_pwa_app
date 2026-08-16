/**
 * AI_CONTEXT: Application service for shuffle sessions; owns business logic outside React components for learning, sync, profile, update, or session flows.
 */
import type { ShuffleCollectionRecord } from '../db'
import { listCardsByIds, listDeckStudyCandidates } from '../db/queries'
import { DAY_MS, resolveDueAtMs } from '../utils/time'
import type { Card } from '../types'
import { compareByDueRank, getCardTypePriority, seededRank } from '../utils/cardOrdering'
import { getCardWeight, sortStudyCards } from '../utils/studyCardOrdering'
import { getSyncedDeckIds } from './syncedDeckScope'

export interface ShuffleStudyCard extends Card {
  deckId: string
}

interface ShuffleSelectionOptions {
  maxCards?: number
  nowMs?: number
  nextDayStartsAt?: number
  runSeed?: string | number
  learnAheadMinutes?: number
  /** Exact remaining queue from a persisted run; this bypasses reselection. */
  preferredCardIds?: readonly string[]
  /** Persisted source-deck ownership used to reconstruct shuffle cards. */
  preferredCardOrigins?: Readonly<Record<string, string>>
}

export function getShuffleWeight(card: Card, nowMs = Date.now()): number {
  const baseWeight = getCardWeight(card)
  const dueAtMs = resolveDueAtMs(card)
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

function compareShuffleCards(a: Card, b: Card, nowMs: number, runSeed?: string | number): number {
  const dueRankDiff = compareByDueRank(a, b, nowMs)
  if (dueRankDiff !== 0) return dueRankDiff

  const typeDiff = getCardTypePriority(a.type) - getCardTypePriority(b.type)
  if (typeDiff !== 0) return typeDiff

  const dueDiff = resolveDueAtMs(a) - resolveDueAtMs(b)
  if (dueDiff !== 0) return dueDiff

  const weightDiff = getShuffleWeight(b, nowMs) - getShuffleWeight(a, nowMs)
  if (weightDiff !== 0) return weightDiff

  const baseWeightDiff = getCardWeight(b) - getCardWeight(a)
  if (baseWeightDiff !== 0) return baseWeightDiff

  if (runSeed !== undefined) {
    const seedDiff = seededRank(runSeed, a) - seededRank(runSeed, b)
    if (seedDiff !== 0) return seedDiff
  }

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
      const cards = await listDeckStudyCandidates(deckId, options.nextDayStartsAt)
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
  const weighted = [...sorted].sort((a, b) => compareShuffleCards(a, b, nowMs, options.runSeed))
  const maximum = Number.isFinite(options.maxCards)
    ? Math.max(1, Math.floor(Number(options.maxCards)))
    : weighted.length
  // Select the highest-priority cards before interleaving. This keeps the
  // configured session target a hard cap without allowing deck mixing to push
  // a due/learning card out in favour of a lower-priority card.
  return interleaveDecks(weighted.slice(0, maximum))
}

export async function buildSelectedShuffleCards(
  collection: Pick<ShuffleCollectionRecord, 'deckIds'>,
  options: ShuffleSelectionOptions & { userId?: string } = {},
): Promise<ShuffleStudyCard[]> {
  if (options.preferredCardIds && options.preferredCardIds.length > 0) {
    const allowedDeckIds = new Set(collection.deckIds)
    const cards = await listCardsByIds([...options.preferredCardIds])
    const cardById = new Map(cards.map(card => [card.id, card]))
    return options.preferredCardIds.flatMap(cardId => {
      const card = cardById.get(cardId)
      const deckId = options.preferredCardOrigins?.[cardId]
      if (!card || !deckId || !allowedDeckIds.has(deckId)) return []
      return [{ ...card, deckId }]
    })
  }

  const pool = await buildShufflePool(collection, {
    userId: options.userId,
    nextDayStartsAt: options.nextDayStartsAt,
  })
  return selectShuffleCards(pool, options)
}
