/**
 * AI_CONTEXT:
 * Role: Versioned serialization helpers for resumable deck and shuffle study sessions.
 * Used by: StudyView, useSessionPersistence, active-session DB queries, and tests.
 * Important: Increment STUDY_SESSION_VERSION when persisted shape changes and keep parse tolerant of older optional fields where possible.
 */
import type { Card, Rating, SessionReviewEvent } from '../types'
import { DAY_MS, getDayStartMs } from '../utils/time'

export type StudySessionKind = 'deck' | 'shuffle'

export interface PersistedStudySession {
  version: 5
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
  hardPracticeCardIds: string[]
  hardPracticePassCounts: Record<string, number>
  reviewEvents?: SessionReviewEvent[]
  expiresAt: number
  startTime: number
}

export const STUDY_SESSION_VERSION = 5
export const STUDY_SESSION_TTL_MS = 45 * 60 * 1000
export const DEFAULT_STUDY_CARD_LIMIT = 50
export const MIN_STUDY_CARD_LIMIT = 10
export const MAX_STUDY_CARD_LIMIT = 200
export const STUDY_CARD_LIMIT_STEP = 10

export function buildShuffleSessionId(collectionId: string): string {
  return `shuffle:${collectionId}`
}

export function normalizeStudyCardLimit(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_STUDY_CARD_LIMIT
  const rounded = Math.round(parsed / STUDY_CARD_LIMIT_STEP) * STUDY_CARD_LIMIT_STEP
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
    if (!Array.isArray(parsed.hardPracticeCardIds)) parsed.hardPracticeCardIds = []
    if (!parsed.hardPracticePassCounts || typeof parsed.hardPracticePassCounts !== 'object') parsed.hardPracticePassCounts = {}
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
  hardPracticeCardIds?: string[]
  hardPracticePassCounts?: Record<string, number>
  reviewEvents?: SessionReviewEvent[]
  startTime: number
  nowMs?: number
  /** Tag-Wechsel-Stunde: verlängert die Gültigkeit bis zur nächsten Tagesgrenze,
   *  damit mobile Unterbrechungen > 45 min die Session nicht verwerfen. */
  nextDayStartsAt?: number
}): PersistedStudySession {
  const now = input.nowMs ?? Date.now()
  const ttlExpiresAt = now + STUDY_SESSION_TTL_MS
  const expiresAt = typeof input.nextDayStartsAt === 'number'
    ? Math.max(ttlExpiresAt, getDayStartMs(now, input.nextDayStartsAt) + DAY_MS)
    : ttlExpiresAt

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
    hardPracticeCardIds: input.hardPracticeCardIds ?? [],
    hardPracticePassCounts: input.hardPracticePassCounts ?? {},
    reviewEvents: input.reviewEvents ?? [],
    expiresAt,
    startTime: input.startTime,
  }
}
