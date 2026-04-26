import type { CardRecord, DeckRecord, ReviewRecord, ShuffleCollectionRecord } from '../../db'
import { normalizeDeck } from './deck'
import { normalizeCard } from './card'
import { normalizeReview } from './review'
import { normalizeShuffleCollection } from './shuffleCollection'

export interface SnapshotNormalizeRequest {
  rawDecks: unknown[]
  rawCards: unknown[]
  rawReviews: unknown[]
  rawShuffleCollections: unknown[]
}

export interface SnapshotNormalizeResult {
  decks: DeckRecord[]
  cards: CardRecord[]
  reviews: Array<Omit<ReviewRecord, 'id'>>
  shuffleCollections: ShuffleCollectionRecord[]
}

export function normalizeSnapshotPayload(payload: SnapshotNormalizeRequest): SnapshotNormalizeResult {
  const decks = payload.rawDecks
    .map(normalizeDeck)
    .filter((entry): entry is DeckRecord => entry !== null)

  const cards = payload.rawCards
    .map(normalizeCard)
    .filter((entry): entry is CardRecord => entry !== null)

  const cardIds = new Set(cards.map(card => card.id))
  const reviews = payload.rawReviews
    .map(normalizeReview)
    .filter((entry): entry is Omit<ReviewRecord, 'id'> => entry !== null && cardIds.has(entry.cardId))

  const shuffleCollections = payload.rawShuffleCollections
    .map(normalizeShuffleCollection)
    .filter((entry): entry is ShuffleCollectionRecord => entry !== null)

  return { decks, cards, reviews, shuffleCollections }
}
