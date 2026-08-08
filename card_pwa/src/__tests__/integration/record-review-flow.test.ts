/**
 * AI_CONTEXT: Vitest coverage for record review flow; protects integration behavior from regressions in the learning PWA.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CardRecord, ReviewRecord } from '../../db'
import { createNewCard } from '../fixtures/cardFixtures'

const mockedRuntime = vi.hoisted(() => {
  const state = {
    card: null as CardRecord | null,
    reviews: [] as Array<ReviewRecord & { id: number }>,
    reviewId: 1,
    outbox: [] as Array<{ opId: string; type: string; payload: string; createdAt: number }>,
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

  const enqueueSyncOperation = vi.fn(async (_type: string, _payload: unknown, _opId?: string) => undefined)
  const syncOutbox = {
    put: vi.fn(async (item: { opId: string; type: string; payload: string; createdAt: number }) => {
      state.outbox = [...state.outbox.filter(existing => existing.opId !== item.opId), item]
    }),
  }
  const drainTransactionalOutbox = vi.fn(async () => {
    const pending = [...state.outbox]
    state.outbox = []
    for (const item of pending) {
      await enqueueSyncOperation(item.type, JSON.parse(item.payload), item.opId)
    }
    return pending.length
  })

  return {
    state,
    db: { cards, reviews, syncOutbox, transaction },
    enqueueSyncOperation,
    drainTransactionalOutbox,
  }
})

vi.mock('../../db', () => ({
  db: mockedRuntime.db,
}))

vi.mock('../../services/syncQueue', () => ({
  enqueueSyncOperation: mockedRuntime.enqueueSyncOperation,
  drainTransactionalOutbox: mockedRuntime.drainTransactionalOutbox,
}))

import { computeCanonicalReviewSuccessRate, forceCardReviewTomorrow, recordReview, undoReview } from '../../db/queries'

describe('recordReview integration flow', () => {
  beforeEach(() => {
    mockedRuntime.state.card = null
    mockedRuntime.state.reviews = []
    mockedRuntime.state.reviewId = 1
    mockedRuntime.state.outbox = []
    mockedRuntime.db.cards.get.mockClear()
    mockedRuntime.db.cards.update.mockClear()
    mockedRuntime.db.reviews.add.mockClear()
    mockedRuntime.db.reviews.delete.mockClear()
    mockedRuntime.db.transaction.mockClear()
    mockedRuntime.enqueueSyncOperation.mockClear()
    mockedRuntime.drainTransactionalOutbox.mockClear()
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
      expect.objectContaining({ algorithm: 'sm2', cardId: initialCard.id }),
      expect.any(String),
    )

    const fsrsResult = await recordReview(initialCard.id, 3, 3500, 'fsrs')

    expect(fsrsResult.ok).toBe(true)
    expect(fsrsResult.cardState).toMatchObject({
      algorithm: 'fsrs',
      type: mockedRuntime.state.card?.type,
      queue: mockedRuntime.state.card?.queue,
      dueAt: mockedRuntime.state.card?.dueAt,
      interval: mockedRuntime.state.card?.interval,
    })
    expect(mockedRuntime.state.card?.algorithm).toBe('fsrs')
    expect(mockedRuntime.state.card?.stability).toBeDefined()
    expect(mockedRuntime.state.card?.difficulty).toBeDefined()
    expect(mockedRuntime.state.card?.factor).toBe(Math.round((mockedRuntime.state.card?.difficulty ?? 0) * 500))
    expect(mockedRuntime.state.card?.dueAt).toBeDefined()
    expect(mockedRuntime.state.reviews).toHaveLength(2)
    expect(mockedRuntime.enqueueSyncOperation).toHaveBeenNthCalledWith(
      2,
      'review',
      expect.objectContaining({ algorithm: 'fsrs', cardId: initialCard.id }),
      expect.any(String),
    )
  })

  it('persistiert falsch gewählte Antworten mit cardId, Auswahl, Lösung und Status', async () => {
    const initialCard = createNewCard({
      id: 'card-wrong-answer-1',
      type: 0,
      queue: 0,
      due: Math.floor(Date.now() / 86_400_000),
      dueAt: Date.now(),
      algorithm: 'fsrs',
    })
    mockedRuntime.state.card = initialCard

    const result = await recordReview(initialCard.id, 1, 2500, 'fsrs', undefined, {
      selected: 'B: Federation',
      correct: 'C: Single Sign-On',
      wasCorrect: false,
    })

    expect(result.ok).toBe(true)
    expect(mockedRuntime.state.reviews).toHaveLength(1)
    expect(mockedRuntime.state.reviews[0]).toMatchObject({
      cardId: initialCard.id,
      rating: 1,
      selectedAnswer: 'B: Federation',
      correctAnswer: 'C: Single Sign-On',
      answerCorrect: false,
    })
    expect(mockedRuntime.state.reviews[0].timestamp).toBeGreaterThan(0)
    // Sync-Op trägt dieselben Antwortdetails — Offline-Queue und Server
    // bekommen exakt das, was lokal gespeichert wurde.
    expect(mockedRuntime.enqueueSyncOperation).toHaveBeenCalledWith(
      'review',
      expect.objectContaining({
        cardId: initialCard.id,
        answer: { selected: 'B: Federation', correct: 'C: Single Sign-On', wasCorrect: false },
      }),
      expect.any(String),
    )
  })

  it('speichert richtige Antworten nach demselben Prinzip und erweitert die Historie', async () => {
    const initialCard = createNewCard({
      id: 'card-correct-answer-1',
      type: 0,
      queue: 0,
      due: Math.floor(Date.now() / 86_400_000),
      dueAt: Date.now(),
      algorithm: 'fsrs',
    })
    mockedRuntime.state.card = initialCard

    const wrong = await recordReview(initialCard.id, 1, 2000, 'fsrs', undefined, {
      selected: 'A: TACACS+',
      correct: 'D: RADIUS',
      wasCorrect: false,
    })
    const right = await recordReview(initialCard.id, 3, 1500, 'fsrs', undefined, {
      selected: 'D: RADIUS',
      correct: 'D: RADIUS',
      wasCorrect: true,
    })

    expect(wrong.ok).toBe(true)
    expect(right.ok).toBe(true)
    // Mehrfache Antworten derselben Karte erweitern die Historie (append-only).
    expect(mockedRuntime.state.reviews).toHaveLength(2)
    expect(mockedRuntime.state.reviews.map(review => review.cardId)).toEqual([
      initialCard.id,
      initialCard.id,
    ])
    expect(mockedRuntime.state.reviews[0].answerCorrect).toBe(false)
    expect(mockedRuntime.state.reviews[1]).toMatchObject({
      selectedAnswer: 'D: RADIUS',
      correctAnswer: 'D: RADIUS',
      answerCorrect: true,
    })
  })

  it('bewertet aus dem Lernplan dieselbe echte Card.id über den normalen Scheduler', async () => {
    const canonicalCardId = '1781206500017'
    const initialCard = createNewCard({
      id: canonicalCardId,
      deckId: 'sy0-701-acronyms-bonus',
      type: 0,
      queue: 0,
      algorithm: 'fsrs',
    })
    mockedRuntime.state.card = initialCard

    const result = await recordReview(canonicalCardId, 4, 1300, 'fsrs', undefined, {
      selected: 'C: Zero Trust Network Access',
      correct: 'C: Zero Trust Network Access',
      wasCorrect: true,
    })

    expect(result.ok).toBe(true)
    expect(mockedRuntime.state.card?.id).toBe(canonicalCardId)
    expect(mockedRuntime.state.card?.deckId).toBe('sy0-701-acronyms-bonus')
    expect(mockedRuntime.state.card?.reps).toBe(1)
    expect(mockedRuntime.state.reviews[0].cardId).toBe(canonicalCardId)
    expect(computeCanonicalReviewSuccessRate(mockedRuntime.state.reviews)).toMatchObject({
      rate: 100,
      ratio: 1,
      total: 1,
    })
  })

  it('lässt Reviews ohne Antwortauswahl unverändert (keine Antwortfelder)', async () => {
    const initialCard = createNewCard({
      id: 'card-plain-1',
      type: 0,
      queue: 0,
      due: Math.floor(Date.now() / 86_400_000),
      dueAt: Date.now(),
      algorithm: 'fsrs',
    })
    mockedRuntime.state.card = initialCard

    const result = await recordReview(initialCard.id, 3, 1200, 'fsrs')

    expect(result.ok).toBe(true)
    expect(mockedRuntime.state.reviews[0].selectedAnswer).toBeUndefined()
    expect(mockedRuntime.state.reviews[0].correctAnswer).toBeUndefined()
    expect(mockedRuntime.state.reviews[0].answerCorrect).toBeUndefined()
    const payload = (mockedRuntime.enqueueSyncOperation.mock.calls[0] as unknown[])[1] as Record<string, unknown>
    expect('answer' in payload).toBe(false)
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

  it('commits card, review, and outbox even when queue draining fails afterwards', async () => {
    const initialCard = createNewCard({ id: 'card-outbox-1', algorithm: 'fsrs' })
    mockedRuntime.state.card = initialCard
    mockedRuntime.drainTransactionalOutbox.mockRejectedValueOnce(new Error('queue database unavailable'))

    const result = await recordReview(initialCard.id, 3, 900, 'fsrs')

    expect(result.ok).toBe(true)
    expect(mockedRuntime.state.reviews).toHaveLength(1)
    expect(mockedRuntime.state.card?.reps).toBe(1)
    expect(mockedRuntime.state.outbox).toHaveLength(1)
    expect(mockedRuntime.enqueueSyncOperation).not.toHaveBeenCalled()
  })

  it('forceCardReviewTomorrow liefert den "morgen"-Zustand als cardState zurück (Bugfix P2.3)', async () => {
    // Simuliert eine Karte, die gerade zum 3. Mal in Folge "Nochmal" bekommen
    // hat: recordReview hätte sie zuvor auf Relearning mit kurzer Fälligkeit
    // (~10 Min) gesetzt. forceCardReviewTomorrow überschreibt das auf "morgen"
    // und muss den DAFÜR passenden cardState zurückgeben — sonst requeued
    // StudyView/ShuffleStudyView die Karte trotzdem noch in derselben Sitzung.
    const initialCard = createNewCard({
      id: 'card-force-tomorrow-1',
      type: 3, // relearning
      queue: 1,
      due: Math.floor(Date.now() / 86_400_000),
      dueAt: Date.now() + 10 * 60_000,
      interval: 0,
      factor: 2500,
      reps: 4,
      lapses: 3,
      algorithm: 'fsrs',
      stability: 0.8,
      difficulty: 7,
    })
    mockedRuntime.state.card = initialCard

    const result = await forceCardReviewTomorrow(initialCard.id)

    expect(result.ok).toBe(true)
    // type=2 ist der numerische CardRecord-Wert für "review" (SM2.CARD_TYPE_REVIEW).
    expect(result.cardState).toMatchObject({ type: 2, queue: 2, learningStep: 0 })
    // "Morgen" als Epochentag (zeitzonenunabhängig, wie forceCardReviewTomorrow selbst rechnet).
    expect(result.cardState?.due).toBe(Math.floor(Date.now() / 86_400_000) + 1)
    expect(result.cardState?.dueAt).toBeGreaterThan(Date.now()) // nie sofort wieder fällig
    expect(result.cardState?.lapses).toBe(3) // bleibt als Beleg des Lapse-Verlaufs erhalten
    // Persistierte Karte und zurückgegebener cardState müssen übereinstimmen —
    // sonst driftet der Session-State vom echten DB-Zustand ab.
    expect(mockedRuntime.state.card?.type).toBe(result.cardState?.type)
    expect(mockedRuntime.state.card?.dueAt).toBe(result.cardState?.dueAt)
  })
})
