import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Card } from '../../types'

const mockedRuntime = vi.hoisted(() => ({
  fetchDeckCards: vi.fn(async (_deckId: string): Promise<Card[]> => []),
  getSyncedDeckIds: vi.fn(async (_userId?: string): Promise<string[]> => []),
}))

vi.mock('../../db/queries', () => ({
  fetchDeckCards: mockedRuntime.fetchDeckCards,
}))

vi.mock('../../services/syncedDeckScope', () => ({
  getSyncedDeckIds: mockedRuntime.getSyncedDeckIds,
}))

import {
  buildSelectedShuffleCards,
  buildShufflePool,
  getShuffleWeight,
  selectShuffleCards,
  type ShuffleStudyCard,
} from '../../services/ShuffleSessionManager'

function createCard(overrides: Partial<ShuffleStudyCard>): ShuffleStudyCard {
  const nowDay = Math.floor(Date.now() / 86_400_000)
  return {
    id: overrides.id ?? `card-${Math.random()}`,
    noteId: overrides.noteId ?? `note-${Math.random()}`,
    deckId: overrides.deckId ?? 'deck-a',
    type: overrides.type ?? 'new',
    front: overrides.front ?? 'Q',
    back: overrides.back ?? 'A',
    extra: overrides.extra ?? { acronym: '', examples: '', port: '', protocol: '' },
    tags: overrides.tags ?? [],
    interval: overrides.interval ?? 0,
    due: overrides.due ?? nowDay,
    dueAt: overrides.dueAt,
    reps: overrides.reps ?? 0,
    lapses: overrides.lapses ?? 0,
    queue: overrides.queue ?? 0,
    stability: overrides.stability,
    difficulty: overrides.difficulty,
    algorithm: overrides.algorithm,
  }
}

describe('ShuffleSessionManager', () => {
  beforeEach(() => {
    mockedRuntime.fetchDeckCards.mockReset()
    mockedRuntime.fetchDeckCards.mockImplementation(async (): Promise<Card[]> => [])
    mockedRuntime.getSyncedDeckIds.mockReset()
    mockedRuntime.getSyncedDeckIds.mockResolvedValue([])
  })

  it('builds a shuffle pool from the synced deck intersection and deduplicates by card id', async () => {
    mockedRuntime.getSyncedDeckIds.mockResolvedValue(['deck-a', 'deck-c'])
    mockedRuntime.fetchDeckCards.mockImplementation(async (deckId: string): Promise<Card[]> => {
      if (deckId === 'deck-a') {
        return [
          createCard({ id: 'card-1', deckId }),
          createCard({ id: 'shared-card', deckId }),
        ]
      }
      if (deckId === 'deck-c') {
        return [
          createCard({ id: 'card-3', deckId }),
          createCard({ id: 'shared-card', deckId }),
        ]
      }
      return [createCard({ id: 'should-not-load', deckId })]
    })

    const result = await buildShufflePool(
      { deckIds: ['deck-a', 'deck-b', 'deck-c'] },
      { userId: 'user-1' },
    )

    expect(mockedRuntime.getSyncedDeckIds).toHaveBeenCalledWith('user-1')
    expect(mockedRuntime.fetchDeckCards).toHaveBeenCalledTimes(2)
    expect(result.map(card => card.id)).toEqual(['card-1', 'shared-card', 'card-3'])
    expect(result.map(card => card.deckId)).toEqual(['deck-a', 'deck-a', 'deck-c'])
  })

  it('returns an empty pool when no collection decks are in scope', async () => {
    mockedRuntime.getSyncedDeckIds.mockResolvedValue(['deck-z'])

    await expect(
      buildShufflePool({ deckIds: ['deck-a', 'deck-b'] }, { userId: 'user-1' }),
    ).resolves.toEqual([])

    expect(mockedRuntime.fetchDeckCards).not.toHaveBeenCalled()
  })

  it('increases shuffle weight for more overdue cards and caps the overdue boost after 14 days', () => {
    const nowMs = Date.UTC(2026, 3, 23, 12, 0, 0)
    const baseCard = createCard({
      type: 'review',
      dueAt: nowMs - 2 * 86_400_000,
      reps: 10,
      lapses: 1,
    })
    const olderCard = createCard({
      ...baseCard,
      id: 'older',
      dueAt: nowMs - 10 * 86_400_000,
    })
    const cappedCard = createCard({
      ...baseCard,
      id: 'capped',
      dueAt: nowMs - 40 * 86_400_000,
    })

    const baseWeight = getShuffleWeight(baseCard, nowMs)
    const olderWeight = getShuffleWeight(olderCard, nowMs)
    const cappedWeight = getShuffleWeight(cappedCard, nowMs)

    expect(olderWeight).toBeGreaterThan(baseWeight)
    expect(cappedWeight).toBeCloseTo(getShuffleWeight({ ...cappedCard, dueAt: nowMs - 14 * 86_400_000 }, nowMs))
  })

  it('reuses the existing study-card limit semantics for selection', () => {
    const nowMs = Date.UTC(2026, 3, 23, 12, 0, 0)
    const cards = [
      createCard({ id: 'learning-a', deckId: 'deck-a', type: 'learning', dueAt: nowMs + 5 * 60_000 }),
      createCard({ id: 'review-a', deckId: 'deck-a', type: 'review', dueAt: nowMs - 60_000, reps: 3, lapses: 1 }),
      createCard({ id: 'new-b', deckId: 'deck-b', type: 'new' }),
      createCard({ id: 'new-c', deckId: 'deck-c', type: 'new' }),
    ]

    const result = selectShuffleCards(cards, { maxCards: 1, nowMs })

    expect(result.map(card => card.id)).toEqual(['review-a', 'learning-a'])
  })

  it('interleaves decks for broader mixes when four or more decks are present', () => {
    const cards = [
      createCard({ id: 'a1', deckId: 'deck-a', type: 'new' }),
      createCard({ id: 'a2', deckId: 'deck-a', type: 'new' }),
      createCard({ id: 'b1', deckId: 'deck-b', type: 'new' }),
      createCard({ id: 'c1', deckId: 'deck-c', type: 'new' }),
      createCard({ id: 'd1', deckId: 'deck-d', type: 'new' }),
    ]

    const result = selectShuffleCards(cards)

    expect(result.map(card => card.id)).toEqual(['a1', 'b1', 'c1', 'd1', 'a2'])
  })

  it('builds and selects cards through the combined helper', async () => {
    mockedRuntime.getSyncedDeckIds.mockResolvedValue(['deck-a'])
    mockedRuntime.fetchDeckCards.mockResolvedValue([
      createCard({ id: 'review-a', deckId: 'deck-a', type: 'review', dueAt: Date.now() - 1 }),
      createCard({ id: 'new-a', deckId: 'deck-a', type: 'new' }),
    ])

    const result = await buildSelectedShuffleCards(
      { deckIds: ['deck-a', 'deck-b'] },
      { userId: 'user-1', maxCards: 1 },
    )

    expect(result.map(card => card.id)).toEqual(['review-a'])
  })
})
