import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CardRecord, DeckRecord } from '../../db'
import { createCard } from '../../db/queries/cards'

const mockedState = vi.hoisted(() => ({
  deck: null as DeckRecord | null,
  cards: [] as CardRecord[],
}))

const mockedDb = vi.hoisted(() => ({
  decks: {
    get: vi.fn(async () => mockedState.deck),
  },
  cards: {
    add: vi.fn(async (card: CardRecord) => {
      mockedState.cards.push(card)
    }),
  },
}))

const mockedSync = vi.hoisted(() => ({
  enqueueSyncOperation: vi.fn(async () => {}),
}))

vi.mock('../../db', () => ({
  db: mockedDb,
}))

vi.mock('../../services/syncQueue', () => ({
  enqueueSyncOperation: mockedSync.enqueueSyncOperation,
}))

function makeCard(deckId: string): Omit<CardRecord, 'createdAt'> {
  return {
    id: 'card-1',
    noteId: 'note-1',
    deckId,
    front: 'Q',
    back: 'A',
    tags: [],
    extra: { acronym: '', examples: '', port: '', protocol: '' },
    type: 0,
    queue: 0,
    due: 0,
    dueAt: 0,
    interval: 0,
    factor: 2500,
    reps: 0,
    lapses: 0,
  }
}

describe('createCard deck sync handoff', () => {
  beforeEach(() => {
    mockedState.deck = {
      id: 'deck-1',
      name: 'Deck 1',
      createdAt: 100,
      updatedAt: 200,
      source: 'manual',
    }
    mockedState.cards = []
    mockedDb.decks.get.mockClear()
    mockedDb.cards.add.mockClear()
    mockedSync.enqueueSyncOperation.mockClear()
  })

  it('enqueues the containing deck before the card', async () => {
    const result = await createCard(makeCard('deck-1'))

    expect(result.ok).toBe(true)
    expect(mockedSync.enqueueSyncOperation).toHaveBeenNthCalledWith(
      1,
      'deck.create',
      expect.objectContaining({
        id: 'deck-1',
        name: 'Deck 1',
      }),
    )
    expect(mockedSync.enqueueSyncOperation).toHaveBeenNthCalledWith(
      2,
      'card.create',
      expect.objectContaining({
        id: 'card-1',
        deckId: 'deck-1',
      }),
    )
  })
})
