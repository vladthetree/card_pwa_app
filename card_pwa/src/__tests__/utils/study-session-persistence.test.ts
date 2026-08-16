/**
 * AI_CONTEXT: Vitest coverage for study session persistence; protects services behavior from regressions in the learning PWA.
 */
import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_STUDY_CARD_LIMIT,
  STUDY_SESSION_MAX_DURATION_MS,
  buildPersistedStudySession,
  buildShuffleSessionId,
  getStudySessionExpiresAt,
  isStudySessionExpired,
  parsePersistedStudySession,
  restoreCardsByOrder,
  matchesPersistedStudyCardLimit,
  normalizeStudyCardLimit,
  resolveStudyReturnTarget,
} from '../../utils/studySessionPersistence'
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
      version: 5,
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
    expect(parsed?.reviewEvents).toEqual([])
    expect(parsed?.sessionRunId).toBe(`legacy-session-deck-1-${now - 30_000}`)
  })

  it('rejects persisted session when deck id differs', () => {
    const now = Date.now()
    const raw = JSON.stringify({
      version: 5,
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
      version: 5,
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
    expect(normalizeStudyCardLimit(53)).toBe(50)
    expect(normalizeStudyCardLimit(205)).toBe(200)
    expect(normalizeStudyCardLimit(2)).toBe(10)
    expect(normalizeStudyCardLimit(Number.NaN)).toBe(DEFAULT_STUDY_CARD_LIMIT)
  })

  it('restores a session only while its card limit still matches the setting', () => {
    expect(matchesPersistedStudyCardLimit(120, 120)).toBe(true)
    expect(matchesPersistedStudyCardLimit(10, 120)).toBe(false)
    expect(matchesPersistedStudyCardLimit(undefined, 120)).toBe(false)
  })

  it('restores card order from persisted ids and skips missing ids', () => {
    const blocked = { ...createCard('blocked'), tags: ['qa-blocked'] }
    const cards = [createCard('a'), createCard('b'), createCard('c'), blocked]
    const restored = restoreCardsByOrder(cards, ['c', 'blocked', 'missing', 'a'])

    expect(restored.map(card => card.id)).toEqual(['c', 'a'])
  })

  it('builds a versioned payload with one non-sliding four-hour deadline', () => {
    const now = Date.UTC(2026, 3, 10, 15, 30, 0)
    const startedAt = now - 30 * 60_000
    vi.useFakeTimers()
    vi.setSystemTime(now)

    const payload = buildPersistedStudySession({
      deckId: 'deck-1',
      cardIds: ['c1', 'c2'],
      sessionRunId: 'run-persisted-1',
      cardLimit: 50,
      sessionCount: 3,
      isFlipped: true,
      isDone: false,
      lastRating: { rating: 3 as Rating, elapsedMs: 1234 },
      lowRatingCounts: { c1: 1 },
      relearnSuccessCounts: { c1: 1 },
      forcedTomorrowCardIds: ['c2'],
      againCounts: {},
      reviewEvents: [{ cardId: 'c1', rating: 3, elapsedMs: 1234 }],
      sessionTargetCardCount: 43,
      startedAt,
      startTime: now - 5_000,
    })

    expect(payload.version).toBe(7)
    expect(payload.deckId).toBe('deck-1')
    expect(payload.kind).toBe('deck')
    expect(payload.cardIds).toEqual(['c1', 'c2'])
    expect(payload.reviewEvents).toEqual([{ cardId: 'c1', rating: 3, elapsedMs: 1234 }])
    expect(payload.sessionRunId).toBe('run-persisted-1')
    expect(payload.sessionTargetCardCount).toBe(43)
    expect(payload.startedAt).toBe(startedAt)
    expect(payload.expiresAt).toBe(startedAt + STUDY_SESSION_MAX_DURATION_MS)

    vi.useRealTimers()
  })

  it('builds a namespaced shuffle session id', () => {
    expect(buildShuffleSessionId('collection-1')).toBe('shuffle:collection-1')
  })

  it('preserves the run id when a version 6 session is resumed', () => {
    const now = Date.UTC(2026, 3, 10, 12, 0, 0)
    const raw = JSON.stringify({
      version: 6,
      deckId: 'deck-1',
      cardIds: ['c1'],
      sessionRunId: 'run-resume-1',
      sessionCount: 1,
      isFlipped: false,
      isDone: false,
      lastRating: null,
      lowRatingCounts: {},
      relearnSuccessCounts: {},
      forcedTomorrowCardIds: [],
      againCounts: {},
      expiresAt: now + 1_000,
      startTime: now - 1_000,
    })

    expect(parsePersistedStudySession(raw, 'deck-1', now)?.sessionRunId).toBe('run-resume-1')
  })

  it('persistiert und rekonstruiert den Rückweg einer Lernplan-Session', () => {
    const payload = buildPersistedStudySession({
      deckId: 'learning-plan:subdeck:4.5',
      cardIds: ['c1'],
      cardLimit: 50,
      sessionCount: 0,
      isFlipped: false,
      isDone: false,
      lastRating: null,
      lowRatingCounts: {},
      relearnSuccessCounts: {},
      forcedTomorrowCardIds: [],
      againCounts: {},
      returnTarget: 'learning-units',
      startTime: 100,
      nowMs: 100,
    })

    expect(payload.returnTarget).toBe('learning-units')
    expect(resolveStudyReturnTarget(payload.deckId, payload)).toBe('learning-units')
  })

  it.each([
    'unit-exec:execution-1',
    'learning-plan:acronyms:4.5',
    'learning-plan:subdeck:4.5',
  ])('erhält für alte namespacete Session %s den Lernplan-Rückweg', sessionId => {
    expect(resolveStudyReturnTarget(sessionId, {})).toBe('learning-units')
  })

  it('ordnet normale Deck-Sessions weiterhin Home zu', () => {
    expect(resolveStudyReturnTarget('deck-1', {})).toBeNull()
  })

  it('does not extend the deadline when a later save or day boundary occurs', () => {
    const startedAt = new Date(2026, 3, 10, 15, 30, 0).getTime()
    const laterSave = startedAt + 2 * 60 * 60_000

    const payload = buildPersistedStudySession({
      deckId: 'deck-1',
      cardIds: ['c1'],
      cardLimit: 50,
      sessionCount: 0,
      isFlipped: false,
      isDone: false,
      lastRating: null,
      lowRatingCounts: {},
      relearnSuccessCounts: {},
      forcedTomorrowCardIds: [],
      againCounts: {},
      startedAt,
      startTime: laterSave,
      nowMs: laterSave,
      nextDayStartsAt: 4,
    })

    expect(payload.expiresAt).toBe(startedAt + STUDY_SESSION_MAX_DURATION_MS)
  })

  it('treats the exact four-hour boundary as expired', () => {
    const startedAt = Date.UTC(2026, 3, 10, 12, 0, 0)
    expect(getStudySessionExpiresAt(startedAt)).toBe(startedAt + STUDY_SESSION_MAX_DURATION_MS)
    expect(isStudySessionExpired(startedAt, startedAt + STUDY_SESSION_MAX_DURATION_MS - 1)).toBe(false)
    expect(isStudySessionExpired(startedAt, startedAt + STUDY_SESSION_MAX_DURATION_MS)).toBe(true)
  })

  it('rejects a snapshot after four hours even when stored expiry was extended', () => {
    const startedAt = Date.UTC(2026, 3, 10, 12, 0, 0)
    const raw = JSON.stringify({
      version: 7,
      deckId: 'deck-1',
      cardIds: ['c1'],
      cardLimit: 50,
      sessionTargetCardCount: 42,
      sessionCount: 0,
      isFlipped: false,
      isDone: false,
      lastRating: null,
      lowRatingCounts: {},
      relearnSuccessCounts: {},
      forcedTomorrowCardIds: [],
      againCounts: {},
      startedAt,
      startTime: startedAt + 1_000,
      expiresAt: startedAt + 24 * 60 * 60_000,
    })

    expect(parsePersistedStudySession(
      raw,
      'deck-1',
      startedAt + STUDY_SESSION_MAX_DURATION_MS,
    )).toBeNull()
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
      version: 5,
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
