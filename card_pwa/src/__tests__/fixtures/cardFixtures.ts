import type { CardRecord } from '../../db'
import type { Card } from '../../types'

/**
 * Create a new card for testing
 */
export function createNewCard(overrides?: Partial<CardRecord>): CardRecord {
  const today = Math.floor(Date.now() / 86400000)
  const merged = {
    interval: 0,
    due: today,
    ...overrides,
  }

  if (overrides?.interval !== undefined && overrides?.due === undefined) {
    const normalizedInterval = Math.max(0, Math.round(overrides.interval))
    merged.due = today + normalizedInterval
  }

  return {
    id: `card_${Date.now()}`,
    noteId: `note_${Date.now()}`,
    deckId: `deck_${Date.now()}`,
    front: 'Test Question',
    back: 'Test Answer',
    tags: [],
    extra: {
      acronym: '',
      examples: '',
      port: '',
      protocol: '',
    },
    type: 0, // new
    queue: 0, // new queue
    factor: 2500, // SM2 ease
    stability: 1, // FSRS stability
    difficulty: 5, // FSRS difficulty (1-10)
    reps: 0,
    lapses: 0,
    createdAt: Date.now(),
    ...merged,
  }
}

/**
 * Create a Card (public type, string type field) for use in sortStudyCards and view-layer tests.
 */
export function makeCard(overrides: Partial<Card> & Pick<Card, 'type'>): Card {
  const nowMs = Date.now()
  const today = Math.floor(nowMs / 86_400_000)
  const base: Card = {
    id: `card_${Math.random().toString(36).slice(2)}`,
    noteId: `note_${Date.now()}`,
    type: 'new',
    front: 'Q',
    back: 'A',
    extra: { acronym: '', examples: '', port: '', protocol: '' },
    tags: [],
    interval: 0,
    due: today,
    dueAt: nowMs,
    reps: 0,
    lapses: 0,
    queue: 0,
    algorithm: 'sm2',
  }
  return { ...base, ...overrides }
}

/**
 * Create a learning CardRecord (type=1, reps=1, intraday dueAt)
 */
export function createLearningCard(overrides?: Partial<CardRecord>): CardRecord {
  return createNewCard({
    type: 1,
    queue: 1,
    reps: 1,
    interval: 0,
    dueAt: Date.now() + 10 * 60_000,
    ...overrides,
  })
}

/**
 * Create a relearning CardRecord (type=3, lapses>0, intraday dueAt)
 */
export function createRelearningCard(overrides?: Partial<CardRecord>): CardRecord {
  return createNewCard({
    type: 3,
    queue: 1,
    reps: 3,
    lapses: 1,
    interval: 0,
    dueAt: Date.now() + 10 * 60_000,
    ...overrides,
  })
}

/**
 * Create a card that has been reviewed
 */
export function createReviewedCard(options?: {
  reps?: number
  lapses?: number
  algorithm?: 'sm2' | 'fsrs'
  interval?: number
}): CardRecord {
  const reps = options?.reps ?? 5
  const lapses = options?.lapses ?? 1
  const algorithm = options?.algorithm ?? 'sm2'
  const interval = options?.interval ?? 30

  if (algorithm === 'sm2') {
    return createNewCard({
      type: 2, // review
      queue: 2,
      due: Math.floor(Date.now() / 86400000) + interval,
      interval,
      factor: 2800,
      reps,
      lapses,
    })
  } else {
    return createNewCard({
      type: 2, // review
      queue: 2,
      due: Math.floor(Date.now() / 86400000) + interval,
      interval,
      stability: 25,
      difficulty: 5,
      reps,
      lapses,
    })
  }
}

/**
 * Create a card for migration testing
 */
export function createMigrationCard(
  fromAlgo: 'sm2' | 'fsrs',
  toAlgo: 'sm2' | 'fsrs'
): CardRecord {
  if (fromAlgo === 'sm2' && toAlgo === 'fsrs') {
    // SM2 card ready for FSRS migration
    return createNewCard({
      type: 2,
      queue: 2,
      due: Math.floor(Date.now() / 86400000) + 20,
      interval: 20,
      factor: 2500,
      reps: 10,
      lapses: 2,
    })
  } else if (fromAlgo === 'fsrs' && toAlgo === 'sm2') {
    // FSRS card ready for SM2 fallback
    return createNewCard({
      type: 2,
      queue: 2,
      due: Math.floor(Date.now() / 86400000) + 20,
      interval: 20,
      stability: 20,
      difficulty: 6,
      factor: 3000, // backup value
      reps: 10,
      lapses: 2,
    })
  }

  return createNewCard()
}
