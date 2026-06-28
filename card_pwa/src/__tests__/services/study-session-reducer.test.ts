/**
 * AI_CONTEXT: Vitest coverage for study session reducer; protects services behavior from regressions in the learning PWA.
 */
import { describe, expect, it } from 'vitest'
import { initialSessionState, sessionReducer } from '../../services/studySessionReducer'
import type { Card, ReviewUndoToken } from '../../types'

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

function undoToken(cardId: string): ReviewUndoToken {
  return {
    cardId,
    reviewId: 1,
    previous: {
      type: 2,
      queue: 2,
      due: 0,
      dueAt: 0,
      interval: 1,
      factor: 2500,
      reps: 1,
      lapses: 0,
      algorithm: 'sm2',
    },
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
      undoToken: undoToken(card.id),
      forcedTomorrow: false,
    })

    expect(state.cards.map(nextCard => nextCard.id)).toEqual([card.id])
    expect(state.isDone).toBe(false)
    expect(state.sessionCount).toBe(1)
    expect(state.againCounts[card.id]).toBe(1)
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
      undoToken: undoToken(first.id),
      forcedTomorrow: false,
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
      undoToken: undoToken(card.id),
      forcedTomorrow: true,
    })

    expect(state.cards).toEqual([])
    expect(state.isDone).toBe(true)
    expect(state.forcedTomorrowCardIds).toEqual([card.id])
    expect(state.againCounts[card.id]).toBeUndefined()
  })

  it('records review events and restores them on undo', () => {
    const card = createCard('card-1')
    let state = sessionReducer(initialSessionState, { type: 'INIT', cards: [card] })

    state = sessionReducer(state, { type: 'RATE_START', rating: 3, elapsedMs: 1234 })
    state = sessionReducer(state, {
      type: 'RATE_SUCCESS',
      rating: 3,
      cardId: card.id,
      undoToken: undoToken(card.id),
      forcedTomorrow: false,
    })

    expect(state.cards).toEqual([])
    expect(state.sessionCount).toBe(1)
    expect(state.reviewEvents).toEqual([{ cardId: card.id, rating: 3, elapsedMs: 1234 }])

    state = sessionReducer(state, { type: 'UNDO_START' })
    state = sessionReducer(state, { type: 'UNDO_SUCCESS' })

    expect(state.cards.map(restoredCard => restoredCard.id)).toEqual([card.id])
    expect(state.sessionCount).toBe(0)
    expect(state.reviewEvents).toEqual([])
  })
})
