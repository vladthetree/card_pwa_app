import type { CardRecord, DeckRecord, ReviewRecord, ShuffleCollectionRecord } from '../../db'
import type { SyncOperationType } from '../../services/syncQueue'
import { normalizeCard, normalizeCardUpdates } from '../normalize/card'
import { normalizeDeck } from '../normalize/deck'
import { normalizeShuffleCollection } from '../normalize/shuffleCollection'

export interface OperationResolverInput {
  operations: ResolverOperation[]
  existing: {
    cards: CardRecord[]
    decks: DeckRecord[]
    shuffleCollections?: ShuffleCollectionRecord[]
  }
  fallbackTs: number
}

export interface ResolverOperation {
  id: number
  opId: string
  type: SyncOperationType
  payload: unknown
  clientTimestamp?: number
  sourceClient?: string
  createdAt?: number
}

export interface OperationDiff {
  decks: { upsert: DeckRecord[]; delete: string[] }
  cards: { upsert: CardRecord[]; update: Array<[string, Partial<CardRecord>]>; delete: string[] }
  reviews: {
    add: Array<Omit<ReviewRecord, 'id'>>
    deleteByCardId: string[]
    deleteById: number[]
    deleteLatestByCardId: string[]
  }
  shuffleCollections: { upsert: ShuffleCollectionRecord[]; delete: ShuffleCollectionRecord[] }
}

export function supportsWorkerResolution(op: ResolverOperation): boolean {
  return op.type === 'deck.create'
    || op.type === 'deck.delete'
    || op.type === 'card.create'
    || op.type === 'card.update'
    || op.type === 'card.schedule.forceTomorrow'
    || op.type === 'card.delete'
    || op.type === 'review'
    || op.type === 'review.undo'
    || op.type === 'shuffleCollection.upsert'
    || op.type === 'shuffleCollection.delete'
}

function shouldApplyIncomingCardState(
  existing: Pick<CardRecord, 'createdAt' | 'updatedAt' | 'reps'> | undefined,
  incoming: Partial<CardRecord>,
  fallbackTimestamp = 0,
): boolean {
  if (!existing) return true

  const localReps = Number.isFinite(existing.reps) ? Number(existing.reps) : 0
  const incomingReps = Number.isFinite(incoming.reps) ? Number(incoming.reps) : localReps

  if (incomingReps !== localReps) {
    return incomingReps > localReps
  }

  const localTs = Number(existing.updatedAt ?? existing.createdAt ?? 0)
  const incomingTs = Number(incoming.updatedAt ?? incoming.createdAt ?? fallbackTimestamp ?? 0)

  if (!Number.isFinite(incomingTs) || incomingTs <= 0) return true
  return incomingTs >= localTs
}

