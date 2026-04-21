import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  shouldSmoothBacklog,
  targetDayForIndex,
  applyDayFuzz,
  computeNewDueDay,
  BACKLOG_TRIGGER_MULTIPLIER,
  BACKLOG_SPREAD_DAYS,
  BACKLOG_FUZZ_FACTOR,
} from '../../utils/backlogSmoother'
import { smoothBacklog } from '../../db/queries'
import type { CardRecord } from '../../db'
import { SM2 } from '../../utils/sm2'

// ─── DB Mock ─────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000

const mockedDb = vi.hoisted(() => {
  const state = { cards: [] as CardRecord[] }
  const updatedCards = new Map<string, Partial<CardRecord>>()

  const cardsMock = {
    filter: vi.fn((predicate: (c: CardRecord) => boolean) => ({
      toArray: async () => state.cards.filter(predicate),
    })),
    update: vi.fn(async (id: string, fields: Partial<CardRecord>) => {
      updatedCards.set(id, { ...(updatedCards.get(id) ?? {}), ...fields })
    }),
  }

  const transactionMock = vi.fn(
    async (_mode: string, _tables: unknown, fn: () => Promise<void>) => fn(),
  )

  return { state, updatedCards, cards: cardsMock, transaction: transactionMock }
})

const mockedSyncQueue = vi.hoisted(() => ({
  enqueueSyncOperation: vi.fn(async () => {}),
}))

vi.mock('../../db', () => ({
  db: {
    cards: mockedDb.cards,
    transaction: mockedDb.transaction,
  },
}))

vi.mock('../../services/syncQueue', () => ({
  enqueueSyncOperation: mockedSyncQueue.enqueueSyncOperation,
}))

// Mock emitReviewUpdatedEvent (window.dispatchEvent) harmlessly
vi.stubGlobal('window', { dispatchEvent: vi.fn() })

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCard(partial: Partial<CardRecord>): CardRecord {
  const now = Date.now()
  const todayDays = Math.floor(now / DAY_MS)
  return {
    id: partial.id ?? `card-${Math.random().toString(36).slice(2, 8)}`,
    noteId: 'note-1',
    deckId: 'deck-1',
    front: 'Q',
    back: 'A',
    tags: [],
    extra: { acronym: '', examples: '', port: '', protocol: '' },
    type: SM2.CARD_TYPE_REVIEW,
    queue: SM2.QUEUE_REVIEW,
    due: partial.due ?? todayDays - 1,
    dueAt: partial.dueAt,
    interval: partial.interval ?? 1,
    factor: partial.factor ?? 2500,
    stability: partial.stability,
    difficulty: partial.difficulty,
    reps: partial.reps ?? 5,
    lapses: partial.lapses ?? 0,
    createdAt: now - 30 * DAY_MS,
    updatedAt: now,
    algorithm: 'fsrs',
    isDeleted: partial.isDeleted ?? false,
  }
}

// ─── Pure helper tests ────────────────────────────────────────────────────────

describe('shouldSmoothBacklog', () => {
  it('returns false when overdue <= 3×N', () => {
    expect(shouldSmoothBacklog(150, 50)).toBe(false)
    expect(shouldSmoothBacklog(149, 50)).toBe(false)
    expect(shouldSmoothBacklog(0, 50)).toBe(false)
  })

  it('returns true when overdue > 3×N', () => {
    expect(shouldSmoothBacklog(151, 50)).toBe(true)
    expect(shouldSmoothBacklog(200, 50)).toBe(true)
    expect(shouldSmoothBacklog(BACKLOG_TRIGGER_MULTIPLIER * 10 + 1, 10)).toBe(true)
  })
})

