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
})
