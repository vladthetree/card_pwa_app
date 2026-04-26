import type { Card, Rating, SessionReviewEvent } from '../types'

export type StudySessionKind = 'deck' | 'shuffle'

export interface PersistedStudySession {
  version: 4
  /** For shuffle sessions this stores the namespaced key, e.g. shuffle:<id>. */
  deckId: string
  kind?: StudySessionKind
  collectionId?: string
  deckIds?: string[]
  cardOrigins?: Record<string, string>
  cardIds: string[]
  cardLimit?: number
  sessionCount: number
  isFlipped: boolean
  isDone: boolean
  lastRating: { rating: Rating; elapsedMs: number } | null
  lowRatingCounts: Record<string, number>
  relearnSuccessCounts: Record<string, number>
  forcedTomorrowCardIds: string[]
  againCounts: Record<string, number>
  reviewEvents?: SessionReviewEvent[]
  expiresAt: number
  startTime: number
}

export const STUDY_SESSION_VERSION = 4
export const STUDY_SESSION_TTL_MS = 45 * 60 * 1000
export const DEFAULT_STUDY_CARD_LIMIT = 50
export const MIN_STUDY_CARD_LIMIT = 10
export const MAX_STUDY_CARD_LIMIT = 200
export const STUDY_CARD_LIMIT_STEP = 10

export function buildShuffleSessionId(collectionId: string): string {
  return `shuffle:${collectionId}`
}

export function sanitizeCardLimit(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_STUDY_CARD_LIMIT
  const rounded = Math.round(value / STUDY_CARD_LIMIT_STEP) * STUDY_CARD_LIMIT_STEP
  return Math.max(MIN_STUDY_CARD_LIMIT, Math.min(MAX_STUDY_CARD_LIMIT, rounded))
}

export function parsePersistedStudySession(raw: string | null, sessionId: string, nowMs = Date.now()): PersistedStudySession | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as PersistedStudySession
    if (parsed.version !== STUDY_SESSION_VERSION || parsed.deckId !== sessionId) return null
    if (!Number.isFinite(parsed.expiresAt) || parsed.expiresAt <= nowMs) return null
    if (!Array.isArray(parsed.cardIds) || parsed.cardIds.length === 0) return null
    // Provide default for sessions persisted before againCounts was added.
    if (!parsed.againCounts || typeof parsed.againCounts !== 'object') parsed.againCounts = {}
    if (!Array.isArray(parsed.reviewEvents)) parsed.reviewEvents = []
    if (parsed.kind !== 'shuffle') parsed.kind = 'deck'
    return parsed
  } catch {
    return null
  }
}

export function restoreCardsByOrder(cards: Card[], cardIds: string[]): Card[] {
  return cardIds
    .map(id => cards.find(card => card.id === id) ?? null)
    .filter((card): card is Card => card !== null)
}

export function buildPersistedStudySession(input: {
  deckId: string
  kind?: StudySessionKind
  collectionId?: string
  deckIds?: string[]
  cardOrigins?: Record<string, string>
  cardIds: string[]
  cardLimit: number
  sessionCount: number
  isFlipped: boolean
  isDone: boolean
  lastRating: { rating: Rating; elapsedMs: number } | null
  lowRatingCounts: Record<string, number>
  relearnSuccessCounts: Record<string, number>
  forcedTomorrowCardIds: string[]
  againCounts: Record<string, number>
  reviewEvents?: SessionReviewEvent[]
  startTime: number
  nowMs?: number
}): PersistedStudySession {
  const now = input.nowMs ?? Date.now()

  return {
    version: STUDY_SESSION_VERSION,
    deckId: input.deckId,
    kind: input.kind ?? 'deck',
    collectionId: input.collectionId,
    deckIds: input.deckIds,
    cardOrigins: input.cardOrigins,
    cardIds: input.cardIds,
    cardLimit: input.cardLimit,
    sessionCount: input.sessionCount,
    isFlipped: input.isFlipped,
    isDone: input.isDone,
    lastRating: input.lastRating,
    lowRatingCounts: input.lowRatingCounts,
    relearnSuccessCounts: input.relearnSuccessCounts,
    forcedTomorrowCardIds: input.forcedTomorrowCardIds,
    againCounts: input.againCounts,
    reviewEvents: input.reviewEvents ?? [],
    expiresAt: now + STUDY_SESSION_TTL_MS,
    startTime: input.startTime,
  }
}
