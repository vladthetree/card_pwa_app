/**
 * AI_CONTEXT: Vitest coverage for snapshot normalizer integration; protects services behavior from regressions in the learning PWA.
 */
import { describe, expect, it } from 'vitest'
import { normalizeSnapshotPayload } from '../../utils/normalize/snapshot'

describe('snapshot normalization integration', () => {
  it('normalizes snapshot entities and drops orphan reviews', () => {
    const result = normalizeSnapshotPayload({
      rawDecks: [{ id: 'deck-1', name: 'Deck 1', createdAt: 1 }],
      rawCards: [
        {
          id: 'card-1',
          noteId: 'note-1',
          deckId: 'deck-1',
          front: 'Q',
          back: 'A',
          due: 10,
          type: 0,
          queue: 0,
        },
      ],
      rawReviews: [
        { cardId: 'card-1', rating: 4, timestamp: 10 },
        { cardId: 'missing-card', rating: 3, timestamp: 20 },
      ],
      rawShuffleCollections: [{ id: 'sc-1', name: 'SC', deckIds: ['deck-1', 'deck-1'] }],
    })

    expect(result.decks).toHaveLength(1)
    expect(result.cards).toHaveLength(1)
    expect(result.reviews).toHaveLength(1)
    expect(result.reviews[0].cardId).toBe('card-1')
    expect(result.shuffleCollections).toHaveLength(1)
    expect(result.shuffleCollections[0].deckIds).toEqual(['deck-1'])
  })

  // Regression: manually seeded cards with note_id = NULL in the DB are sent by
  // the snapshot endpoint as { noteId: null }.  normalizeCard rejects them so the
  // deck ends up with zero valid cards.  The normalizer itself keeps the deck
  // record (deck-content filtering is done later in filterSnapshotBySelectedDecks),
  // but ALL affected cards are dropped and their reviews become orphans.
  it('drops cards whose noteId is null and drops their orphan reviews', () => {
    const result = normalizeSnapshotPayload({
      rawDecks: [{ id: 'deck-null-note', name: 'Bad Seed Deck', createdAt: 1 }],
      rawCards: [
        { id: 'c1', noteId: null,      deckId: 'deck-null-note', front: 'Q1', back: 'A1' },
        { id: 'c2', noteId: undefined, deckId: 'deck-null-note', front: 'Q2', back: 'A2' },
      ],
      rawReviews: [{ cardId: 'c1', rating: 4, timestamp: 1 }],
      rawShuffleCollections: [],
    })

    expect(result.cards).toHaveLength(0)
    expect(result.reviews).toHaveLength(0)
    // deck record itself is present — content filtering is a separate concern
    expect(result.decks).toHaveLength(1)
  })

  it('keeps only cards with a valid noteId when the deck has a mix', () => {
    const result = normalizeSnapshotPayload({
      rawDecks: [{ id: 'deck-mixed', name: 'Mixed Deck', createdAt: 1 }],
      rawCards: [
        { id: 'c-bad',  noteId: null,     deckId: 'deck-mixed', front: 'Q', back: 'A' },
        { id: 'c-good', noteId: 'note-1', deckId: 'deck-mixed', front: 'Q', back: 'A' },
      ],
      rawReviews: [],
      rawShuffleCollections: [],
    })

    expect(result.cards).toHaveLength(1)
    expect(result.cards[0].id).toBe('c-good')
  })
})
