import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDeck } from '../../db/queries'
import type { DeckRecord } from '../../db'

const mockedDb = vi.hoisted(() => {
  const state = { decks: [] as DeckRecord[] }

  const decks = {
    toArray: vi.fn(async () => state.decks),
    add: vi.fn(async (deck: DeckRecord) => {
      state.decks.push(deck)
    }),
  }

  return { state, decks }
})

const mockedSyncQueue = vi.hoisted(() => ({
  enqueueSyncOperation: vi.fn(async () => {}),
}))

vi.mock('../../db', () => ({
  db: {
    decks: mockedDb.decks,
  },
}))

vi.mock('../../services/syncQueue', () => ({
  enqueueSyncOperation: mockedSyncQueue.enqueueSyncOperation,
}))

describe('createDeck', () => {
  const uuidV7Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

  beforeEach(() => {
    mockedDb.state.decks = []
    mockedDb.decks.toArray.mockClear()
    mockedDb.decks.add.mockClear()
    mockedSyncQueue.enqueueSyncOperation.mockClear()
  })

  it('rejects empty names', async () => {
    const result = await createDeck('   ')
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Deck name must not be empty.')
    expect(mockedDb.decks.add).not.toHaveBeenCalled()
  })

  it('rejects duplicate names (case-insensitive)', async () => {
    mockedDb.state.decks = [{
      id: 'existing-id',
      name: 'Networking',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      source: 'manual',
    }]

    const result = await createDeck('networking')
    expect(result.ok).toBe(false)
    expect(result.error).toBe('A deck with this name already exists.')
    expect(mockedDb.decks.add).not.toHaveBeenCalled()
  })

  it('creates deck with UUIDv7 id and enqueues sync operation', async () => {
    const result = await createDeck('New Deck')

    expect(result.ok).toBe(true)
    expect(result.deckId).toBeDefined()
    expect(result.deckId).toMatch(uuidV7Pattern)
    expect(mockedDb.decks.add).toHaveBeenCalledTimes(1)
    expect(mockedSyncQueue.enqueueSyncOperation).toHaveBeenCalledWith(
      'deck.create',
      expect.objectContaining({
        id: result.deckId,
        name: 'New Deck',
      }),
    )
  })
})