export function resolveOperations(input: OperationResolverInput): OperationDiff {
  const cards = new Map(input.existing.cards.map(card => [card.id, card]))
  const decks = new Map(input.existing.decks.map(deck => [deck.id, deck]))
  const shuffleCollections = new Map((input.existing.shuffleCollections ?? []).map(collection => [collection.id, collection]))

  const diff: OperationDiff = {
    decks: { upsert: [], delete: [] },
    cards: { upsert: [], update: [], delete: [] },
    reviews: { add: [], deleteByCardId: [], deleteById: [], deleteLatestByCardId: [] },
    shuffleCollections: { upsert: [], delete: [] },
  }

  for (const op of input.operations) {
    const fallbackTs = Number(op.clientTimestamp ?? input.fallbackTs ?? 0)

    if (op.type === 'deck.create') {
      const deck = normalizeDeck(op.payload)
      if (!deck) continue

      const existingDeck = decks.get(deck.id)
      if (existingDeck) {
        const localTs = existingDeck.updatedAt ?? existingDeck.createdAt
        const incomingTs = deck.updatedAt ?? deck.createdAt
        if (localTs > incomingTs) continue
      }

      decks.set(deck.id, deck)
      diff.decks.upsert.push(deck)
      continue
    }

    if (op.type === 'deck.delete') {
      if (!op.payload || typeof op.payload !== 'object') continue
      const value = op.payload as { deckId?: string; timestamp?: number; deletedAt?: number }
      const deckId = value.deckId ? String(value.deckId) : ''
      if (!deckId) continue

      const deleteTs = Number(value.deletedAt ?? value.timestamp ?? fallbackTs ?? 0)
      const existingDeck = decks.get(deckId)
      if (deleteTs > 0 && existingDeck) {
        const localTs = existingDeck.updatedAt ?? existingDeck.createdAt
        if (localTs > deleteTs) continue
      }

      diff.decks.delete.push(deckId)
      continue
    }

    if (op.type === 'card.create') {
      const card = normalizeCard(op.payload)
      if (!card) continue

      const existingCard = cards.get(card.id)
      if (existingCard && !shouldApplyIncomingCardState(existingCard, card, card.updatedAt ?? card.createdAt ?? 0)) {
        continue
      }

      cards.set(card.id, { ...(existingCard ?? card), ...card })
      diff.cards.upsert.push(card)
      continue
    }

    if (op.type === 'card.update' || op.type === 'card.schedule.forceTomorrow') {
      if (!op.payload || typeof op.payload !== 'object') continue
      const value = op.payload as { cardId?: string; updates?: Partial<CardRecord>; update?: Partial<CardRecord> }
      const cardId = value.cardId ? String(value.cardId) : ''
      const rawUpdates = value.updates && typeof value.updates === 'object' ? value.updates : value.update
      if (!cardId || !rawUpdates) continue

      const normalizedUpdates = normalizeCardUpdates(rawUpdates)
      if (Object.keys(normalizedUpdates).length === 0) continue

      const existingCard = cards.get(cardId)
      if (existingCard && !shouldApplyIncomingCardState(existingCard, normalizedUpdates, fallbackTs)) {
        continue
      }

      if (existingCard) {
        cards.set(cardId, { ...existingCard, ...normalizedUpdates })
      }

      diff.cards.update.push([cardId, normalizedUpdates])
      continue
    }

    if (op.type === 'card.delete') {
      if (!op.payload || typeof op.payload !== 'object') continue
      const value = op.payload as { cardId?: string; timestamp?: number; deletedAt?: number }
      const cardId = value.cardId ? String(value.cardId) : ''
      if (!cardId) continue

      const deleteTs = Number(value.deletedAt ?? value.timestamp ?? fallbackTs ?? 0)
      const existingCard = cards.get(cardId)
      if (deleteTs > 0 && existingCard) {
        const localTs = existingCard.updatedAt ?? existingCard.createdAt
        if (localTs > deleteTs) continue
      }

      diff.cards.delete.push(cardId)
      diff.reviews.deleteByCardId.push(cardId)
      continue
    }

    if (op.type === 'review') {
      const payload = op.payload
      if (!payload || typeof payload !== 'object') continue
      const value = payload as {
        cardId?: string
        rating?: 1 | 2 | 3 | 4
        timeMs?: number
        timestamp?: number
        updated?: Partial<CardRecord>
      }

      const cardId = value.cardId ? String(value.cardId) : ''
      if (!cardId) continue

      const existingCard = cards.get(cardId)
      if (!existingCard) continue

      if (value.updated && typeof value.updated === 'object') {
        if (shouldApplyIncomingCardState(existingCard, value.updated as Partial<CardRecord>, Number(value.timestamp ?? 0))) {
          const normalized = normalizeCardUpdates(value.updated)
          cards.set(cardId, { ...existingCard, ...normalized })
          if (Object.keys(normalized).length > 0) {
            diff.cards.update.push([cardId, normalized])
          }
        }
      }

      const rating = Number(value.rating)
      const normalizedRating = [1, 2, 3, 4].includes(rating) ? (rating as 1 | 2 | 3 | 4) : 3
      diff.reviews.add.push({
        opId: op.opId,
        cardId,
        rating: normalizedRating,
        timeMs: Number.isFinite(value.timeMs) ? Number(value.timeMs) : 0,
        timestamp: Number.isFinite(value.timestamp) ? Number(value.timestamp) : Date.now(),
        sourceClient: typeof op.sourceClient === 'string' ? op.sourceClient : undefined,
        createdAt: Number.isFinite(op.createdAt) ? Number(op.createdAt) : undefined,
      })
      continue
    }

    if (op.type === 'review.undo') {
      if (!op.payload || typeof op.payload !== 'object') continue
      const value = op.payload as { cardId?: string; reviewId?: number; restored?: Partial<CardRecord> }
      const cardId = value.cardId ? String(value.cardId) : ''
      if (!cardId) continue

      if (value.restored && typeof value.restored === 'object') {
        const normalized = normalizeCardUpdates(value.restored)
        if (Object.keys(normalized).length > 0) {
          diff.cards.update.push([cardId, normalized])
        }
      }

      const reviewId = Number(value.reviewId)
      if (Number.isFinite(reviewId) && reviewId > 0) {
        diff.reviews.deleteById.push(reviewId)
      } else {
        diff.reviews.deleteLatestByCardId.push(cardId)
      }
      continue
    }

    if (op.type === 'shuffleCollection.upsert') {
      const collection = normalizeShuffleCollection(op.payload)
      if (!collection) continue
      const next = {
        ...collection,
        isDeleted: false,
        deletedAt: collection.deletedAt,
      }
      shuffleCollections.set(next.id, next)
      diff.shuffleCollections.upsert.push(next)
      continue
    }

    if (op.type === 'shuffleCollection.delete') {
      const collection = normalizeShuffleCollection(op.payload)
      if (!collection) continue
      const next = {
        ...collection,
        isDeleted: true,
        deletedAt: collection.deletedAt ?? collection.updatedAt,
      }
      shuffleCollections.set(next.id, next)
      diff.shuffleCollections.delete.push(next)
    }
  }

  return diff
}
