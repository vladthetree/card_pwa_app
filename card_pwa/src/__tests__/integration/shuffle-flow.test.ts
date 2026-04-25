import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CardRecord, DeckRecord, ReviewRecord } from '../../db'
import { SM2 } from '../../utils/sm2'

const DAY_MS = 86_400_000

const mockedRuntime = vi.hoisted(() => {
  const state = {
    cards: [] as CardRecord[],
    decks: [] as DeckRecord[],
    reviews: [] as Array<ReviewRecord & { id: number }>,
    activeSessions: new Map<string, { id: string; payload: string; updatedAt: number }>(),
    reviewId: 1,
    syncActive: true,
    selectedDeckIds: [] as string[],
  }

  const cards = {
    get: vi.fn(async (cardId: string) => state.cards.find(card => card.id === cardId)),
    update: vi.fn(async (cardId: string, updates: Partial<CardRecord>) => {
      const index = state.cards.findIndex(card => card.id === cardId)
      if (index === -1) return 0
      state.cards[index] = { ...state.cards[index], ...updates }
      return 1
    }),
    where: vi.fn((field: string) => {
      if (field === 'deckId') {
        return {
          equals: (deckId: string) => ({
            toArray: async () => state.cards.filter(card => card.deckId === deckId).map(card => ({ ...card })),
          }),
        }
      }
      if (field === '[deckId+type]') {
        return {
          equals: ([deckId, type]: [string, number]) => ({
            toArray: async () => state.cards
              .filter(card => card.deckId === deckId && card.type === type)
              .map(card => ({ ...card })),
          }),
        }
      }
      if (field === '[deckId+dueAt]') {
        return {
          between: ([deckId, minDueAt]: [string, number], [_endDeckId, maxDueAt]: [string, number]) => ({
            toArray: async () => state.cards
              .filter(card => card.deckId === deckId && Number(card.dueAt) >= minDueAt && Number(card.dueAt) <= maxDueAt)
              .map(card => ({ ...card })),
          }),
        }
      }
      throw new Error(`Unsupported cards.where field: ${field}`)
    }),
  }

  const reviews = {
    add: vi.fn(async (review: Omit<ReviewRecord, 'id'>) => {
      const id = state.reviewId++
      state.reviews.push({ id, ...review })
      return id
    }),
    delete: vi.fn(async (reviewId: number) => {
      state.reviews = state.reviews.filter(review => review.id !== reviewId)
      return 1
    }),
    where: vi.fn((field: string) => {
      if (field === 'cardId') {
        return {
          anyOf: (cardIds: string[]) => ({
            toArray: async () => state.reviews.filter(review => cardIds.includes(review.cardId)).map(review => ({ ...review })),
          }),
        }
      }
      throw new Error(`Unsupported reviews.where field: ${field}`)
    }),
  }

  const activeSessions = {
    get: vi.fn(async (id: string) => state.activeSessions.get(id)),
    put: vi.fn(async (record: { id: string; payload: string; updatedAt: number }) => {
      state.activeSessions.set(record.id, record)
    }),
    delete: vi.fn(async (id: string) => {
      state.activeSessions.delete(id)
    }),
  }

  const decks = {
    filter: vi.fn((predicate: (deck: DeckRecord) => boolean) => ({
      toArray: async () => state.decks.filter(predicate).map(deck => ({ ...deck })),
    })),
  }

  const transaction = vi.fn(async (...args: unknown[]) => {
    const callback = args[args.length - 1] as () => Promise<void>
    await callback()
  })

  return {
    state,
    db: { cards, reviews, activeSessions, decks, transaction },
    enqueueSyncOperation: vi.fn(async () => undefined),
    verifySchedulingPersistence: vi.fn(async () => undefined),
  }
})

vi.mock('../../db', () => ({
  db: mockedRuntime.db,
}))

vi.mock('../../services/syncQueue', () => ({
  enqueueSyncOperation: mockedRuntime.enqueueSyncOperation,
}))

vi.mock('../../db/queries/diagnostics', () => ({
  verifySchedulingPersistence: mockedRuntime.verifySchedulingPersistence,
}))

vi.mock('../../services/syncConfig', () => ({
  isSyncActive: () => mockedRuntime.state.syncActive,
  makeOpId: () => 'review-op-id',
}))

vi.mock('../../services/profileService', () => ({
  readSelectedDeckIds: () => mockedRuntime.state.selectedDeckIds,
}))

