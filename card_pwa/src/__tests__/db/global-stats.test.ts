import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchGlobalStats } from '../../db/queries'
import type { CardRecord, DeckRecord, ReviewRecord } from '../../db'
import { SM2 } from '../../utils/sm2'
import { getDayStartMs } from '../../utils/time'

const DAY_MS = 86_400_000

type CardWhereResult = {
  equals: (value: number) => {
    and: (predicate: (card: CardRecord) => boolean) => {
      count: () => Promise<number>
    }
  }
  anyOf: (...values: number[]) => {
    and: (predicate: (card: CardRecord) => boolean) => {
      count: () => Promise<number>
    }
  }
}

const mockedDb = vi.hoisted(() => {
  const state = {
    cards: [] as CardRecord[],
    decks: [] as DeckRecord[],
    reviews: [] as Array<ReviewRecord & { id: number }>,
  }

  const cards = {
    filter: vi.fn((predicate: (card: CardRecord) => boolean) => ({
      count: async () => state.cards.filter(predicate).length,
    })),
    where: vi.fn((_field: string): CardWhereResult => ({
      equals: (value: number) => ({
        and: (predicate: (card: CardRecord) => boolean) => ({
          count: async () => state.cards.filter(card => card.type === value && predicate(card)).length,
        }),
      }),
      anyOf: (...values: number[]) => ({
        and: (predicate: (card: CardRecord) => boolean) => ({
          count: async () => state.cards.filter(card => values.includes(card.type) && predicate(card)).length,
        }),
      }),
    })),
  }

  const decks = {
    filter: vi.fn((predicate: (deck: DeckRecord) => boolean) => ({
      count: async () => state.decks.filter(predicate).length,
    })),
  }

  const reviews = {
    where: vi.fn((_field: string) => ({
      aboveOrEqual: (timestamp: number) => ({
        toArray: async () => state.reviews.filter(review => review.timestamp >= timestamp),
      }),
    })),
  }

  return { state, cards, decks, reviews }
})

vi.mock('../../db', () => ({
  db: {
    cards: mockedDb.cards,
    decks: mockedDb.decks,
    reviews: mockedDb.reviews,
  },
}))

function makeCard(partial: Partial<CardRecord>): CardRecord {
  const now = Date.now()
  const today = Math.floor(now / DAY_MS)
  return {
    id: partial.id ?? `card-${Math.random().toString(36).slice(2)}`,
    noteId: partial.noteId ?? `note-${Math.random().toString(36).slice(2)}`,
    deckId: partial.deckId ?? 'deck-1',
    front: partial.front ?? 'Q',
    back: partial.back ?? 'A',
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
    isDeleted: partial.isDeleted,
    deletedAt: partial.deletedAt,
  }
}

function makeDeck(partial: Partial<DeckRecord>): DeckRecord {
  const now = Date.now()
  return {
    id: partial.id ?? `deck-${Math.random().toString(36).slice(2)}`,
    name: partial.name ?? 'Deck',
    source: partial.source ?? 'manual',
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt,
    isDeleted: partial.isDeleted,
    deletedAt: partial.deletedAt,
  }
}

function makeReview(partial: Partial<ReviewRecord> & Pick<ReviewRecord, 'cardId' | 'rating' | 'timestamp'>): ReviewRecord & { id: number } {
  return {
    id: Math.floor(Math.random() * 1_000_000),
    cardId: partial.cardId,
    rating: partial.rating,
    timestamp: partial.timestamp,
    timeMs: partial.timeMs ?? 1000,
  }
}

