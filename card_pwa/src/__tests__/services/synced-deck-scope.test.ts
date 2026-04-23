import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DeckRecord } from '../../db'

const mockedState = vi.hoisted(() => ({
  decks: [] as DeckRecord[],
  syncActive: false,
  selectedDeckIds: [] as string[],
}))

const mockedDb = vi.hoisted(() => ({
  decks: {
    filter: vi.fn((predicate: (deck: DeckRecord) => boolean) => ({
      toArray: async () => mockedState.decks.filter(predicate),
    })),
  },
}))

vi.mock('../../db', () => ({
  db: mockedDb,
}))

vi.mock('../../services/syncConfig', () => ({
  isSyncActive: () => mockedState.syncActive,
}))

vi.mock('../../services/profileService', () => ({
  readSelectedDeckIds: () => mockedState.selectedDeckIds,
}))

import { getSyncedDeckIds } from '../../services/syncedDeckScope'

describe('getSyncedDeckIds', () => {
  beforeEach(() => {
    mockedState.decks = []
    mockedState.syncActive = false
    mockedState.selectedDeckIds = []
    mockedDb.decks.filter.mockClear()
  })

  it('returns all non-deleted local decks in local-only mode', async () => {
    mockedState.decks = [
      { id: 'deck-a', name: 'A', createdAt: 1, source: 'manual' },
      { id: 'deck-b', name: 'B', createdAt: 2, source: 'manual', isDeleted: true },
      { id: 'deck-c', name: 'C', createdAt: 3, source: 'manual' },
    ]

    await expect(getSyncedDeckIds()).resolves.toEqual(['deck-a', 'deck-c'])
  })

  it('returns the intersection of local decks and selected deck ids in linked mode', async () => {
    mockedState.syncActive = true
    mockedState.selectedDeckIds = ['deck-a', 'deck-c', 'deck-missing']
    mockedState.decks = [
      { id: 'deck-a', name: 'A', createdAt: 1, source: 'manual' },
      { id: 'deck-b', name: 'B', createdAt: 2, source: 'manual' },
      { id: 'deck-c', name: 'C', createdAt: 3, source: 'manual', isDeleted: true },
    ]

    await expect(getSyncedDeckIds('user-1')).resolves.toEqual(['deck-a'])
  })

  it('treats an empty linked selection as all local non-deleted decks', async () => {
    mockedState.syncActive = true
    mockedState.selectedDeckIds = []
    mockedState.decks = [
      { id: 'deck-a', name: 'A', createdAt: 1, source: 'manual' },
      { id: 'deck-b', name: 'B', createdAt: 2, source: 'manual' },
    ]

    await expect(getSyncedDeckIds('user-1')).resolves.toEqual(['deck-a', 'deck-b'])
  })

  it('falls back to local scope when sync is active but no user id is provided', async () => {
    mockedState.syncActive = true
    mockedState.selectedDeckIds = ['deck-a']
    mockedState.decks = [
      { id: 'deck-a', name: 'A', createdAt: 1, source: 'manual' },
      { id: 'deck-b', name: 'B', createdAt: 2, source: 'manual' },
    ]

    await expect(getSyncedDeckIds()).resolves.toEqual(['deck-a', 'deck-b'])
  })
})
