/**
 * AI_CONTEXT: Vitest coverage for reset learning progress; protects db behavior from regressions in the learning PWA.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CardRecord } from '../../db'
import { SM2 } from '../../utils/sm2'

/**
 * resetLearningProgress muss (a) alle nicht-gelöschten Karten auf „neu“
 * zurücksetzen, (b) Review-Historie/Metrik-Tabellen leeren und (c) eine
 * progress.reset-Sync-Operation enqueuen — ein card.update mit reps=0 würde
 * an der „höhere-reps-gewinnen“-Regel (Server + Pull) scheitern.
 */

const mockedRuntime = vi.hoisted(() => {
  const state = {
    cards: [] as CardRecord[],
    reviewsCleared: 0,
    cardStatsCleared: 0,
    deckProgressCleared: 0,
    activeSessionsCleared: 0,
  }

  const cards = {
    toArray: vi.fn(async () => state.cards),
    bulkPut: vi.fn(async (records: CardRecord[]) => {
      for (const record of records) {
        const index = state.cards.findIndex(card => card.id === record.id)
        if (index === -1) state.cards.push(record)
        else state.cards[index] = record
      }
    }),
  }

  const db = {
    cards,
    reviews: { clear: vi.fn(async () => { state.reviewsCleared += 1 }) },
    cardStats: { clear: vi.fn(async () => { state.cardStatsCleared += 1 }) },
    deckProgress: { clear: vi.fn(async () => { state.deckProgressCleared += 1 }) },
    activeSessions: { clear: vi.fn(async () => { state.activeSessionsCleared += 1 }) },
    transaction: vi.fn(async (..._args: unknown[]) => {
      const fn = _args[_args.length - 1] as () => Promise<void>
      await fn()
    }),
  }

  const enqueueSyncOperation = vi.fn(async () => undefined)

  return { state, db, enqueueSyncOperation }
})

vi.mock('../../db', () => ({
  db: mockedRuntime.db,
}))

vi.mock('../../services/syncQueue', () => ({
  enqueueSyncOperation: mockedRuntime.enqueueSyncOperation,
}))

vi.mock('../../services/syncConfig', () => ({
  buildOpId: () => 'op-test',
}))

vi.mock('../../utils/workers/statsWorkerClient', () => ({
  runStatsForecast: vi.fn(async () => ({})),
}))

import { resetLearningProgress } from '../../db/queries/reviews'
import { buildResetCardRecord } from '../../utils/sm2'

function buildCard(overrides: Partial<CardRecord> = {}): CardRecord {
  return {
    id: 'c1',
    noteId: 'n1',
    deckId: 'd1',
    front: 'Q',
    back: 'A',
    tags: [],
    extra: { acronym: '', examples: '', port: '', protocol: '' },
    type: SM2.CARD_TYPE_REVIEW,
    queue: SM2.QUEUE_REVIEW,
    due: 20_600,
    dueAt: 20_600 * 86_400_000,
    interval: 12,
    factor: 2_700,
    stability: 8.4,
    difficulty: 5.2,
    reps: 9,
    lapses: 2,
    createdAt: 1_000,
    updatedAt: 2_000,
    algorithm: 'fsrs',
    ...overrides,
  }
}

describe('resetLearningProgress', () => {
  beforeEach(() => {
    mockedRuntime.state.cards = []
    mockedRuntime.state.reviewsCleared = 0
    mockedRuntime.state.cardStatsCleared = 0
    mockedRuntime.state.deckProgressCleared = 0
    mockedRuntime.state.activeSessionsCleared = 0
    vi.clearAllMocks()
  })

  it('setzt alle aktiven Karten auf „neu“ und nullt die Scheduling-Historie', async () => {
    mockedRuntime.state.cards = [
      buildCard({ id: 'c1' }),
      buildCard({ id: 'c2', algorithm: 'sm2', stability: undefined, difficulty: undefined }),
    ]

    const result = await resetLearningProgress()

    expect(result.ok).toBe(true)
    expect(result.cards).toBe(2)
    for (const card of mockedRuntime.state.cards) {
      expect(card.type).toBe(SM2.CARD_TYPE_NEW)
      expect(card.queue).toBe(SM2.QUEUE_NEW)
      expect(card.interval).toBe(0)
      expect(card.factor).toBe(2500)
      expect(card.reps).toBe(0)
      expect(card.lapses).toBe(0)
      expect(card.stability).toBeUndefined()
      expect(card.difficulty).toBeUndefined()
      expect(card.due).toBe(Math.floor(Date.now() / 86_400_000))
    }
    expect(mockedRuntime.state.reviewsCleared).toBe(1)
    expect(mockedRuntime.state.cardStatsCleared).toBe(1)
    expect(mockedRuntime.state.deckProgressCleared).toBe(1)
    expect(mockedRuntime.state.activeSessionsCleared).toBe(1)
  })

  it('bewahrt die kanonische Card-ID und Deckzuordnung für Lernplan-Mappings', async () => {
    const cardId = '1781206500017'
    mockedRuntime.state.cards = [
      buildCard({ id: cardId, deckId: 'sy0-701-acronyms-bonus' }),
    ]

    await resetLearningProgress()

    expect(mockedRuntime.state.cards[0].id).toBe(cardId)
    expect(mockedRuntime.state.cards[0].deckId).toBe('sy0-701-acronyms-bonus')
    expect(mockedRuntime.state.cards[0].reps).toBe(0)
  })

  it('lässt gelöschte Karten (Tombstones) unangetastet', async () => {
    mockedRuntime.state.cards = [
      buildCard({ id: 'c1' }),
      buildCard({ id: 'c2', isDeleted: true, reps: 4, updatedAt: 5_000 }),
    ]

    const result = await resetLearningProgress()

    expect(result.cards).toBe(1)
    const tombstone = mockedRuntime.state.cards.find(card => card.id === 'c2')
    expect(tombstone?.reps).toBe(4)
    expect(tombstone?.updatedAt).toBe(5_000)
  })

  it('enqueued eine progress.reset-Operation mit Zeitstempel und Fälligkeit', async () => {
    mockedRuntime.state.cards = [buildCard()]

    await resetLearningProgress()

    expect(mockedRuntime.enqueueSyncOperation).toHaveBeenCalledTimes(1)
    const [type, payload] = mockedRuntime.enqueueSyncOperation.mock.calls[0] as unknown as [string, { timestamp: number; due: number; dueAt: number }]
    expect(type).toBe('progress.reset')
    expect(payload.timestamp).toBeGreaterThan(0)
    expect(payload.due).toBe(Math.floor(payload.timestamp / 86_400_000))
    expect(payload.dueAt).toBe(payload.due * 86_400_000)
  })
})

describe('buildResetCardRecord', () => {
  it('behält Identität/Inhalt und entfernt FSRS-Metriken', () => {
    const card = buildCard()
    const reset = buildResetCardRecord(card, { timestamp: 9_000, dueDay: 100, dueAt: 100 * 86_400_000 })

    expect(reset.id).toBe(card.id)
    expect(reset.front).toBe(card.front)
    expect(reset.deckId).toBe(card.deckId)
    expect(reset.updatedAt).toBe(9_000)
    expect(reset.due).toBe(100)
    expect(reset.dueAt).toBe(100 * 86_400_000)
    expect('stability' in reset).toBe(false)
    expect('difficulty' in reset).toBe(false)
  })
})