import {
  getDeckMetricsSnapshot,
  getShuffleCollectionMetricsSnapshot,
  readActiveSession,
  readShuffleSession,
  writeActiveSession,
  writeShuffleSession,
  recordReview,
} from '../../db/queries'
import { buildSelectedShuffleCards } from '../../services/ShuffleSessionManager'
import {
  buildPersistedStudySession,
  buildShuffleSessionId,
  parsePersistedStudySession,
} from '../../services/studySessionPersistence'

function makeDeck(partial: Partial<DeckRecord>): DeckRecord {
  const now = Date.now()
  return {
    id: partial.id ?? `deck-${Math.random().toString(36).slice(2)}`,
    name: partial.name ?? 'Deck',
    source: partial.source ?? 'manual',
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
    isDeleted: partial.isDeleted,
    deletedAt: partial.deletedAt,
  }
}

function makeCard(partial: Partial<CardRecord>): CardRecord {
  const now = Date.now()
  const today = Math.floor(now / DAY_MS)
  return {
    id: partial.id ?? `card-${Math.random().toString(36).slice(2)}`,
    noteId: partial.noteId ?? `note-${Math.random().toString(36).slice(2)}`,
    deckId: partial.deckId ?? 'deck-a',
    front: partial.front ?? 'Question',
    back: partial.back ?? 'Answer',
    tags: partial.tags ?? [],
    extra: partial.extra ?? { acronym: '', examples: '', port: '', protocol: '' },
    type: partial.type ?? SM2.CARD_TYPE_REVIEW,
    queue: partial.queue ?? SM2.QUEUE_REVIEW,
    due: partial.due ?? today,
    dueAt: partial.dueAt ?? now,
    interval: partial.interval ?? 1,
    factor: partial.factor ?? 2500,
    stability: partial.stability ?? 2,
    difficulty: partial.difficulty ?? 5,
    reps: partial.reps ?? 1,
    lapses: partial.lapses ?? 0,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
    algorithm: partial.algorithm ?? 'sm2',
    isDeleted: partial.isDeleted,
    deletedAt: partial.deletedAt,
  }
}