describe('fetchGlobalStats', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-11T10:00:00.000Z'))
    mockedDb.state.cards = []
    mockedDb.state.decks = []
    mockedDb.state.reviews = []
    mockedDb.cards.filter.mockClear()
    mockedDb.cards.where.mockClear()
    mockedDb.decks.filter.mockClear()
    mockedDb.reviews.where.mockClear()
  })

  it('computes all counters for mixed card states and reviews', async () => {
    const now = Date.now()
    const today = Math.floor(now / DAY_MS)

    mockedDb.state.cards = [
      makeCard({ id: 'new-1', type: SM2.CARD_TYPE_NEW, queue: SM2.QUEUE_NEW, due: today, dueAt: now + 1000 }),
      makeCard({ id: 'learn-1', type: SM2.CARD_TYPE_LEARNING, queue: SM2.QUEUE_LEARNING, due: today, dueAt: now + 5 * 60_000 }),
      makeCard({ id: 'relearn-1', type: SM2.CARD_TYPE_RELEARNING, queue: SM2.QUEUE_LEARNING, due: today, dueAt: now + 10 * 60_000 }),
      makeCard({ id: 'review-due', type: SM2.CARD_TYPE_REVIEW, queue: SM2.QUEUE_REVIEW, due: today, dueAt: now - 60_000 }),
      makeCard({ id: 'review-future', type: SM2.CARD_TYPE_REVIEW, queue: SM2.QUEUE_REVIEW, due: today + 2, dueAt: now + 2 * DAY_MS }),
    ]

    mockedDb.state.decks = [
      makeDeck({ id: 'deck-1' }),
      makeDeck({ id: 'deck-2' }),
    ]

    mockedDb.state.reviews = [
      makeReview({ cardId: 'review-due', rating: 4, timestamp: now - 30 * 60_000 }),
      makeReview({ cardId: 'review-due', rating: 2, timestamp: now - 20 * 60_000 }),
      makeReview({ cardId: 'review-due', rating: 3, timestamp: now - 10 * 60_000 }),
    ]

    const stats = await fetchGlobalStats()

    expect(stats.total).toBe(5)
    expect(stats.new).toBe(1)
    expect(stats.learning).toBe(2)
    expect(stats.review).toBe(2)
    expect(stats.nowDue).toBe(4)
    expect(stats.overdueGt2Days).toBe(1)
    expect(stats.deckCount).toBe(2)
    expect(stats.reviewedToday).toBe(3)
    expect(stats.successToday).toBe(67)
  })

  it('excludes deleted cards and decks from all counters', async () => {
    const now = Date.now()
    const today = Math.floor(now / DAY_MS)

    mockedDb.state.cards = [
      makeCard({ id: 'active', type: SM2.CARD_TYPE_REVIEW, queue: SM2.QUEUE_REVIEW, due: today, dueAt: now - 1000, isDeleted: false }),
      makeCard({ id: 'deleted-new', type: SM2.CARD_TYPE_NEW, queue: SM2.QUEUE_NEW, due: today, dueAt: now, isDeleted: true }),
      makeCard({ id: 'deleted-review', type: SM2.CARD_TYPE_REVIEW, queue: SM2.QUEUE_REVIEW, due: today + 3, dueAt: now + 3 * DAY_MS, isDeleted: true }),
    ]

    mockedDb.state.decks = [
      makeDeck({ id: 'deck-active', isDeleted: false }),
      makeDeck({ id: 'deck-deleted', isDeleted: true }),
    ]

    mockedDb.state.reviews = [
      makeReview({ cardId: 'active', rating: 3, timestamp: now - 5 * 60_000 }),
    ]

    const stats = await fetchGlobalStats()

    expect(stats.total).toBe(1)
    expect(stats.new).toBe(0)
    expect(stats.review).toBe(1)
    expect(stats.nowDue).toBe(1)
    expect(stats.overdueGt2Days).toBe(0)
    expect(stats.deckCount).toBe(1)
    expect(stats.reviewedToday).toBe(1)
  })

  it('uses nextDayStartsAt for reviewedToday/successToday day boundary', async () => {
    vi.setSystemTime(new Date('2026-04-11T03:00:00.000Z'))
    const now = Date.now()
    const dayStart = getDayStartMs(now, 4)

    mockedDb.state.cards = [
      makeCard({ id: 'card-1', type: SM2.CARD_TYPE_REVIEW, queue: SM2.QUEUE_REVIEW }),
    ]
    mockedDb.state.decks = [makeDeck({ id: 'deck-1' })]

    mockedDb.state.reviews = [
      // This belongs to the current study day window.
      makeReview({ cardId: 'card-1', rating: 4, timestamp: dayStart + 60_000 }),
      // This is before shifted day start and must be excluded.
      makeReview({ cardId: 'card-1', rating: 1, timestamp: dayStart - 60_000 }),
    ]

    const stats = await fetchGlobalStats(4)

    expect(stats.reviewedToday).toBe(1)
    expect(stats.successToday).toBe(100)
  })

  it('returns successToday=0 when no reviews exist in current day window', async () => {
    mockedDb.state.cards = [makeCard({ type: SM2.CARD_TYPE_NEW, queue: SM2.QUEUE_NEW })]
    mockedDb.state.decks = [makeDeck({ id: 'deck-1' })]
    mockedDb.state.reviews = []

    const stats = await fetchGlobalStats()

    expect(stats.reviewedToday).toBe(0)
    expect(stats.successToday).toBe(0)
  })
})
