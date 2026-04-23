import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ShuffleCollectionRecord } from '../../db'

const mockedDb = vi.hoisted(() => {
  const state = {
    shuffleCollections: [] as ShuffleCollectionRecord[],
  }

  const shuffleCollections = {
    orderBy: vi.fn((_field: string) => ({
      reverse: () => ({
        toArray: async () => [...state.shuffleCollections].sort((a, b) => b.updatedAt - a.updatedAt),
      }),
    })),
    get: vi.fn(async (collectionId: string) => state.shuffleCollections.find(row => row.id === collectionId) ?? undefined),
    add: vi.fn(async (collection: ShuffleCollectionRecord) => {
      state.shuffleCollections.push(collection)
    }),
    update: vi.fn(async (collectionId: string, updates: Partial<ShuffleCollectionRecord>) => {
      const index = state.shuffleCollections.findIndex(row => row.id === collectionId)
      if (index === -1) return 0
      state.shuffleCollections[index] = {
        ...state.shuffleCollections[index],
        ...updates,
      }
      return 1
    }),
  }

  return { state, shuffleCollections }
})

vi.mock('../../db', () => ({
  db: {
    shuffleCollections: mockedDb.shuffleCollections,
  },
}))

import {
  createShuffleCollection,
  deleteShuffleCollection,
  getShuffleCollection,
  listShuffleCollections,
  updateShuffleCollection,
} from '../../db/queries'

describe('shuffleCollections queries', () => {
  beforeEach(() => {
    mockedDb.state.shuffleCollections = []
    mockedDb.shuffleCollections.orderBy.mockClear()
    mockedDb.shuffleCollections.get.mockClear()
    mockedDb.shuffleCollections.add.mockClear()
    mockedDb.shuffleCollections.update.mockClear()
  })

  it('lists only non-deleted collections ordered by updatedAt desc', async () => {
    mockedDb.state.shuffleCollections = [
      {
        id: 'shuffle_old',
        name: 'Old',
        deckIds: ['deck-a'],
        createdAt: 100,
        updatedAt: 100,
      },
      {
        id: 'shuffle_deleted',
        name: 'Deleted',
        deckIds: ['deck-b'],
        createdAt: 200,
        updatedAt: 300,
        isDeleted: true,
      },
      {
        id: 'shuffle_new',
        name: 'New',
        deckIds: ['deck-c'],
        createdAt: 250,
        updatedAt: 250,
      },
    ]

    const result = await listShuffleCollections()

    expect(result.map(row => row.id)).toEqual(['shuffle_new', 'shuffle_old'])
  })

  it('hides deleted collections from getShuffleCollection', async () => {
    mockedDb.state.shuffleCollections = [
      {
        id: 'shuffle_deleted',
        name: 'Deleted',
        deckIds: ['deck-a'],
        createdAt: 10,
        updatedAt: 20,
        isDeleted: true,
      },
    ]

    await expect(getShuffleCollection('shuffle_deleted')).resolves.toBeNull()
  })

  it('creates a prefixed collection id and normalizes name and deck ids', async () => {
    const result = await createShuffleCollection('  Languages  ', ['deck-a', 'deck-b', 'deck-a', '  '])

    expect(result.ok).toBe(true)
    expect(result.collectionId).toMatch(/^shuffle_/)
    expect(mockedDb.shuffleCollections.add).toHaveBeenCalledTimes(1)
    expect(mockedDb.state.shuffleCollections[0]).toMatchObject({
      id: result.collectionId,
      name: 'Languages',
      deckIds: ['deck-a', 'deck-b'],
    })
  })

  it('rejects empty collection names', async () => {
    const result = await createShuffleCollection('   ', ['deck-a'])

    expect(result.ok).toBe(false)
    expect(result.error).toBe('Collection name must not be empty.')
    expect(mockedDb.shuffleCollections.add).not.toHaveBeenCalled()
  })

  it('rejects collections without any valid deck ids', async () => {
    const result = await createShuffleCollection('Languages', ['  ', ''])

    expect(result.ok).toBe(false)
    expect(result.error).toBe('Shuffle collection must contain at least one deck.')
    expect(mockedDb.shuffleCollections.add).not.toHaveBeenCalled()
  })

  it('updates normalized fields and timestamp', async () => {
    mockedDb.state.shuffleCollections = [
      {
        id: 'shuffle_1',
        name: 'Before',
        deckIds: ['deck-a'],
        createdAt: 100,
        updatedAt: 100,
      },
    ]

    const result = await updateShuffleCollection('shuffle_1', {
      name: '  After  ',
      deckIds: ['deck-b', 'deck-c', 'deck-b'],
    })

    expect(result.ok).toBe(true)
    expect(mockedDb.state.shuffleCollections[0].name).toBe('After')
    expect(mockedDb.state.shuffleCollections[0].deckIds).toEqual(['deck-b', 'deck-c'])
    expect(mockedDb.state.shuffleCollections[0].updatedAt).toEqual(expect.any(Number))
  })

  it('soft-deletes collections via tombstone fields', async () => {
    mockedDb.state.shuffleCollections = [
      {
        id: 'shuffle_1',
        name: 'Mixed',
        deckIds: ['deck-a'],
        createdAt: 100,
        updatedAt: 100,
      },
    ]

    const result = await deleteShuffleCollection('shuffle_1')

    expect(result.ok).toBe(true)
    expect(mockedDb.state.shuffleCollections[0].isDeleted).toBe(true)
    expect(mockedDb.state.shuffleCollections[0].deletedAt).toEqual(expect.any(Number))
    expect(mockedDb.state.shuffleCollections[0].updatedAt).toEqual(expect.any(Number))
  })
})