describe('targetDayForIndex', () => {
  it('index 0 maps to spreadDays (furthest out)', () => {
    expect(targetDayForIndex(0, 100)).toBe(BACKLOG_SPREAD_DAYS)
  })

  it('last index maps to day 1 (near future)', () => {
    const result = targetDayForIndex(99, 100)
    expect(result).toBeGreaterThanOrEqual(1)
    expect(result).toBeLessThanOrEqual(2) // floor arithmetic near end
  })

  it('is monotonically non-increasing for increasing indices', () => {
    const days = Array.from({ length: 50 }, (_, i) => targetDayForIndex(i, 50))
    for (let i = 1; i < days.length; i++) {
      expect(days[i]).toBeLessThanOrEqual(days[i - 1])
    }
  })

  it('handles edge case total=0', () => {
    expect(targetDayForIndex(0, 0)).toBe(1)
  })
})

describe('applyDayFuzz', () => {
  it('with rng=0 applies negative max fuzz', () => {
    // rng()=0 → fuzz = 0*2*0.05 - 0.05 = -0.05
    const result = applyDayFuzz(10, BACKLOG_FUZZ_FACTOR, () => 0)
    expect(result).toBe(Math.max(1, 10 + Math.round(10 * -0.05)))
  })

  it('with rng=1 applies positive max fuzz', () => {
    // rng()=1 → fuzz = 1*2*0.05 - 0.05 = +0.05
    const result = applyDayFuzz(10, BACKLOG_FUZZ_FACTOR, () => 1)
    expect(result).toBe(Math.max(1, 10 + Math.round(10 * 0.05)))
  })

  it('result is always >= 1', () => {
    expect(applyDayFuzz(1, 0.05, () => 0)).toBeGreaterThanOrEqual(1)
  })

  it('stays within ±5% bounds for various day values', () => {
    // Deterministic rng in [0,1)
    for (const rngVal of [0, 0.25, 0.5, 0.75, 0.99]) {
      for (const targetDay of [1, 5, 10, 14]) {
        const result = applyDayFuzz(targetDay, BACKLOG_FUZZ_FACTOR, () => rngVal)
        const maxDeviation = Math.round(targetDay * BACKLOG_FUZZ_FACTOR) + 1 // +1 for rounding tolerance
        expect(result).toBeGreaterThanOrEqual(targetDay - maxDeviation)
        expect(result).toBeLessThanOrEqual(targetDay + maxDeviation)
      }
    }
  })
})

describe('computeNewDueDay', () => {
  it('returns a day strictly in the future (> todayDays)', () => {
    const today = 20000
    const result = computeNewDueDay(5, 100, today, BACKLOG_SPREAD_DAYS, BACKLOG_FUZZ_FACTOR, () => 0.5)
    expect(result).toBeGreaterThan(today)
  })

  it('is deterministic with a fixed rng', () => {
    const today = 20000
    const rng = () => 0.3
    const a = computeNewDueDay(0, 50, today, BACKLOG_SPREAD_DAYS, BACKLOG_FUZZ_FACTOR, rng)
    const b = computeNewDueDay(0, 50, today, BACKLOG_SPREAD_DAYS, BACKLOG_FUZZ_FACTOR, rng)
    expect(a).toBe(b)
  })
})

// ─── smoothBacklog integration ────────────────────────────────────────────────

