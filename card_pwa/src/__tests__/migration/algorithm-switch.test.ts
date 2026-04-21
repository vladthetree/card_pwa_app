import { beforeEach, describe, expect, it, vi } from 'vitest'
import { migrateCardsForAlgorithm } from '../../services/AlgorithmMigrationService'
import type { CardRecord } from '../../db'

vi.mock('../../services/syncQueue', () => ({
  enqueueSyncOperation: vi.fn().mockResolvedValue(undefined),
}))

import { enqueueSyncOperation } from '../../services/syncQueue'

const dayMs = 86_400_000

type CardUpdate = Partial<CardRecord>

const mockedDb = vi.hoisted(() => {
  const state = {
    cards: [] as CardRecord[],
    failOnCardId: null as string | null,
  }

  const cardsTable = {
    toArray: vi.fn(async () => state.cards.map(card => ({ ...card }))),
    update: vi.fn(async (id: string, updates: CardUpdate) => {
      if (state.failOnCardId === id) {
        state.failOnCardId = null
        throw new Error('simulated migration failure')
      }
      const index = state.cards.findIndex(card => card.id === id)
      if (index >= 0) {
        state.cards[index] = { ...state.cards[index], ...updates }
      }
    }),
  }

  const transaction = vi.fn(async (_mode: string, _table: unknown, callback: () => Promise<void>) => {
    await callback()
  })

  return { state, cardsTable, transaction }
})

vi.mock('../../db', () => ({
  db: {
    cards: mockedDb.cardsTable,
    transaction: mockedDb.transaction,
  },
}))

function createCard(partial: Partial<CardRecord>): CardRecord {
  const today = Math.floor(Date.now() / dayMs)
  return {
    id: partial.id ?? `card_${Math.random()}`,
    noteId: partial.noteId ?? 'note',
    deckId: partial.deckId ?? 'deck',
    front: partial.front ?? 'front',
    back: partial.back ?? 'back',
    tags: partial.tags ?? [],
    extra: partial.extra ?? {
      acronym: '',
      examples: '',
      port: '',
      protocol: '',
    },
    type: partial.type ?? 2,
    queue: partial.queue ?? 2,
    due: partial.due ?? today + 10,
    interval: partial.interval ?? 10,
    factor: partial.factor ?? 2500,
    stability: partial.stability,
    difficulty: partial.difficulty,
    reps: partial.reps ?? 5,
    lapses: partial.lapses ?? 1,
    createdAt: partial.createdAt ?? Date.now(),
    algorithm: partial.algorithm,
  }
}

describe('Algorithm migration service', () => {
  beforeEach(() => {
    mockedDb.state.cards = []
    mockedDb.state.failOnCardId = null
    mockedDb.cardsTable.toArray.mockClear()
    mockedDb.cardsTable.update.mockClear()
    mockedDb.transaction.mockClear()

    const storage = new Map<string, string>()
    const localStorageMock = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      },
      removeItem: (key: string) => {
        storage.delete(key)
      },
      clear: () => {
        storage.clear()
      },
      key: (index: number) => Array.from(storage.keys())[index] ?? null,
      get length() {
        return storage.size
      },
    }
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    })
  })

  it('migrates SM2 cards to FSRS and fills stability/difficulty', async () => {
    mockedDb.state.cards = [
      createCard({
        id: 'sm2-1',
        algorithm: 'sm2',
        factor: 2500,
        interval: 20,
        stability: undefined,
        difficulty: undefined,
      }),
    ]

    await migrateCardsForAlgorithm('fsrs')

    expect(mockedDb.state.cards[0].algorithm).toBe('fsrs')
    expect(mockedDb.state.cards[0].stability).toBe(20)
    expect(mockedDb.state.cards[0].difficulty).toBe(5)
    expect(mockedDb.state.cards[0].factor).toBe(2500)
    expect(mockedDb.state.cards[0].interval).toBe(20)
  })

  it('migrates FSRS to SM2 using interval and recalculates due from today', async () => {
    const today = Math.floor(Date.now() / dayMs)
    mockedDb.state.cards = [
      createCard({
        id: 'fsrs-1',
        algorithm: 'fsrs',
        difficulty: 6,
        stability: 45,
        interval: 30,
        due: today + 30,
      }),
    ]

    await migrateCardsForAlgorithm('sm2')

    expect(mockedDb.state.cards[0].algorithm).toBe('sm2')
    expect(mockedDb.state.cards[0].factor).toBe(3000)
    expect(mockedDb.state.cards[0].interval).toBe(30)
    expect(mockedDb.state.cards[0].due).toBe(today + 30)
  })

  it('does not skip fsrs cards missing scheduling fields', async () => {
    mockedDb.state.cards = [
      createCard({
        id: 'fsrs-broken',
        algorithm: 'fsrs',
        stability: undefined,
        difficulty: undefined,
        factor: 2500,
        interval: 10,
      }),
    ]

    await migrateCardsForAlgorithm('fsrs')

    expect(mockedDb.state.cards[0].stability).toBe(10)
    expect(mockedDb.state.cards[0].difficulty).toBe(5)
  })

  it('rolls back already migrated cards on failure', async () => {
    const original = [
      createCard({ id: 'ok-card', algorithm: 'sm2', factor: 2500, interval: 10 }),
      createCard({ id: 'fail-card', algorithm: 'sm2', factor: 2000, interval: 5 }),
    ]
    mockedDb.state.cards = original.map(card => ({ ...card }))
    mockedDb.state.failOnCardId = 'fail-card'

    await expect(migrateCardsForAlgorithm('fsrs')).rejects.toThrow('simulated migration failure')

    expect(mockedDb.state.cards[0]).toMatchObject(original[0])
    expect(mockedDb.state.cards[1]).toMatchObject(original[1])
  })

  it('sets updatedAt on migrated cards', async () => {
    const before = Date.now()
    mockedDb.state.cards = [
      createCard({ id: 'ts-card', algorithm: 'sm2', factor: 2500, interval: 5 }),
    ]

    await migrateCardsForAlgorithm('fsrs')

    const updatedAt = mockedDb.state.cards[0].updatedAt
    expect(typeof updatedAt).toBe('number')
    expect(updatedAt).toBeGreaterThanOrEqual(before)
  })

  it('enqueues card.update sync ops for each migrated card', async () => {
    const mockEnqueue = vi.mocked(enqueueSyncOperation)
    mockEnqueue.mockClear()

    mockedDb.state.cards = [
      createCard({ id: 'sync-1', algorithm: 'sm2', factor: 2500, interval: 10 }),
      createCard({ id: 'sync-2', algorithm: 'sm2', factor: 2000, interval: 5 }),
    ]

    await migrateCardsForAlgorithm('fsrs')

    const calls = mockEnqueue.mock.calls.filter(c => c[0] === 'card.update')
    expect(calls.length).toBe(2)
    const cardIds = calls.map(c => (c[1] as { cardId: string }).cardId).sort()
    expect(cardIds).toEqual(['sync-1', 'sync-2'])
  })

  it('does not enqueue sync ops for already-correct algorithm cards', async () => {
    const mockEnqueue = vi.mocked(enqueueSyncOperation)
    mockEnqueue.mockClear()

    mockedDb.state.cards = [
      createCard({ id: 'skip-1', algorithm: 'fsrs', stability: 5, difficulty: 3, interval: 5 }),
    ]

    await migrateCardsForAlgorithm('fsrs')

    const calls = mockEnqueue.mock.calls.filter(c => c[0] === 'card.update')
    expect(calls.length).toBe(0)
  })
})
