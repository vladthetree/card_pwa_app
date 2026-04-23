import { describe, expect, it, vi } from 'vitest'

const mockedCounts = vi.hoisted(() => ({
  decks: 2,
  cards: 10,
  reviews: 4,
  shuffleCollections: 3,
}))

vi.mock('../../db', () => ({
  db: {
    decks: { count: vi.fn(async () => mockedCounts.decks) },
    cards: {
      count: vi.fn(async () => mockedCounts.cards),
      where: vi.fn(() => ({ equals: vi.fn(() => ({ count: vi.fn(async () => 0) })) })),
    },
    reviews: { count: vi.fn(async () => mockedCounts.reviews) },
    shuffleCollections: {
      count: vi.fn(async () => mockedCounts.shuffleCollections),
      get: vi.fn(),
    },
  },
}))

vi.mock('dexie', () => ({
  liveQuery: vi.fn(() => ({ subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) })),
}))

vi.mock('../../db/queries', () => ({
  fetchDecks: vi.fn(),
  fetchDeckCards: vi.fn(),
  fetchGamificationProfile: vi.fn(),
  fetchGlobalStats: vi.fn(),
  fetchTodayDueFromDecks: vi.fn(),
  getShuffleCollection: vi.fn(),
  listShuffleCollections: vi.fn(),
}))

vi.mock('../../services/ShuffleSessionManager', () => ({
  buildSelectedShuffleCards: vi.fn(),
}))

import { getGlobalDbRevision } from '../../hooks/useCardDb'

describe('getGlobalDbRevision', () => {
  it('includes shuffle collection count so create/delete triggers global observers', async () => {
    mockedCounts.decks = 1
    mockedCounts.cards = 5
    mockedCounts.reviews = 2
    mockedCounts.shuffleCollections = 7

    await expect(getGlobalDbRevision()).resolves.toBe(15)

    mockedCounts.shuffleCollections = 0
    await expect(getGlobalDbRevision()).resolves.toBe(8)
  })
})
