import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CardRecord } from '../../db'
import { SM2 } from '../../utils/sm2'

const mockedRuntime = vi.hoisted(() => {
  const state = {
    cards: [] as CardRecord[],
  }

  const cards = {
    update: vi.fn(async (cardId: string, updates: Partial<CardRecord>) => {
      const index = state.cards.findIndex(card => card.id === cardId)
      if (index === -1) return 0
      state.cards[index] = { ...state.cards[index], ...updates }
      return 1
    }),
    where: vi.fn((_field: string) => ({
      equals: (deckId: string) => ({
        toArray: async () => state.cards.filter(card => card.deckId === deckId),
      }),
    })),
  }

  const enqueueSyncOperation = vi.fn(async () => undefined)

  return {
    state,
    db: { cards },
    enqueueSyncOperation,
  }
})

vi.mock('../../db', () => ({
  db: mockedRuntime.db,
}))

vi.mock('../../services/syncQueue', () => ({
  enqueueSyncOperation: mockedRuntime.enqueueSyncOperation,
}))

import { fetchDeckCards, updateCard } from '../../db/queries'

function makeRecord(partial: Partial<CardRecord>): CardRecord {
  const now = Date.now()
  const today = Math.floor(now / 86_400_000)

  return {
    id: partial.id ?? `card-${Math.random().toString(36).slice(2)}`,
    noteId: partial.noteId ?? 'note-1',
    deckId: partial.deckId ?? 'deck-1',
    front: partial.front ?? 'Original front',
    back: partial.back ?? 'Original back',
    tags: partial.tags ?? [],
    extra: partial.extra ?? { acronym: '', examples: '', port: '', protocol: '' },
    type: partial.type ?? SM2.CARD_TYPE_NEW,
    queue: partial.queue ?? SM2.QUEUE_NEW,
    due: partial.due ?? today,
    dueAt: partial.dueAt ?? now,
    interval: partial.interval ?? 0,
    factor: partial.factor ?? 2500,
    stability: partial.stability,
    difficulty: partial.difficulty,
    reps: partial.reps ?? 0,
    lapses: partial.lapses ?? 0,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt,
    algorithm: partial.algorithm,
  }
}

describe('local card save and edit regression', () => {
  beforeEach(() => {
    mockedRuntime.state.cards = []
    mockedRuntime.db.cards.update.mockClear()
    mockedRuntime.db.cards.where.mockClear()
    mockedRuntime.enqueueSyncOperation.mockClear()
  })

  it('persists edited card fields locally and returns updated content through fetchDeckCards', async () => {
    mockedRuntime.state.cards = [
      makeRecord({
        id: 'card-1',
        deckId: 'deck-1',
        front: 'Old question',
        back: 'Old answer',
        tags: ['old'],
      }),
    ]

    const result = await updateCard('card-1', {
      front: 'New question',
      back: 'New answer',
      tags: ['security', 'sqli'],
    })

    expect(result.ok).toBe(true)
    expect(mockedRuntime.state.cards[0].front).toBe('New question')
    expect(mockedRuntime.state.cards[0].back).toBe('New answer')
    expect(mockedRuntime.state.cards[0].tags).toEqual(['security', 'sqli'])
    expect(mockedRuntime.state.cards[0].updatedAt).toEqual(expect.any(Number))

    const fetched = await fetchDeckCards('deck-1')
    expect(fetched).toHaveLength(1)
    expect(fetched[0].front).toBe('New question')
    expect(fetched[0].back).toBe('New answer')
    expect(fetched[0].tags).toEqual(['security', 'sqli'])
    expect(mockedRuntime.enqueueSyncOperation).toHaveBeenCalledTimes(1)
    expect(mockedRuntime.enqueueSyncOperation).toHaveBeenCalledWith(
      'card.update',
      expect.objectContaining({
        cardId: 'card-1',
        updates: expect.objectContaining({
          front: 'New question',
          back: 'New answer',
          tags: ['security', 'sqli'],
          updatedAt: expect.any(Number),
        }),
      })
    )
  })

  it('fails cleanly when updating a missing card and does not enqueue sync', async () => {
    mockedRuntime.state.cards = []

    const result = await updateCard('missing-card', {
      front: 'Should not save',
    })

    expect(result.ok).toBe(false)
    expect(result.error).toBe('Card not found or no rows updated.')
    expect(mockedRuntime.enqueueSyncOperation).not.toHaveBeenCalled()
  })
})
