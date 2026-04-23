import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_STUDY_CARD_LIMIT,
  STUDY_SESSION_TTL_MS,
  buildPersistedStudySession,
  buildShuffleSessionId,
  parsePersistedStudySession,
  restoreCardsByOrder,
  sanitizeCardLimit,
} from '../../services/studySessionPersistence'
import type { Card, Rating } from '../../types'

function createCard(id: string): Card {
  return {
    id,
    noteId: `note-${id}`,
    type: 'new',
    front: `front-${id}`,
    back: `back-${id}`,
    extra: { acronym: '', examples: '', port: '', protocol: '' },
    tags: [],
    interval: 0,
    due: 0,
    reps: 0,
    lapses: 0,
    queue: 0,
  }
}

describe('study session persistence helpers', () => {
  it('parses valid persisted session for matching deck', () => {
    const now = Date.UTC(2026, 3, 10, 12, 0, 0)
    const raw = JSON.stringify({
      version: 4,
      deckId: 'deck-1',
      cardIds: ['c1', 'c2'],
      cardLimit: 50,
      sessionCount: 2,
      isFlipped: false,
      isDone: false,
      lastRating: null,
      lowRatingCounts: {},
      relearnSuccessCounts: {},
      forcedTomorrowCardIds: [],
      expiresAt: now + 1_000,
      startTime: now - 30_000,
    })

    const parsed = parsePersistedStudySession(raw, 'deck-1', now)
    expect(parsed).not.toBeNull()
    expect(parsed?.cardIds).toEqual(['c1', 'c2'])
    expect(parsed?.kind).toBe('deck')
  })

  it('rejects persisted session when deck id differs', () => {
    const now = Date.now()
    const raw = JSON.stringify({
      version: 4,
      deckId: 'deck-a',
      cardIds: ['c1'],
      sessionCount: 1,
      isFlipped: false,
      isDone: false,
      lastRating: null,
      lowRatingCounts: {},
      relearnSuccessCounts: {},
      forcedTomorrowCardIds: [],
      expiresAt: now + 1_000,
      startTime: now,
    })

    expect(parsePersistedStudySession(raw, 'deck-b', now)).toBeNull()
  })

  it('rejects persisted session when expired', () => {
    const now = Date.now()
    const raw = JSON.stringify({
      version: 4,
      deckId: 'deck-1',
      cardIds: ['c1'],
      sessionCount: 1,
      isFlipped: false,
      isDone: false,
      lastRating: null,
      lowRatingCounts: {},
      relearnSuccessCounts: {},
      forcedTomorrowCardIds: [],
      expiresAt: now - 1,
      startTime: now - 10_000,
    })

    expect(parsePersistedStudySession(raw, 'deck-1', now)).toBeNull()
  })

  it('rejects malformed json payloads', () => {
    expect(parsePersistedStudySession('{not-json', 'deck-1', Date.now())).toBeNull()
  })

  it('normalizes card limit to step and bounds', () => {
    expect(sanitizeCardLimit(53)).toBe(50)
    expect(sanitizeCardLimit(205)).toBe(200)
    expect(sanitizeCardLimit(2)).toBe(10)
    expect(sanitizeCardLimit(Number.NaN)).toBe(DEFAULT_STUDY_CARD_LIMIT)
  })

  it('restores card order from persisted ids and skips missing ids', () => {
    const cards = [createCard('a'), createCard('b'), createCard('c')]
    const restored = restoreCardsByOrder(cards, ['c', 'missing', 'a'])

    expect(restored.map(card => card.id)).toEqual(['c', 'a'])
  })

  it('builds persisted payload with expected ttl window', () => {
    const now = Date.UTC(2026, 3, 10, 15, 30, 0)
    vi.useFakeTimers()
    vi.setSystemTime(now)

    const payload = buildPersistedStudySession({
      deckId: 'deck-1',
      cardIds: ['c1', 'c2'],
      cardLimit: 50,
      sessionCount: 3,
      isFlipped: true,
      isDone: false,
      lastRating: { rating: 3 as Rating, elapsedMs: 1234 },
      lowRatingCounts: { c1: 1 },
      relearnSuccessCounts: { c1: 1 },
      forcedTomorrowCardIds: ['c2'],
      againCounts: {},
      startTime: now - 5_000,
    })

    expect(payload.version).toBe(4)
    expect(payload.deckId).toBe('deck-1')
    expect(payload.kind).toBe('deck')
    expect(payload.cardIds).toEqual(['c1', 'c2'])
    expect(payload.expiresAt).toBe(now + STUDY_SESSION_TTL_MS)

    vi.useRealTimers()
  })

  it('builds a namespaced shuffle session id', () => {
    expect(buildShuffleSessionId('collection-1')).toBe('shuffle:collection-1')
  })

  it('preserves optional shuffle fields in persisted payloads', () => {
    const payload = buildPersistedStudySession({
      deckId: 'shuffle:collection-1',
      kind: 'shuffle',
      collectionId: 'collection-1',
      deckIds: ['deck-a', 'deck-b'],
      cardOrigins: { c1: 'deck-a', c2: 'deck-b' },
      cardIds: ['c1', 'c2'],
      cardLimit: 50,
      sessionCount: 1,
      isFlipped: false,
      isDone: false,
      lastRating: null,
      lowRatingCounts: {},
      relearnSuccessCounts: {},
      forcedTomorrowCardIds: [],
      againCounts: {},
      startTime: 123,
      nowMs: 200,
    })

    expect(payload.kind).toBe('shuffle')
    expect(payload.collectionId).toBe('collection-1')
    expect(payload.deckIds).toEqual(['deck-a', 'deck-b'])
    expect(payload.cardOrigins).toEqual({ c1: 'deck-a', c2: 'deck-b' })
  })

  it('parses persisted shuffle sessions with namespaced ids', () => {
    const sessionId = 'shuffle:collection-1'
    const now = Date.UTC(2026, 3, 10, 12, 0, 0)
    const raw = JSON.stringify({
      version: 4,
      deckId: sessionId,
      kind: 'shuffle',
      collectionId: 'collection-1',
      deckIds: ['deck-a', 'deck-b'],
      cardOrigins: { c1: 'deck-a' },
      cardIds: ['c1', 'c2'],
      cardLimit: 50,
      sessionCount: 2,
      isFlipped: false,
      isDone: false,
      lastRating: null,
      lowRatingCounts: {},
      relearnSuccessCounts: {},
      forcedTomorrowCardIds: [],
      againCounts: {},
      expiresAt: now + 1_000,
      startTime: now - 30_000,
    })

    const parsed = parsePersistedStudySession(raw, sessionId, now)
    expect(parsed).not.toBeNull()
    expect(parsed?.kind).toBe('shuffle')
    expect(parsed?.collectionId).toBe('collection-1')
    expect(parsed?.deckIds).toEqual(['deck-a', 'deck-b'])
    expect(parsed?.cardOrigins).toEqual({ c1: 'deck-a' })
  })
})
