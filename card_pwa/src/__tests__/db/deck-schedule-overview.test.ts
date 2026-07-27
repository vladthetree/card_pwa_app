/**
 * AI_CONTEXT: Vitest coverage for deck schedule overview; protects db behavior from regressions in the learning PWA.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { countTodayDueFromDecks, getDeckScheduleOverview, listDeckOptions } from '../../db/queries'
import type { CardRecord, DeckRecord } from '../../db'
import { SM2 } from '../../utils/sm2'

const dayMs = 86_400_000

const mockedDb = vi.hoisted(() => {
  const state = {
    cards: [] as CardRecord[],
    decks: [] as DeckRecord[],
    reviews: [] as Array<{ cardId: string; timestamp: number }>,
  }

  // getDeckHomeMetadata liest seit dem Shared-Read-Umbau die ganze Karten-
  // Tabelle (readAllCardsShared) und filtert selbst über das Owner-Mapping;
  // der Mock liefert daher nur noch toArray.
  const cards = {
    toArray: vi.fn(async () => state.cards.map(card => ({ ...card }))),
  }

  const decks = {
    toArray: vi.fn(async () => state.decks.map(deck => ({ ...deck }))),
  }

  // Reviews bleiben Teil des DB-Mocks, damit der Regressionsfall belegt, dass
  // bereits gelernte Karten das Deck-Kontingent nicht mehr auf 10/9 kuerzen.
  const reviews = {
    where: vi.fn((index: string) => ({
      aboveOrEqual: (value: number) => ({
        toArray: async () =>
          index === 'timestamp' ? state.reviews.filter(review => review.timestamp >= value) : [],
      }),
      anyOf: (cardIds: string[]) => ({
        toArray: async () =>
          index === 'cardId' ? state.reviews.filter(review => cardIds.includes(review.cardId)) : [],
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

function createCard(partial: Partial<CardRecord>): CardRecord {
  const now = Date.now()
  const today = Math.floor(now / dayMs)
  return {
    id: partial.id ?? `card-${Math.random()}`,
    noteId: partial.noteId ?? 'note',
    deckId: partial.deckId ?? 'deck-1',
    front: partial.front ?? 'front',
    back: partial.back ?? 'back',
    tags: partial.tags ?? [],
    extra: partial.extra ?? { acronym: '', examples: '', port: '', protocol: '' },
    type: partial.type ?? SM2.CARD_TYPE_NEW,
    queue: partial.queue ?? SM2.QUEUE_NEW,
    due: partial.due ?? today,
    dueAt: partial.dueAt ?? now,
    interval: partial.interval ?? 0,
    factor: partial.factor ?? SM2.DEFAULT_EASE,
    stability: partial.stability,
    difficulty: partial.difficulty,
    reps: partial.reps ?? 0,
    lapses: partial.lapses ?? 0,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt,
    algorithm: partial.algorithm,
  }
}

function createDeck(partial: Partial<DeckRecord>): DeckRecord {
  const now = Date.now()
  return {
    id: partial.id ?? 'deck-1',
    name: partial.name ?? 'Deck',
    source: partial.source ?? 'manual',
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt,
    isDeleted: partial.isDeleted,
  }
}

describe('getDeckScheduleOverview', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-10T12:00:00.000Z'))
    mockedDb.state.cards = []
    mockedDb.state.decks = []
    mockedDb.state.reviews = []
    mockedDb.cards.toArray.mockClear()
    mockedDb.decks.toArray.mockClear()
  })

  it('returns empty object for empty deck list', async () => {
    const result = await getDeckScheduleOverview([], 50)
    expect(result).toEqual({})
    expect(mockedDb.cards.toArray).not.toHaveBeenCalled()
  })

  it('lists flat active deck options ordered by name for card forms', async () => {
    mockedDb.state.decks = [
      createDeck({ id: 'child', name: 'Beta', parentDeckId: 'root' }),
      createDeck({ id: 'deleted', name: 'A deleted', isDeleted: true }),
      createDeck({ id: 'root', name: 'Alpha' }),
    ]

    await expect(listDeckOptions()).resolves.toEqual([
      { id: 'root', name: 'Alpha' },
      { id: 'child', name: 'Beta' },
    ])
  })

  it('caps today total to configured daily limit when review already exceeds limit', async () => {
    const now = Date.now()
    mockedDb.state.cards = [
      ...Array.from({ length: 80 }, (_, idx) =>
        createCard({
          id: `r-${idx}`,
          deckId: 'deck-1',
          type: SM2.CARD_TYPE_REVIEW,
          queue: SM2.QUEUE_REVIEW,
          dueAt: now - 1_000,
        })
      ),
      ...Array.from({ length: 25 }, (_, idx) =>
        createCard({
          id: `n-${idx}`,
          deckId: 'deck-1',
          type: SM2.CARD_TYPE_NEW,
          queue: SM2.QUEUE_NEW,
        })
      ),
    ]

    const result = await getDeckScheduleOverview(['deck-1'], 50)

    expect(result['deck-1'].today.review).toBe(50)
    expect(result['deck-1'].today.new).toBe(0)
    expect(result['deck-1'].today.total).toBe(50)
  })

  it('fills remaining daily capacity with new cards after review', async () => {
    const now = Date.now()
    mockedDb.state.cards = [
      ...Array.from({ length: 20 }, (_, idx) =>
        createCard({
          id: `review-${idx}`,
          deckId: 'deck-1',
          type: SM2.CARD_TYPE_REVIEW,
          dueAt: now - 10_000,
        })
      ),
      ...Array.from({ length: 40 }, (_, idx) =>
        createCard({
          id: `new-${idx}`,
          deckId: 'deck-1',
          type: SM2.CARD_TYPE_NEW,
        })
      ),
    ]

    const result = await getDeckScheduleOverview(['deck-1'], 50)

    expect(result['deck-1'].today.review).toBe(20)
    expect(result['deck-1'].today.new).toBe(30)
    expect(result['deck-1'].today.total).toBe(50)
  })

  it('applies tomorrow capacity independently from today', async () => {
    const todayStart = new Date().setHours(0, 0, 0, 0)
    const tomorrowStart = todayStart + dayMs
    const dayAfterTomorrowStart = tomorrowStart + dayMs

    mockedDb.state.cards = [
      ...Array.from({ length: 10 }, (_, idx) =>
        createCard({
          id: `today-review-${idx}`,
          deckId: 'deck-1',
          type: SM2.CARD_TYPE_REVIEW,
          dueAt: tomorrowStart - 1,
        })
      ),
      ...Array.from({ length: 30 }, (_, idx) =>
        createCard({
          id: `tom-review-${idx}`,
          deckId: 'deck-1',
          type: SM2.CARD_TYPE_REVIEW,
          dueAt: tomorrowStart + Math.min(1_000 + idx, dayAfterTomorrowStart - tomorrowStart - 1),
        })
      ),
      ...Array.from({ length: 60 }, (_, idx) =>
        createCard({
          id: `new-${idx}`,
          deckId: 'deck-1',
          type: SM2.CARD_TYPE_NEW,
        })
      ),
    ]

    const result = await getDeckScheduleOverview(['deck-1'], 50)

    expect(result['deck-1'].today.total).toBe(50)
    expect(result['deck-1'].tomorrow.total).toBe(50)
    expect(result['deck-1'].tomorrow.review).toBe(30)
    expect(result['deck-1'].tomorrow.new).toBe(20)
  })

  it('counts learning/relearning cards by dueAt boundaries', async () => {
    const todayStart = new Date().setHours(0, 0, 0, 0)
    const tomorrowStart = todayStart + dayMs
    const dayAfterTomorrowStart = tomorrowStart + dayMs

    mockedDb.state.cards = [
      createCard({ id: 'learn-today', deckId: 'deck-1', type: SM2.CARD_TYPE_LEARNING, dueAt: tomorrowStart - 1 }),
      createCard({ id: 'relearn-tomorrow', deckId: 'deck-1', type: SM2.CARD_TYPE_RELEARNING, dueAt: dayAfterTomorrowStart - 1 }),
      createCard({ id: 'learn-later', deckId: 'deck-1', type: SM2.CARD_TYPE_LEARNING, dueAt: dayAfterTomorrowStart + 1 }),
    ]

    const result = await getDeckScheduleOverview(['deck-1'], 50)

    expect(result['deck-1'].today.review).toBe(1)
    expect(result['deck-1'].tomorrow.review).toBe(1)
  })

  it('falls back to default daily limit (50) for non-finite limit values', async () => {
    const now = Date.now()
    mockedDb.state.cards = Array.from({ length: 80 }, (_, idx) =>
      createCard({
        id: `review-${idx}`,
        deckId: 'deck-1',
        type: SM2.CARD_TYPE_REVIEW,
        dueAt: now - idx,
      })
    )

    const result = await getDeckScheduleOverview(['deck-1'], Number.NaN)
    expect(result['deck-1'].today.total).toBe(50)
  })

  it('returns separate overview entries for multiple decks', async () => {
    const now = Date.now()
    mockedDb.state.cards = [
      createCard({ id: 'a-1', deckId: 'deck-a', type: SM2.CARD_TYPE_REVIEW, dueAt: now - 1 }),
      createCard({ id: 'a-2', deckId: 'deck-a', type: SM2.CARD_TYPE_NEW }),
      createCard({ id: 'b-1', deckId: 'deck-b', type: SM2.CARD_TYPE_REVIEW, dueAt: now - 1 }),
    ]

    const result = await getDeckScheduleOverview(['deck-a', 'deck-b'], 50)

    expect(Object.keys(result).sort()).toEqual(['deck-a', 'deck-b'])
    expect(result['deck-a'].today.total).toBeGreaterThan(result['deck-b'].today.total)
  })

  it('uses custom nextDayStartsAt boundary for review classification', async () => {
    const now = Date.now()
    const dayStart = new Date(now)
    dayStart.setHours(6, 0, 0, 0)
    const customBoundary = dayStart.getTime() + dayMs

    mockedDb.state.cards = [
      createCard({
        id: 'rv-today',
        deckId: 'deck-1',
        type: SM2.CARD_TYPE_REVIEW,
        queue: SM2.QUEUE_REVIEW,
        dueAt: customBoundary - 1,
      }),
      createCard({
        id: 'rv-tomorrow',
        deckId: 'deck-1',
        type: SM2.CARD_TYPE_REVIEW,
        queue: SM2.QUEUE_REVIEW,
        dueAt: customBoundary,
      }),
    ]

    const result = await getDeckScheduleOverview(['deck-1'], 50, 6)

    expect(result['deck-1'].today.review).toBe(1)
    expect(result['deck-1'].tomorrow.review).toBe(1)
  })

  it('does not auto-project relearning cards due today into tomorrow review', async () => {
    const now = Date.now()
    mockedDb.state.cards = [
      createCard({
        id: 'relearn-now',
        deckId: 'deck-1',
        type: SM2.CARD_TYPE_RELEARNING,
        queue: SM2.QUEUE_LEARNING,
        dueAt: now + 10 * 60_000,
      }),
    ]

    const result = await getDeckScheduleOverview(['deck-1'], 50)

    expect(result['deck-1'].today.review).toBe(1)
    expect(result['deck-1'].tomorrow.review).toBe(0)
  })

  it('sums deck today totals using the configured daily limit', async () => {
    const now = Date.now()

    mockedDb.state.decks = [
      createDeck({ id: 'deck-a' }),
      createDeck({ id: 'deck-b' }),
    ]
    mockedDb.state.cards = [
      ...Array.from({ length: 8 }, (_, idx) =>
        createCard({
          id: `a-review-${idx}`,
          deckId: 'deck-a',
          type: SM2.CARD_TYPE_REVIEW,
          dueAt: now - (idx + 1),
        })
      ),
      ...Array.from({ length: 6 }, (_, idx) =>
        createCard({
          id: `a-new-${idx}`,
          deckId: 'deck-a',
          type: SM2.CARD_TYPE_NEW,
        })
      ),
      ...Array.from({ length: 3 }, (_, idx) =>
        createCard({
          id: `b-review-${idx}`,
          deckId: 'deck-b',
          type: SM2.CARD_TYPE_REVIEW,
          dueAt: now - (idx + 20),
        })
      ),
      ...Array.from({ length: 10 }, (_, idx) =>
        createCard({
          id: `b-new-${idx}`,
          deckId: 'deck-b',
          type: SM2.CARD_TYPE_NEW,
        })
      ),
    ]

    await expect(countTodayDueFromDecks(10)).resolves.toBe(20)
  })

  // Nur der aktuelle Reglerwert bestimmt die Vorschau normaler Decks. Das
  // separate Paket-Kontingent darf sie weder auf 10 noch auf 9 kappen.
  it.each([10, 30, 70, 120, 190])(
    'uses the configured daily deck quota %i',
    async configuredLimit => {
      mockedDb.state.cards = Array.from({ length: 240 }, (_, idx) =>
        createCard({
          id: `new-${idx}`,
          deckId: 'deck-1',
          type: SM2.CARD_TYPE_NEW,
        })
      )

      const result = await getDeckScheduleOverview(['deck-1'], configuredLimit, 0)

      expect(result['deck-1'].today.new).toBe(configuredLimit)
      expect(result['deck-1'].today.total).toBe(configuredLimit)
      expect(result['deck-1'].tomorrow.new).toBe(Math.min(240 - configuredLimit, configuredLimit))
    },
  )

  it('does not subtract cards introduced today from a normal deck quota', async () => {
    const now = Date.now()
    mockedDb.state.cards = Array.from({ length: 40 }, (_, idx) =>
      createCard({
        id: `new-${idx}`,
        deckId: 'deck-1',
        type: SM2.CARD_TYPE_NEW,
      })
    )
    // Der alte globale Budgetpfad zeigte nach einer gelernten Karte 9 statt 10.
    mockedDb.state.reviews = Array.from({ length: 4 }, (_, idx) => ({
      cardId: `introduced-${idx}`,
      timestamp: now - 60_000,
    }))

    const result = await getDeckScheduleOverview(['deck-1'], 50, 0)

    expect(result['deck-1'].today.new).toBe(40)
  })

  it('uses all available new cards when they fit into the deck quota', async () => {
    mockedDb.state.cards = Array.from({ length: 40 }, (_, idx) =>
      createCard({
        id: `new-${idx}`,
        deckId: 'deck-1',
        type: SM2.CARD_TYPE_NEW,
      })
    )

    const result = await getDeckScheduleOverview(['deck-1'], 50, 0)

    expect(result['deck-1'].today.new).toBe(40)
  })
})
