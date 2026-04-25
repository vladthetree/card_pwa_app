import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CardRecord, DeckRecord, ReviewRecord } from '../../db'
import { createDbBackupPayload, listDecksForBackup } from '../../utils/dbBackup'

const mockedDb = vi.hoisted(() => {
  const state = {
    decks: [] as DeckRecord[],
    cards: [] as CardRecord[],
    reviews: [] as ReviewRecord[],
  }

  return {
    state,
    decks: {
      toArray: vi.fn(async () => state.decks),
    },
    cards: {
      toArray: vi.fn(async () => state.cards),
    },
    reviews: {
      toArray: vi.fn(async () => state.reviews),
    },
  }
})

vi.mock('../../db', () => ({
  db: {
    decks: mockedDb.decks,
    cards: mockedDb.cards,
    reviews: mockedDb.reviews,
  },
}))

function createDeck(partial: Partial<DeckRecord>): DeckRecord {
  return {
    id: partial.id ?? 'deck-1',
    name: partial.name ?? 'Deck',
    createdAt: partial.createdAt ?? 1,
    updatedAt: partial.updatedAt,
    source: partial.source ?? 'manual',
    isDeleted: partial.isDeleted,
    deletedAt: partial.deletedAt,
  }
}

function createCard(partial: Partial<CardRecord>): CardRecord {
  return {
    id: partial.id ?? 'card-1',
    noteId: partial.noteId ?? 'note-1',
    deckId: partial.deckId ?? 'deck-1',
    front: partial.front ?? 'Front',
    back: partial.back ?? 'Back',
    tags: partial.tags ?? [],
    extra: partial.extra ?? {
      acronym: '',
      examples: '',
      port: '',
      protocol: '',
    },
    type: partial.type ?? 0,
    queue: partial.queue ?? 0,
    due: partial.due ?? 0,
    dueAt: partial.dueAt,
    interval: partial.interval ?? 0,
    factor: partial.factor ?? 2500,
    stability: partial.stability,
    difficulty: partial.difficulty,
    reps: partial.reps ?? 0,
    lapses: partial.lapses ?? 0,
    createdAt: partial.createdAt ?? 1,
    updatedAt: partial.updatedAt,
    algorithm: partial.algorithm,
    isDeleted: partial.isDeleted,
    deletedAt: partial.deletedAt,
    metadata: partial.metadata,
  }
}

describe('dbBackup', () => {
  const localStorageMock = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(() => null),
    length: 0,
  }

  beforeEach(() => {
    mockedDb.state.decks = []
    mockedDb.state.cards = []
    mockedDb.state.reviews = []
    mockedDb.decks.toArray.mockClear()
    mockedDb.cards.toArray.mockClear()
    mockedDb.reviews.toArray.mockClear()
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    })
    localStorageMock.getItem.mockReset()
    localStorageMock.getItem.mockReturnValue(null)
  })

  it('excludes soft-deleted decks, cards, and their reviews from backups', async () => {
    mockedDb.state.decks = [
      createDeck({ id: 'deck-active', name: 'Active Deck' }),
      createDeck({ id: 'deck-deleted', name: 'Deleted Deck', isDeleted: true }),
    ]
    mockedDb.state.cards = [
      createCard({ id: 'card-active', noteId: 'note-active', deckId: 'deck-active' }),
      createCard({ id: 'card-deleted', noteId: 'note-deleted', deckId: 'deck-active', isDeleted: true }),
      createCard({ id: 'card-orphaned', noteId: 'note-orphaned', deckId: 'deck-deleted' }),
    ]
    mockedDb.state.reviews = [
      { id: 1, cardId: 'card-active', rating: 4, timeMs: 1000, timestamp: 10 },
      { id: 2, cardId: 'card-deleted', rating: 2, timeMs: 1000, timestamp: 20 },
      { id: 3, cardId: 'card-orphaned', rating: 3, timeMs: 1000, timestamp: 30 },
    ]

    const payload = await createDbBackupPayload()

    expect(payload.data.decks.map(deck => deck.id)).toEqual(['deck-active'])
    expect(payload.data.cards.map(card => card.id)).toEqual(['card-active'])
    expect(payload.data.reviews.map(review => review.cardId)).toEqual(['card-active'])
    expect(payload.meta.tableCounts).toEqual({ decks: 1, cards: 1, reviews: 1 })
  })

  it('lists only active decks for deck-scoped exports', async () => {
    mockedDb.state.decks = [
      createDeck({ id: 'deck-active', name: 'Active Deck' }),
      createDeck({ id: 'deck-deleted', name: 'Deleted Deck', isDeleted: true }),
    ]

    const decks = await listDecksForBackup()

    expect(decks).toEqual([{ id: 'deck-active', name: 'Active Deck' }])
  })
})
