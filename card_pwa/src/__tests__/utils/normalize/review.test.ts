/**
 * AI_CONTEXT: Vitest coverage for review normalization; protects utils behavior
 * from regressions in the learning PWA.
 */
import { describe, expect, it } from 'vitest'
import { normalizeReview } from '../../../utils/normalize/review'

describe('normalizeReview', () => {
  it('normalizes a plain review without answer details', () => {
    const normalized = normalizeReview({
      opId: 'op-1',
      cardId: 'card-1',
      rating: 3,
      timeMs: 1200,
      timestamp: 1000,
    })

    expect(normalized).toMatchObject({ cardId: 'card-1', rating: 3, timeMs: 1200, timestamp: 1000 })
    expect(normalized?.selectedAnswer).toBeUndefined()
    expect(normalized?.correctAnswer).toBeUndefined()
    expect(normalized?.answerCorrect).toBeUndefined()
  })

  it('accepts nested answer details (snapshot/sync-op form)', () => {
    const normalized = normalizeReview({
      cardId: 'card-1',
      rating: 1,
      timeMs: 2500,
      timestamp: 1500,
      answer: { selected: 'B: Federation', correct: 'C: Single Sign-On', wasCorrect: false },
    })

    expect(normalized).toMatchObject({
      cardId: 'card-1',
      rating: 1,
      selectedAnswer: 'B: Federation',
      correctAnswer: 'C: Single Sign-On',
      answerCorrect: false,
    })
  })

  it('accepts flat answer fields (bootstrap/Dexie form) including snake_case', () => {
    const normalized = normalizeReview({
      card_id: 'card-2',
      rating: 3,
      time_ms: 900,
      reviewed_at: 2000,
      session_run_id: 'run-snake-1',
      selected_answer: 'D: RADIUS',
      correct_answer: 'D: RADIUS',
      answerCorrect: true,
      sessionRunId: 'run-snake-1',
    })

    expect(normalized).toMatchObject({
      cardId: 'card-2',
      selectedAnswer: 'D: RADIUS',
      correctAnswer: 'D: RADIUS',
      answerCorrect: true,
    })
  })

  it('drops malformed answer details instead of the whole review', () => {
    const normalized = normalizeReview({
      cardId: 'card-3',
      rating: 2,
      timeMs: 700,
      timestamp: 3000,
      answer: { selected: 42, correct: null, wasCorrect: 'yes' },
    })

    expect(normalized).not.toBeNull()
    expect(normalized?.selectedAnswer).toBeUndefined()
    expect(normalized?.correctAnswer).toBeUndefined()
    expect(normalized?.answerCorrect).toBeUndefined()
  })
})
