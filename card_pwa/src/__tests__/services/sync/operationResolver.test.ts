/**
 * AI_CONTEXT: Vitest coverage for operation Resolver; protects services behavior from regressions in the learning PWA.
 */
import { describe, expect, it } from 'vitest'
import { resolveOperations, supportsWorkerResolution } from '../../../utils/sync/operationResolver'

describe('operationResolver', () => {
  it('resolves card update + review into db diff', () => {
    const result = resolveOperations({
      operations: [
        {
          id: 1,
          opId: 'op-update',
          type: 'card.update',
          payload: { cardId: 'c1', updates: { due: 99, reps: 2 } },
        },
        {
          id: 2,
          opId: 'op-review',
          type: 'review',
          payload: { cardId: 'c1', rating: 4, timeMs: 1200, timestamp: 10 },
          sourceClient: 'remote',
        },
      ],
      existing: {
        cards: [
          {
            id: 'c1',
            noteId: 'n1',
            deckId: 'd1',
            front: 'Q',
            back: 'A',
            tags: [],
            extra: { acronym: '', examples: '', port: '', protocol: '' },
            type: 2,
            queue: 2,
            due: 1,
            dueAt: 1 * 86_400_000,
            interval: 1,
            factor: 2500,
            reps: 1,
            lapses: 0,
            createdAt: 1,
            updatedAt: 1,
            algorithm: 'sm2',
          },
        ],
        decks: [],
      },
      fallbackTs: 0,
    })

    expect(result.cards.update.length).toBeGreaterThan(0)
    expect(result.reviews.add).toHaveLength(1)
    expect(result.reviews.add[0].cardId).toBe('c1')
  })

  it('marks card.delete as soft delete side effects', () => {
    const result = resolveOperations({
      operations: [
        {
          id: 3,
          opId: 'op-delete',
          type: 'card.delete',
          payload: { cardId: 'c2', timestamp: 100 },
        },
      ],
      existing: {
        cards: [
          {
            id: 'c2',
            noteId: 'n2',
            deckId: 'd2',
            front: 'Q',
            back: 'A',
            tags: [],
            extra: { acronym: '', examples: '', port: '', protocol: '' },
            type: 2,
            queue: 2,
            due: 1,
            dueAt: 1 * 86_400_000,
            interval: 1,
            factor: 2500,
            reps: 1,
            lapses: 0,
            createdAt: 1,
            updatedAt: 1,
            algorithm: 'sm2',
          },
        ],
        decks: [],
      },
      fallbackTs: 0,
    })

    expect(result.cards.delete).toEqual(['c2'])
    expect(result.reviews.deleteByCardId).toEqual(['c2'])
  })

  it('lets server maintenance deck.delete override newer local deck metadata', () => {
    const result = resolveOperations({
      operations: [
        {
          id: 4,
          opId: 'op-maint-delete',
          type: 'deck.delete',
          sourceClient: 'server-maintenance-publisher',
          payload: { deckId: 'legacy-deck', deletedAt: 100 },
        },
      ],
      existing: {
        cards: [],
        decks: [
          {
            id: 'legacy-deck',
            name: 'Professor Messer old path',
            source: 'anki-import',
            createdAt: 1,
            updatedAt: 200,
          },
        ],
      },
      fallbackTs: 0,
    })

    expect(result.decks.delete).toEqual(['legacy-deck'])
  })

  it('review.undo deletes by id only when the row is confirmed to belong to the card', () => {
    const result = resolveOperations({
      operations: [
        {
          id: 5,
          opId: 'op-undo-owned',
          type: 'review.undo',
          payload: { cardId: 'c1', reviewId: 42 },
        },
      ],
      existing: {
        cards: [],
        decks: [],
        reviews: [
          { id: 42, cardId: 'c1', rating: 3, timeMs: 500, timestamp: 10 },
        ],
      },
      fallbackTs: 0,
    })

    expect(result.reviews.deleteById).toEqual([42])
    expect(result.reviews.deleteLatestByCardId).toEqual([])
  })

  it('review.undo falls back to the latest review instead of deleting a foreign reviewId', () => {
    // reviewId is the sending device's LOCAL auto-increment id, so a row with that id
    // can legitimately belong to a different card on this device — must not be deleted.
    const foreignRow = resolveOperations({
      operations: [
        {
          id: 6,
          opId: 'op-undo-foreign',
          type: 'review.undo',
          payload: { cardId: 'c1', reviewId: 42 },
        },
      ],
      existing: {
        cards: [],
        decks: [],
        reviews: [
          { id: 42, cardId: 'some-other-card', rating: 3, timeMs: 500, timestamp: 10 },
        ],
      },
      fallbackTs: 0,
    })
    expect(foreignRow.reviews.deleteById).toEqual([])
    expect(foreignRow.reviews.deleteLatestByCardId).toEqual(['c1'])

    // Same fallback when the referenced row was not supplied at all (e.g. already gone).
    const unknownRow = resolveOperations({
      operations: [
        {
          id: 7,
          opId: 'op-undo-unknown',
          type: 'review.undo',
          payload: { cardId: 'c1', reviewId: 999 },
        },
      ],
      existing: { cards: [], decks: [], reviews: [] },
      fallbackTs: 0,
    })
    expect(unknownRow.reviews.deleteById).toEqual([])
    expect(unknownRow.reviews.deleteLatestByCardId).toEqual(['c1'])
  })

  it('declares unsupported operations for worker path', () => {
    expect(
      supportsWorkerResolution({
        id: 1,
        opId: 'a',
        type: 'deck.delete',
        payload: {},
      }),
    ).toBe(true)

    expect(
      supportsWorkerResolution({
        id: 2,
        opId: 'b',
        type: 'deck.create',
        payload: null,
      }),
    ).toBe(true)
  })
})