describe('smoothBacklog', () => {
  const SESSION_LIMIT = 10
  // today in epoch days
  const todayMs = Date.UTC(2026, 3, 11, 12, 0, 0) // 2026-04-11
  const todayDays = Math.floor(todayMs / DAY_MS)

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(todayMs)
    mockedDb.state.cards = []
    mockedDb.updatedCards.clear()
    mockedDb.cards.filter.mockClear()
    mockedDb.cards.update.mockClear()
    mockedDb.transaction.mockClear()
    mockedSyncQueue.enqueueSyncOperation.mockClear()
  })

  it('does not trigger when overdue <= 3×N', async () => {
    // 3 × 10 = 30 → need exactly 30 overdue cards → no trigger
    mockedDb.state.cards = Array.from({ length: 30 }, (_, i) =>
      makeCard({ id: `c${i}`, due: todayDays - 1 }),
    )
    const result = await smoothBacklog(SESSION_LIMIT)
    expect(result.triggered).toBe(false)
    expect(result.distributed).toBe(0)
    expect(mockedDb.transaction).not.toHaveBeenCalled()
  })

  it('triggers when overdue > 3×N and distributes excess cards', async () => {
    // 31 overdue cards > 30 → trigger; keep 10 for today, distribute 21
    mockedDb.state.cards = Array.from({ length: 31 }, (_, i) =>
      makeCard({ id: `c${i}`, due: todayDays - 1, stability: i + 1 }),
    )
    const rng = () => 0.5 // deterministic
    const result = await smoothBacklog(SESSION_LIMIT, rng)
    expect(result.triggered).toBe(true)
    expect(result.distributed).toBe(21)
    expect(mockedDb.cards.update).toHaveBeenCalledTimes(21)
    expect(mockedSyncQueue.enqueueSyncOperation).toHaveBeenCalledTimes(21)
    expect(mockedSyncQueue.enqueueSyncOperation).toHaveBeenCalledWith(
      'card.update',
      expect.objectContaining({
        cardId: expect.any(String),
        updates: expect.objectContaining({ due: expect.any(Number), dueAt: expect.any(Number) }),
        timestamp: expect.any(Number),
      }),
    )
  })

  it('all distributed cards receive a due day strictly in the future', async () => {
    mockedDb.state.cards = Array.from({ length: 40 }, (_, i) =>
      makeCard({ id: `c${i}`, due: todayDays - 1, stability: i + 1 }),
    )
    const rng = () => 0.5
    await smoothBacklog(SESSION_LIMIT, rng)

    const updateCalls = mockedDb.cards.update.mock.calls as [string, Partial<CardRecord>][]
    for (const [, fields] of updateCalls) {
      expect((fields.due as number)).toBeGreaterThan(todayDays)
    }
  })

  it('does not touch deleted cards', async () => {
    mockedDb.state.cards = [
      ...Array.from({ length: 31 }, (_, i) => makeCard({ id: `ok${i}`, due: todayDays - 1 })),
      makeCard({ id: 'deleted', due: todayDays - 5, isDeleted: true }),
    ]
    const result = await smoothBacklog(SESSION_LIMIT)
    expect(result.triggered).toBe(true)
    const updatedIds = mockedDb.cards.update.mock.calls.map(c => c[0] as string)
    expect(updatedIds).not.toContain('deleted')
  })

  it('does not touch non-review cards (new/learning)', async () => {
    const overdue = Array.from({ length: 31 }, (_, i) =>
      makeCard({ id: `r${i}`, due: todayDays - 1, type: SM2.CARD_TYPE_REVIEW }),
    )
    const newCard = makeCard({ id: 'new1', type: SM2.CARD_TYPE_NEW, due: todayDays - 1 })
    mockedDb.state.cards = [...overdue, newCard]

    await smoothBacklog(SESSION_LIMIT)
    const updatedIds = mockedDb.cards.update.mock.calls.map(c => c[0] as string)
    expect(updatedIds).not.toContain('new1')
  })

  it('uses custom nextDayStartsAt when determining whether cards are overdue', async () => {
    vi.setSystemTime(new Date('2026-04-11T02:00:00.000Z'))

    mockedDb.state.cards = [
      ...Array.from({ length: 31 }, (_, i) =>
        makeCard({
          id: `before-boundary-${i}`,
          dueAt: Date.UTC(2026, 3, 10, 1, 0, 0),
        }),
      ),
      ...Array.from({ length: 31 }, (_, i) =>
        makeCard({
          id: `after-boundary-${i}`,
          dueAt: Date.UTC(2026, 3, 10, 6, 0, 0),
        }),
      ),
    ]

    const result = await smoothBacklog(SESSION_LIMIT, () => 0.5, 4)
    const updatedIds = mockedDb.cards.update.mock.calls.map(c => c[0] as string)

    expect(result.triggered).toBe(true)
    expect(updatedIds).toHaveLength(21)
    expect(updatedIds.every(id => id.startsWith('before-boundary-'))).toBe(true)
  })
})
