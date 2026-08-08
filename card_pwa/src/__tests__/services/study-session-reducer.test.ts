/**
 * AI_CONTEXT: Vitest coverage for study session reducer; protects services behavior from regressions in the learning PWA.
 */
import { describe, expect, it } from 'vitest'
import { initialSessionState, sessionReducer } from '../../services/studySessionReducer'
import type { Card, CardSchedulingState } from '../../types'

function createCard(id: string): Card {
  return {
    id,
    noteId: `note-${id}`,
    type: 'review',
    front: `front-${id}`,
    back: `back-${id}`,
    extra: { acronym: '', examples: '', port: '', protocol: '' },
    tags: [],
    interval: 1,
    due: 0,
    reps: 1,
    lapses: 0,
    queue: 2,
  }
}

function scheduledState(card: Card, type: 0 | 1 | 2 | 3, overrides: Partial<CardSchedulingState> = {}): CardSchedulingState {
  return {
    type,
    queue: type === 2 ? 2 : type === 0 ? 0 : 1,
    due: card.due,
    dueAt: type === 1 || type === 3 ? Date.now() + 10 * 60_000 : card.dueAt,
    interval: type === 2 ? Math.max(1, card.interval) : 0,
    factor: 2500,
    stability: card.stability,
    difficulty: card.difficulty,
    reps: card.reps + 1,
    lapses: card.lapses,
    algorithm: card.algorithm ?? 'fsrs',
    ...overrides,
  }
}

