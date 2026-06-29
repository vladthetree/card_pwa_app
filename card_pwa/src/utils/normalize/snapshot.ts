/**
 * AI_CONTEXT:
 * Role: Normalizes full server snapshot payloads into safe Deck/Card/Review/Shuffle records before local bootstrap writes.
 * Used by: syncPull bootstrap flow and snapshot-normalizer worker.
 * Important: Invalid records are filtered here; review rows must reference cards present in the normalized snapshot.
 */
import type { CardRecord, DeckRecord, ReviewRecord, ShuffleCollectionRecord, VideoNoteRecord } from '../../db'
import { normalizeDeck } from './deck'
import { normalizeCard } from './card'
import { normalizeReview } from './review'
import { normalizeShuffleCollection } from './shuffleCollection'
import { normalizeVideoNote } from './videoNote'

export interface SnapshotNormalizeRequest {
  rawDecks: unknown[]
  rawCards: unknown[]
  rawReviews: unknown[]
  rawShuffleCollections: unknown[]
  rawVideoNotes: unknown[]
}

export interface SnapshotNormalizeResult {
  decks: DeckRecord[]
  cards: CardRecord[]
  reviews: Array<Omit<ReviewRecord, 'id'>>
  shuffleCollections: ShuffleCollectionRecord[]
  videoNotes: VideoNoteRecord[]
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

  const videoNotes = payload.rawVideoNotes
    .map(entry => normalizeVideoNote(entry))
    .filter((entry): entry is VideoNoteRecord => entry !== null)

  return { decks, cards, reviews, shuffleCollections, videoNotes }
}
