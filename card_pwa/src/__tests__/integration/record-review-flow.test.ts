import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CardRecord, ReviewRecord } from '../../db'
import { createNewCard } from '../fixtures/cardFixtures'

const mockedRuntime = vi.hoisted(() => {
  const state = {
    card: null as CardRecord | null,
    reviews: [] as Array<ReviewRecord & { id: number }>,
    reviewId: 1,
  }

  const cards = {
    get: vi.fn(async (cardId: string) => {
      if (!state.card || state.card.id !== cardId) return undefined
      return { ...state.card }
    }),
    update: vi.fn(async (cardId: string, updates: Partial<CardRecord>) => {
      if (!state.card || state.card.id !== cardId) return 0
      state.card = { ...state.card, ...updates }
      return 1
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
  }

  const transaction = vi.fn(async (...args: unknown[]) => {
    const callback = args[args.length - 1] as () => Promise<void>
    await callback()
  })

  const enqueueSyncOperation = vi.fn(async () => undefined)

  return {
    state,
    db: { cards, reviews, transaction },
    enqueueSyncOperation,
  }
})

vi.mock('../../db', () => ({
  db: mockedRuntime.db,
}))

vi.mock('../../services/syncQueue', () => ({
  enqueueSyncOperation: mockedRuntime.enqueueSyncOperation,
}))

import { recordReview, undoReview } from '../../db/queries'

describe('recordReview integration flow', () => {
  beforeEach(() => {
    mockedRuntime.state.card = null
    mockedRuntime.state.reviews = []
    mockedRuntime.state.reviewId = 1
    mockedRuntime.db.cards.get.mockClear()
    mockedRuntime.db.cards.update.mockClear()
    mockedRuntime.db.reviews.add.mockClear()
    mockedRuntime.db.reviews.delete.mockClear()
    mockedRuntime.db.transaction.mockClear()
    mockedRuntime.enqueueSyncOperation.mockClear()
  })

  it('should switch algorithms mid-session through the real recordReview flow', async () => {
    const initialCard = createNewCard({
      id: 'card-switch-1',
      type: 2,
      queue: 2,
      due: Math.floor(Date.now() / 86_400_000),
      dueAt: Date.now(),
      interval: 3,
      factor: 2500,
      reps: 2,
      lapses: 0,
      algorithm: 'sm2',
      stability: undefined,
      difficulty: undefined,
    })
    mockedRuntime.state.card = initialCard

    const sm2Result = await recordReview(initialCard.id, 3, 4000, 'sm2')

    expect(sm2Result.ok).toBe(true)
    expect(mockedRuntime.state.card?.algorithm).toBe('sm2')
    expect(mockedRuntime.state.card?.factor).toBeGreaterThanOrEqual(1300)
    expect(mockedRuntime.state.card?.interval).toBeGreaterThanOrEqual(1)
    expect(mockedRuntime.state.reviews).toHaveLength(1)
    expect(mockedRuntime.enqueueSyncOperation).toHaveBeenNthCalledWith(
      1,
      'review',
      expect.objectContaining({ algorithm: 'sm2', cardId: initialCard.id })
    )

    const fsrsResult = await recordReview(initialCard.id, 3, 3500, 'fsrs')

    expect(fsrsResult.ok).toBe(true)
    expect(mockedRuntime.state.card?.algorithm).toBe('fsrs')
    expect(mockedRuntime.state.card?.stability).toBeDefined()
    expect(mockedRuntime.state.card?.difficulty).toBeDefined()
    expect(mockedRuntime.state.card?.factor).toBe(Math.round((mockedRuntime.state.card?.difficulty ?? 0) * 500))
    expect(mockedRuntime.state.card?.dueAt).toBeDefined()
    expect(mockedRuntime.state.reviews).toHaveLength(2)
    expect(mockedRuntime.enqueueSyncOperation).toHaveBeenNthCalledWith(
      2,
      'review',
      expect.objectContaining({ algorithm: 'fsrs', cardId: initialCard.id })
    )
  })

  it('should delete review row when undoReview is executed', async () => {
    const initialCard = createNewCard({
      id: 'card-undo-1',
      type: 2,
      queue: 2,
      due: Math.floor(Date.now() / 86_400_000),
      dueAt: Date.now(),
      interval: 2,
      factor: 2500,
      reps: 2,
      lapses: 0,
      algorithm: 'sm2',
    })
    mockedRuntime.state.card = initialCard

    const recorded = await recordReview(initialCard.id, 1, 1000, 'sm2')
    expect(recorded.ok).toBe(true)
    expect(recorded.undoToken).toBeDefined()
    expect(mockedRuntime.state.reviews).toHaveLength(1)

    const undone = await undoReview(recorded.undoToken!)
    expect(undone.ok).toBe(true)
    expect(mockedRuntime.db.reviews.delete).toHaveBeenCalledTimes(1)
    expect(mockedRuntime.state.reviews).toHaveLength(0)
  })
})
