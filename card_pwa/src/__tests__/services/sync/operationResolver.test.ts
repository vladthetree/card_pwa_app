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