describe('shuffle flow integration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-23T10:00:00.000Z'))
    mockedRuntime.state.cards = []
    mockedRuntime.state.decks = []
    mockedRuntime.state.reviews = []
    mockedRuntime.state.activeSessions = new Map()
    mockedRuntime.state.reviewId = 1
    mockedRuntime.state.syncActive = true
    mockedRuntime.state.selectedDeckIds = []
    mockedRuntime.db.cards.get.mockClear()
    mockedRuntime.db.cards.update.mockClear()
    mockedRuntime.db.cards.where.mockClear()
    mockedRuntime.db.reviews.add.mockClear()
    mockedRuntime.db.reviews.delete.mockClear()
    mockedRuntime.db.reviews.where.mockClear()
    mockedRuntime.db.activeSessions.get.mockClear()
    mockedRuntime.db.activeSessions.put.mockClear()
    mockedRuntime.db.activeSessions.delete.mockClear()
    mockedRuntime.db.decks.filter.mockClear()
    mockedRuntime.db.transaction.mockClear()
    mockedRuntime.enqueueSyncOperation.mockClear()
    mockedRuntime.verifySchedulingPersistence.mockClear()
  })

  it('routes shuffle reviews back into per-deck metrics without changing source deck ownership', async () => {
    const now = Date.now()
    mockedRuntime.state.selectedDeckIds = ['deck-a', 'deck-b']
    mockedRuntime.state.decks = [
      makeDeck({ id: 'deck-a', name: 'Alpha' }),
      makeDeck({ id: 'deck-b', name: 'Beta' }),
    ]
    mockedRuntime.state.cards = [
      makeCard({ id: 'card-a1', deckId: 'deck-a', dueAt: now - 1_000, reps: 2, lapses: 0 }),
      makeCard({ id: 'card-b1', deckId: 'deck-b', dueAt: now - 2_000, reps: 4, lapses: 1 }),
    ]

    const selected = await buildSelectedShuffleCards(
      { deckIds: ['deck-a', 'deck-b'] },
      { userId: 'profile-1', maxCards: 10 },
    )

    expect(selected.map(card => card.id)).toEqual(['card-b1', 'card-a1'])

    const reviewA = await recordReview('card-a1', 4, 900, 'sm2')
    const reviewB = await recordReview('card-b1', 2, 1200, 'sm2')

    expect(reviewA.ok).toBe(true)
    expect(reviewB.ok).toBe(true)
    expect(mockedRuntime.state.cards.find(card => card.id === 'card-a1')?.deckId).toBe('deck-a')
    expect(mockedRuntime.state.cards.find(card => card.id === 'card-b1')?.deckId).toBe('deck-b')
    expect(mockedRuntime.state.reviews.map(review => review.cardId)).toEqual(['card-a1', 'card-b1'])

    const metricsA = await getDeckMetricsSnapshot('deck-a', 'all')
    const metricsB = await getDeckMetricsSnapshot('deck-b', 'all')
    const aggregate = await getShuffleCollectionMetricsSnapshot(['deck-a', 'deck-b'], 'all')

    expect(metricsA.totalReviews).toBe(1)
    expect(metricsA.successRate).toBe(100)
    expect(metricsA.ratingCounts[4]).toBe(1)

    expect(metricsB.totalReviews).toBe(1)
    expect(metricsB.successRate).toBe(0)
    expect(metricsB.ratingCounts[2]).toBe(1)
    expect(aggregate.totalReviews).toBe(2)
    expect(aggregate.cardCount).toBe(2)
    expect(aggregate.ratingCounts[4]).toBe(1)
    expect(aggregate.ratingCounts[2]).toBe(1)
  })

  it('keeps shuffle sessions namespaced and resumable alongside regular deck sessions', async () => {
    const sessionId = buildShuffleSessionId('collection-1')
    const shufflePayload = buildPersistedStudySession({
      deckId: sessionId,
      kind: 'shuffle',
      collectionId: 'collection-1',
      deckIds: ['deck-a', 'deck-b'],
      cardOrigins: { 'card-a1': 'deck-a', 'card-b1': 'deck-b' },
      cardIds: ['card-a1', 'card-b1'],
      cardLimit: 50,
      sessionCount: 2,
      isFlipped: false,
      isDone: false,
      lastRating: null,
      lowRatingCounts: {},
      relearnSuccessCounts: {},
      forcedTomorrowCardIds: [],
      againCounts: {},
      startTime: Date.now() - 1_000,
      nowMs: Date.now(),
    })

    await writeActiveSession('deck-a', '{"deckSession":true}')
    await writeShuffleSession('collection-1', JSON.stringify(shufflePayload))

    const storedDeckSession = await readActiveSession('deck-a')
    const storedShuffleSession = await readShuffleSession('collection-1')
    const parsedShuffle = parsePersistedStudySession(storedShuffleSession, sessionId, Date.now())

    expect(storedDeckSession).toBe('{"deckSession":true}')
    expect(parsedShuffle?.kind).toBe('shuffle')
    expect(parsedShuffle?.collectionId).toBe('collection-1')
    expect(parsedShuffle?.deckIds).toEqual(['deck-a', 'deck-b'])
    expect(parsedShuffle?.cardOrigins).toEqual({ 'card-a1': 'deck-a', 'card-b1': 'deck-b' })
    expect(mockedRuntime.state.activeSessions.has('deck-a')).toBe(true)
    expect(mockedRuntime.state.activeSessions.has('shuffle:collection-1')).toBe(true)
  })

  it('applies the shared study card limit across decks while keeping learning cards exempt', async () => {
    const now = Date.now()
    mockedRuntime.state.selectedDeckIds = ['deck-a', 'deck-b', 'deck-c', 'deck-d']
    mockedRuntime.state.decks = [
      makeDeck({ id: 'deck-a' }),
      makeDeck({ id: 'deck-b' }),
      makeDeck({ id: 'deck-c' }),
      makeDeck({ id: 'deck-d' }),
    ]
    mockedRuntime.state.cards = [
      makeCard({
        id: 'learning-a',
        deckId: 'deck-a',
        type: SM2.CARD_TYPE_LEARNING,
        queue: SM2.QUEUE_LEARNING,
        dueAt: now + 5 * 60_000,
        interval: 0,
      }),
      makeCard({ id: 'review-b', deckId: 'deck-b', type: SM2.CARD_TYPE_REVIEW, dueAt: now - 1_000 }),
      makeCard({ id: 'new-c', deckId: 'deck-c', type: SM2.CARD_TYPE_NEW, queue: SM2.QUEUE_NEW, dueAt: now }),
      makeCard({ id: 'new-d', deckId: 'deck-d', type: SM2.CARD_TYPE_NEW, queue: SM2.QUEUE_NEW, dueAt: now }),
    ]

    const selected = await buildSelectedShuffleCards(
      { deckIds: ['deck-a', 'deck-b', 'deck-c', 'deck-d'] },
      { userId: 'profile-1', maxCards: 1 },
    )

    expect(selected.map(card => card.id)).toEqual(['review-b', 'learning-a'])
  })
})
