import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchDeckCards } from '../../db/queries'
import type { CardRecord } from '../../db'
import { SM2 } from '../../utils/sm2'

// ─── DB Mock ─────────────────────────────────────────────────────────────────

const mockedDb = vi.hoisted(() => {
  const state = { cards: [] as CardRecord[] }

  const cards = {
    where: vi.fn((_field: string) => ({
      equals: (deckId: string) => ({
        toArray: async () => state.cards.filter(c => c.deckId === deckId),
      }),
    })),
  }

  return { state, cards }
})

vi.mock('../../db', () => ({
  db: {
    cards: mockedDb.cards,
  },
}))

// ─── Test Factory ─────────────────────────────────────────────────────────────

function makeRecord(partial: Partial<CardRecord>): CardRecord {
  const now = Date.now()
  const today = Math.floor(now / 86_400_000)
  return {
    id: partial.id ?? `card-${Math.random().toString(36).slice(2)}`,
    noteId: partial.noteId ?? 'note-1',
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
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Algorithm per deck — fetchDeckCards mapping', () => {
  beforeEach(() => {
    mockedDb.state.cards = []
    mockedDb.cards.where.mockClear()
  })

  describe('algorithm field defaults and mapping', () => {
    it('card without algorithm field defaults to sm2', async () => {
      mockedDb.state.cards = [makeRecord({ deckId: 'deck-1', algorithm: undefined })]
      const result = await fetchDeckCards('deck-1')

      expect(result[0].algorithm).toBe('sm2')
    })

    it('card with algorithm: sm2 preserves sm2', async () => {
      mockedDb.state.cards = [makeRecord({ deckId: 'deck-1', algorithm: 'sm2' })]
      const result = await fetchDeckCards('deck-1')

      expect(result[0].algorithm).toBe('sm2')
    })

    it('card with algorithm: fsrs preserves fsrs', async () => {
      mockedDb.state.cards = [makeRecord({ deckId: 'deck-1', algorithm: 'fsrs' })]
      const result = await fetchDeckCards('deck-1')

      expect(result[0].algorithm).toBe('fsrs')
    })
  })

  describe('algorithm-specific fields: sm2Ease and fsrsDifficulty', () => {
    it('sm2 card sets sm2Ease and leaves fsrsDifficulty undefined', async () => {
      mockedDb.state.cards = [makeRecord({ deckId: 'deck-1', algorithm: 'sm2', factor: 2500 })]
      const result = await fetchDeckCards('deck-1')

      expect(result[0].sm2Ease).toBe(2.5)             // factor / 1000
      expect(result[0].fsrsDifficulty).toBeUndefined()
    })

    it('fsrs card sets fsrsDifficulty and leaves sm2Ease undefined', async () => {
      mockedDb.state.cards = [
        makeRecord({ deckId: 'deck-1', algorithm: 'fsrs', difficulty: 6.2, factor: 3100 }),
      ]
      const result = await fetchDeckCards('deck-1')

      expect(result[0].fsrsDifficulty).toBe(6.2)
      expect(result[0].sm2Ease).toBeUndefined()
    })

    it('fsrs card without difficulty falls back to factor/500', async () => {
      mockedDb.state.cards = [
        makeRecord({ deckId: 'deck-1', algorithm: 'fsrs', difficulty: undefined, factor: 3000 }),
      ]
      const result = await fetchDeckCards('deck-1')

      expect(result[0].fsrsDifficulty).toBe(6)  // 3000 / 500
      expect(result[0].sm2Ease).toBeUndefined()
    })
  })

  describe('card type mapping: numeric → string', () => {
    const cases: Array<[number, string]> = [
      [SM2.CARD_TYPE_NEW,        'new'],
      [SM2.CARD_TYPE_LEARNING,   'learning'],
      [SM2.CARD_TYPE_REVIEW,     'review'],
      [SM2.CARD_TYPE_RELEARNING, 'relearning'],
    ]

    for (const [numericType, stringType] of cases) {
      it(`type ${numericType} maps to '${stringType}'`, async () => {
        mockedDb.state.cards = [makeRecord({ deckId: 'deck-1', type: numericType })]
        const result = await fetchDeckCards('deck-1')

        expect(result[0].type).toBe(stringType)
      })
    }

    it('out-of-range type defaults to "new"', async () => {
      mockedDb.state.cards = [makeRecord({ deckId: 'deck-1', type: 99 })]
      const result = await fetchDeckCards('deck-1')

      expect(result[0].type).toBe('new')
    })
  })

  describe('per-deck isolation: two decks with different algorithms', () => {
    it('deck-A (sm2) and deck-B (fsrs) return cards with correct algorithm', async () => {
      mockedDb.state.cards = [
        makeRecord({ id: 'c1', deckId: 'deck-A', algorithm: 'sm2',  factor: 2500 }),
        makeRecord({ id: 'c2', deckId: 'deck-B', algorithm: 'fsrs', difficulty: 4.5, factor: 2250 }),
      ]

      const deckA = await fetchDeckCards('deck-A')
      const deckB = await fetchDeckCards('deck-B')

      expect(deckA).toHaveLength(1)
      expect(deckA[0].algorithm).toBe('sm2')
      expect(deckA[0].sm2Ease).toBe(2.5)
      expect(deckA[0].fsrsDifficulty).toBeUndefined()

      expect(deckB).toHaveLength(1)
      expect(deckB[0].algorithm).toBe('fsrs')
      expect(deckB[0].fsrsDifficulty).toBe(4.5)
      expect(deckB[0].sm2Ease).toBeUndefined()
    })

    it('fetching deck-A does not include cards from deck-B', async () => {
      mockedDb.state.cards = [
        makeRecord({ id: 'a1', deckId: 'deck-A' }),
        makeRecord({ id: 'a2', deckId: 'deck-A' }),
        makeRecord({ id: 'b1', deckId: 'deck-B' }),
      ]

      const result = await fetchDeckCards('deck-A')
      expect(result).toHaveLength(2)
      result.forEach(c => expect(c.id).toMatch(/^a/))
    })
  })

  describe('scheduling fields are correctly passed through', () => {
    it('interval, reps, lapses are preserved', async () => {
      mockedDb.state.cards = [makeRecord({ deckId: 'deck-1', interval: 21, reps: 8, lapses: 2 })]
      const result = await fetchDeckCards('deck-1')

      expect(result[0].interval).toBe(21)
      expect(result[0].reps).toBe(8)
      expect(result[0].lapses).toBe(2)
    })

    it('stability and difficulty are passed through for FSRS cards', async () => {
      mockedDb.state.cards = [
        makeRecord({ deckId: 'deck-1', algorithm: 'fsrs', stability: 12.5, difficulty: 4.8 }),
      ]
      const result = await fetchDeckCards('deck-1')

      expect(result[0].stability).toBe(12.5)
      expect(result[0].difficulty).toBe(4.8)
    })

    it('empty deck returns empty array', async () => {
      mockedDb.state.cards = []
      const result = await fetchDeckCards('deck-empty')

      expect(result).toEqual([])
    })
  })
})
