/**
 * AI_CONTEXT: Vitest coverage for db backup; protects utils behavior from regressions in the learning PWA.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CardRecord, DeckRecord, ReviewRecord, VideoNoteRecord } from '../../db'
import { createDbBackupPayload, listDecksForBackup, restoreVideoNotesFromBackupPayload } from '../../utils/dbBackup'

const mockedDb = vi.hoisted(() => {
  const state = {
    decks: [] as DeckRecord[],
    cards: [] as CardRecord[],
    reviews: [] as ReviewRecord[],
    videoNotes: [] as VideoNoteRecord[],
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
    videoNotes2: {
      toArray: vi.fn(async () => state.videoNotes),
      get: vi.fn(async ([profileId, objective]: [string, string]) =>
        state.videoNotes.find(note => note.profileId === profileId && note.objective === objective),
      ),
      put: vi.fn(async (note: VideoNoteRecord) => {
        const index = state.videoNotes.findIndex(row => row.profileId === note.profileId && row.objective === note.objective)
        if (index >= 0) state.videoNotes[index] = note
        else state.videoNotes.push(note)
      }),
    },
  }
})

vi.mock('../../db', () => ({
  db: {
    decks: mockedDb.decks,
    cards: mockedDb.cards,
    reviews: mockedDb.reviews,
    videoNotes2: mockedDb.videoNotes2,
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
    mockedDb.state.videoNotes = []
    mockedDb.decks.toArray.mockClear()
    mockedDb.cards.toArray.mockClear()
    mockedDb.reviews.toArray.mockClear()
    mockedDb.videoNotes2.toArray.mockClear()
    mockedDb.videoNotes2.get.mockClear()
    mockedDb.videoNotes2.put.mockClear()
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
    expect(payload.meta.tableCounts).toEqual({ decks: 1, cards: 1, reviews: 1, videoNotes: 0 })
    expect(payload.data.videoNotes).toEqual([])
  })

  it('includes profile-scoped video notes in JSON backups', async () => {
    mockedDb.state.decks = [createDeck({ id: 'deck-active' })]
    mockedDb.state.videoNotes = [
      {
        profileId: 'local',
        objective: '1.2',
        videoId: '003 - 1.2 - The CIA Triad.mp4',
        content: 'Merke: CIA #crypto',
        tags: ['crypto'],
        createdAt: 100,
        updatedAt: 200,
      },
    ]

    const payload = await createDbBackupPayload()

    expect(payload.meta.version).toBe(2)
    expect(payload.meta.tableCounts.videoNotes).toBe(1)
    expect(payload.data.videoNotes).toEqual(mockedDb.state.videoNotes)
  })

  it('restores video notes from backups and folds stored tags into content', async () => {
    const result = await restoreVideoNotesFromBackupPayload({
      data: {
        videoNotes: [
          {
            profileId: 'local',
            objective: '1.3',
            videoId: '004.mp4',
            content: 'Frage: Was ist PKI?',
            tags: ['PKI', 'Incident Response'],
            createdAt: 10,
            updatedAt: 20,
          },
        ],
      },
    })

    expect(result).toEqual({ added: 1, updated: 0, skipped: 0 })
    expect(mockedDb.state.videoNotes).toHaveLength(1)
    expect(mockedDb.state.videoNotes[0]).toMatchObject({
      profileId: 'local',
      objective: '1.3',
      tags: ['PKI', 'Incident-Response'],
    })
    expect(mockedDb.state.videoNotes[0].content).toContain('#Incident-Response')
  })

  it('keeps newer local video notes unless overwrite is requested', async () => {
    mockedDb.state.videoNotes = [
      {
        profileId: 'local',
        objective: '1.4',
        videoId: 'old.mp4',
        content: 'Neue lokale Notiz #local',
        tags: ['local'],
        createdAt: 10,
        updatedAt: 300,
      },
    ]

    const older = {
      data: {
        videoNotes: [
          {
            profileId: 'local',
            objective: '1.4',
            videoId: 'backup.mp4',
            content: 'Altes Backup #backup',
            tags: ['backup'],
            createdAt: 5,
            updatedAt: 200,
          },
        ],
      },
    }

    expect(await restoreVideoNotesFromBackupPayload(older)).toEqual({ added: 0, updated: 0, skipped: 1 })
    expect(mockedDb.state.videoNotes[0].content).toBe('Neue lokale Notiz #local')

    expect(await restoreVideoNotesFromBackupPayload(older, { strategy: 'overwrite' })).toEqual({ added: 0, updated: 1, skipped: 0 })
    expect(mockedDb.state.videoNotes[0].content).toBe('Altes Backup #backup')
  })

  it('accepts legacy backups without video notes', async () => {
    const result = await restoreVideoNotesFromBackupPayload({
      data: {
        decks: [],
        cards: [],
        reviews: [],
      },
    })

    expect(result).toEqual({ added: 0, updated: 0, skipped: 0 })
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