describe('study session reducer', () => {
  it('requeues a single Again-rated card instead of ending the session', () => {
    const card = createCard('card-1')
    let state = sessionReducer(initialSessionState, { type: 'INIT', cards: [card] })

    state = sessionReducer(state, { type: 'RATE_START', rating: 1, elapsedMs: 900 })
    state = sessionReducer(state, {
      type: 'RATE_SUCCESS',
      rating: 1,
      cardId: card.id,
      forcedTomorrow: false,
      cardState: scheduledState(card, 3, { lapses: 1 }),
    })

    expect(state.cards.map(nextCard => nextCard.id)).toEqual([card.id])
    expect(state.isDone).toBe(false)
    expect(state.sessionCount).toBe(1)
    expect(state.againCounts[card.id]).toBe(1)
  })

  it('creates a fresh run id for init and restart while restore keeps its id', () => {
    const card = createCard('card-run-id')
    const initialized = sessionReducer(initialSessionState, { type: 'INIT', cards: [card] })
    expect(initialized.sessionRunId).toMatch(/^study-/)

    const restarted = sessionReducer(initialized, { type: 'RESTART' })
    expect(restarted.sessionRunId).toMatch(/^study-/)
    expect(restarted.sessionRunId).not.toBe(initialized.sessionRunId)
  })

  it('removes qa-blocked cards from initialization and resumed queues', () => {
    const allowed = createCard('allowed')
    const blocked = { ...createCard('blocked'), tags: ['qa-blocked'] }
    const initialized = sessionReducer(initialSessionState, {
      type: 'INIT',
      cards: [blocked, allowed],
      sessionRunId: 'run-filter-1',
    })
    expect(initialized.cards.map(card => card.id)).toEqual(['allowed'])

    const synced = sessionReducer(initialized, { type: 'SYNC_CARDS', cards: [blocked] })
    expect(synced.cards).toEqual([])
  })

  it('shows the next queued card after an Again and moves the failed card to the back', () => {
    const first = createCard('card-1')
    const second = createCard('card-2')
    let state = sessionReducer(initialSessionState, { type: 'INIT', cards: [first, second] })

    state = sessionReducer(state, { type: 'RATE_START', rating: 1, elapsedMs: 900 })
    state = sessionReducer(state, {
      type: 'RATE_SUCCESS',
      rating: 1,
      cardId: first.id,
      forcedTomorrow: false,
      cardState: scheduledState(first, 3, { lapses: 1 }),
    })

    expect(state.cards.map(nextCard => nextCard.id)).toEqual([second.id, first.id])
    expect(state.isDone).toBe(false)
  })

  it('can finish the session when the third Again forces the only card to tomorrow', () => {
    const card = createCard('card-1')
    let state = sessionReducer(initialSessionState, { type: 'INIT', cards: [card] })
    state = {
      ...state,
      againCounts: { [card.id]: 2 },
      lowRatingCounts: { [card.id]: 2 },
    }

    state = sessionReducer(state, { type: 'RATE_START', rating: 1, elapsedMs: 900 })
    state = sessionReducer(state, {
      type: 'RATE_SUCCESS',
      rating: 1,
      cardId: card.id,
      forcedTomorrow: true,
      // Realistischer Dispatch (Bugfix): forceCardReviewTomorrow liefert den
      // "morgen"-Zustand (type=review) statt des kurzfristigen Relearning-
      // Zustands aus dem vorangegangenen recordReview — sonst würde der
      // Reducer die Karte trotz forcedTomorrow noch einmal requeuen.
      cardState: scheduledState(card, 2, { due: 99, dueAt: 99 * 86_400_000, interval: 1 }),
    })

    expect(state.cards).toEqual([])
    expect(state.isDone).toBe(true)
    expect(state.forcedTomorrowCardIds).toEqual([card.id])
    expect(state.againCounts[card.id]).toBeUndefined()
  })

  it('would wrongly requeue the forced-tomorrow card if the stale relearning cardState were dispatched (regression guard)', () => {
    const card = createCard('card-1')
    let state = sessionReducer(initialSessionState, { type: 'INIT', cards: [card] })
    state = {
      ...state,
      againCounts: { [card.id]: 2 },
      lowRatingCounts: { [card.id]: 2 },
    }

    state = sessionReducer(state, { type: 'RATE_START', rating: 1, elapsedMs: 900 })
    state = sessionReducer(state, {
      type: 'RATE_SUCCESS',
      rating: 1,
      cardId: card.id,
      forcedTomorrow: true,
      // Der ALTE Bug: die Aufrufer hängten hier noch den kurzfristigen
      // Relearning-Zustand (fällig in ~10 Min) aus recordReview an, statt des
      // "morgen"-Zustands aus forceCardReviewTomorrow.
      cardState: scheduledState(card, 3, { lapses: 3 }),
    })

    // Dokumentiert die alte Fehlwirkung: ohne den korrekten cardState taucht
    // die Karte trotz "morgen erzwungen" noch einmal in der Session auf.
    expect(state.cards.map(nextCard => nextCard.id)).toEqual([card.id])
    expect(state.isDone).toBe(false)
  })

  it('records review events and keeps the rated card only as read-only snapshot', () => {
    const card = createCard('card-1')
    let state = sessionReducer(initialSessionState, { type: 'INIT', cards: [card] })

    state = sessionReducer(state, { type: 'RATE_START', rating: 3, elapsedMs: 1234 })
    state = sessionReducer(state, {
      type: 'RATE_SUCCESS',
      rating: 3,
      cardId: card.id,
      forcedTomorrow: false,
    })

    // Bewertung ist endgültig: Karte verlässt die Queue, sessionCount und
    // reviewEvents bleiben bestehen — lastRatedCard dient nur der Ansicht.
    expect(state.cards).toEqual([])
    expect(state.isDone).toBe(true)
    expect(state.sessionCount).toBe(1)
    expect(state.reviewEvents).toEqual([{ cardId: card.id, rating: 3, elapsedMs: 1234 }])
    expect(state.lastRatedCard?.id).toBe(card.id)
  })

  it('repeats a review Hard as session practice without changing its scheduled snapshot again', () => {
    const card = createCard('card-hard')
    let state = sessionReducer(initialSessionState, { type: 'INIT', cards: [card] })
    const longTermState = scheduledState(card, 2, { interval: 12, due: 42, dueAt: 42 * 86_400_000 })

    state = sessionReducer(state, { type: 'RATE_START', rating: 2, elapsedMs: 800 })
    state = sessionReducer(state, {
      type: 'RATE_SUCCESS',
      rating: 2,
      cardId: card.id,
      forcedTomorrow: false,
      cardState: longTermState,
    })

    expect(state.cards[0]?.interval).toBe(12)
    expect(state.hardPracticeCardIds).toEqual([card.id])

    state = sessionReducer(state, { type: 'RATE_START', rating: 2, elapsedMs: 700 })
    state = sessionReducer(state, {
      type: 'RATE_SUCCESS',
      rating: 2,
      cardId: card.id,
      forcedTomorrow: false,
      practiceOnly: true,
    })

    expect(state.cards[0]?.interval).toBe(12)
    expect(state.hardPracticeCardIds).toEqual([card.id])
  })

  it('finishes Hard practice after two consecutive Good ratings', () => {
    const card = createCard('card-hard')
    let state = sessionReducer(initialSessionState, { type: 'INIT', cards: [card] })
    state = {
      ...state,
      hardPracticeCardIds: [card.id],
      lowRatingCounts: { [card.id]: 1 },
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      state = sessionReducer(state, { type: 'RATE_START', rating: 3, elapsedMs: 600 })
      state = sessionReducer(state, {
        type: 'RATE_SUCCESS',
        rating: 3,
        cardId: card.id,
        forcedTomorrow: false,
        practiceOnly: true,
      })
    }

    expect(state.cards).toEqual([])
    expect(state.hardPracticeCardIds).toEqual([])
    expect(state.isDone).toBe(true)
  })

  it('uses the configured Good streak and optional Hard practice pass limit', () => {
    const card = createCard('card-hard-config')
    let state = sessionReducer(initialSessionState, { type: 'INIT', cards: [card] })
    state = sessionReducer(state, {
      type: 'RATE_SUCCESS', rating: 2, cardId: card.id, forcedTomorrow: false,
      hardPracticeEnabled: true, hardPracticeGoodStreak: 3,
      cardState: scheduledState(card, 2),
    })

    for (let pass = 0; pass < 2; pass += 1) {
      state = sessionReducer(state, {
        type: 'RATE_SUCCESS', rating: 3, cardId: card.id, forcedTomorrow: false,
        practiceOnly: true, hardPracticeGoodStreak: 3, hardPracticeMaxPasses: 2,
      })
    }

    expect(state.hardPracticeCardIds).toEqual([])
    expect(state.hardPracticePassCounts[card.id]).toBeUndefined()
    expect(state.isDone).toBe(true)
  })

  it('clears lastRatedCard on INIT and RESTART', () => {
    const card = createCard('card-1')
    let state = sessionReducer(initialSessionState, { type: 'INIT', cards: [card] })
    state = sessionReducer(state, { type: 'RATE_START', rating: 3, elapsedMs: 500 })
    state = sessionReducer(state, { type: 'RATE_SUCCESS', rating: 3, cardId: card.id, forcedTomorrow: false })
    expect(state.lastRatedCard).not.toBeNull()

    const restarted = sessionReducer(state, { type: 'RESTART' })
    expect(restarted.lastRatedCard).toBeNull()

    const reinitialized = sessionReducer(state, { type: 'INIT', cards: [card] })
    expect(reinitialized.lastRatedCard).toBeNull()
  })
})
