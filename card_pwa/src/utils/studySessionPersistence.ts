/**
 * AI_CONTEXT:
 * Role: Versioned serialization helpers for resumable deck and shuffle study sessions.
 * Used by: StudyView, useSessionPersistence, active-session DB queries, and tests.
 * Important: Increment STUDY_SESSION_VERSION when persisted shape changes and keep parse tolerant of older optional fields where possible.
 */
import type { Card, Rating, SessionReviewEvent } from '../types'
import { generateUuidV7 } from './id'
import { isStudyableCard } from './sm2'
import { clamp } from './numeric'

export type StudySessionKind = 'deck' | 'shuffle'
export type StudyReturnTarget = 'learning-units'

export interface PersistedStudySession {
  version: 7
  /** For shuffle sessions this stores the namespaced key, e.g. shuffle:<id>. */
  deckId: string
  kind?: StudySessionKind
  collectionId?: string
  deckIds?: string[]
  cardOrigins?: Record<string, string>
  cardIds: string[]
  /** Stable across reload/resume; changes only when a genuinely new run starts. */
  sessionRunId: string
  cardLimit?: number
  /** Randomized target chosen once for this run; resume must never reroll it. */
  sessionTargetCardCount: number
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
  /** Herkunft der Session, damit Zurück/Abschluss auch nach Reload konsistent ist. */
  returnTarget?: StudyReturnTarget
  expiresAt: number
  /** Immutable wall-clock start of the entire session run. */
  startedAt: number
  /** Start of the current card presentation; used only for answer timing. */
  startTime: number
}

export const STUDY_SESSION_VERSION = 7
export const STUDY_SESSION_MAX_DURATION_MS = 4 * 60 * 60 * 1000
export const DEFAULT_STUDY_CARD_LIMIT = 50
export const MIN_STUDY_CARD_LIMIT = 10
export const MAX_STUDY_CARD_LIMIT = 200
export const STUDY_CARD_LIMIT_STEP = 10

export function buildShuffleSessionId(collectionId: string): string {
  return `shuffle:${collectionId}`
}

export function createSessionRunId(): string {
  return `study-${generateUuidV7()}`
}

export function getStudySessionExpiresAt(startedAt: number): number {
  return startedAt + STUDY_SESSION_MAX_DURATION_MS
}

export function isStudySessionExpired(startedAt: number, nowMs = Date.now()): boolean {
  return !Number.isFinite(startedAt) || nowMs >= getStudySessionExpiresAt(startedAt)
}

export function normalizeStudyCardLimit(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_STUDY_CARD_LIMIT
  const rounded = Math.round(parsed / STUDY_CARD_LIMIT_STEP) * STUDY_CARD_LIMIT_STEP
  return clamp(rounded, MIN_STUDY_CARD_LIMIT, MAX_STUDY_CARD_LIMIT)
}

/** Eine unterbrochene normale Deck-Session darf nur wiederaufgenommen werden,
 * wenn sie mit dem aktuell eingestellten Deck-Kontingent gestartet wurde. */
export function matchesPersistedStudyCardLimit(
  persistedLimit: unknown,
  configuredLimit: unknown,
): boolean {
  if (!Number.isFinite(Number(persistedLimit))) return false
  return normalizeStudyCardLimit(persistedLimit) === normalizeStudyCardLimit(configuredLimit)
}

export function parsePersistedStudySession(raw: string | null, sessionId: string, nowMs = Date.now()): PersistedStudySession | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as PersistedStudySession & {
      version?: number
      sessionRunId?: string
      sessionTargetCardCount?: number
      startedAt?: number
    }
    if (![5, 6, STUDY_SESSION_VERSION].includes(Number(parsed.version)) || parsed.deckId !== sessionId) return null
    if (!Array.isArray(parsed.cardIds) || parsed.cardIds.length === 0) return null
    const startedAt = Number.isFinite(parsed.startedAt)
      ? Number(parsed.startedAt)
      : Number(parsed.startTime)
    if (!Number.isFinite(startedAt)) return null
    const hardExpiresAt = getStudySessionExpiresAt(startedAt)
    const storedExpiresAt = Number.isFinite(parsed.expiresAt)
      ? Number(parsed.expiresAt)
      : hardExpiresAt
    const expiresAt = Math.min(storedExpiresAt, hardExpiresAt)
    if (expiresAt <= nowMs) return null
    // Provide default for sessions persisted before againCounts was added.
    if (!parsed.againCounts || typeof parsed.againCounts !== 'object') parsed.againCounts = {}
    if (!Array.isArray(parsed.hardPracticeCardIds)) parsed.hardPracticeCardIds = []
    if (!parsed.hardPracticePassCounts || typeof parsed.hardPracticePassCounts !== 'object') parsed.hardPracticePassCounts = {}
    if (!Array.isArray(parsed.reviewEvents)) parsed.reviewEvents = []
    if (parsed.kind !== 'shuffle') parsed.kind = 'deck'
    const sessionRunId = typeof parsed.sessionRunId === 'string' && parsed.sessionRunId.trim()
      ? parsed.sessionRunId.trim()
      : `legacy-session-${sessionId}-${Number(parsed.startTime) || 0}`
    const configuredLimit = Number.isFinite(parsed.cardLimit)
      ? Math.max(1, Math.floor(Number(parsed.cardLimit)))
      : parsed.cardIds.length
    const sessionTargetCardCount = Number.isFinite(parsed.sessionTargetCardCount)
      ? clamp(Math.floor(Number(parsed.sessionTargetCardCount)), 1, configuredLimit)
      : Math.min(configuredLimit, parsed.cardIds.length)
    return {
      ...parsed,
      version: STUDY_SESSION_VERSION,
      sessionRunId,
      sessionTargetCardCount,
      startedAt,
      expiresAt,
    }
  } catch {
    return null
  }
}

export function restoreCardsByOrder(cards: Card[], cardIds: string[]): Card[] {
  const cardsById = new Map(cards.map(card => [card.id, card]))
  return cardIds
    .map(id => cardsById.get(id) ?? null)
    .filter((card): card is Card => card !== null && isStudyableCard(card))
}

export function buildPersistedStudySession(input: {
  deckId: string
  kind?: StudySessionKind
  collectionId?: string
  deckIds?: string[]
  cardOrigins?: Record<string, string>
  cardIds: string[]
  sessionRunId?: string
  cardLimit: number
  sessionTargetCardCount?: number
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
  returnTarget?: StudyReturnTarget
  /** Immutable run start. Older callers fall back to the current-card start. */
  startedAt?: number
  startTime: number
  nowMs?: number
  /** @deprecated A session now has a hard four-hour lifetime independent of day rollover. */
  nextDayStartsAt?: number
}): PersistedStudySession {
  const startedAt = Number.isFinite(input.startedAt)
    ? Number(input.startedAt)
    : input.startTime
  const configuredLimit = Number.isFinite(input.cardLimit)
    ? Math.max(1, Math.floor(input.cardLimit))
    : Math.max(1, input.cardIds.length)
  const sessionTargetCardCount = Number.isFinite(input.sessionTargetCardCount)
    ? clamp(Math.floor(Number(input.sessionTargetCardCount)), 1, configuredLimit)
    : Math.min(configuredLimit, Math.max(1, input.cardIds.length))

  return {
    version: STUDY_SESSION_VERSION,
    deckId: input.deckId,
    kind: input.kind ?? 'deck',
    collectionId: input.collectionId,
    deckIds: input.deckIds,
    cardOrigins: input.cardOrigins,
    cardIds: input.cardIds,
    sessionRunId: input.sessionRunId?.trim() || createSessionRunId(),
    cardLimit: configuredLimit,
    sessionTargetCardCount,
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
    returnTarget: input.returnTarget,
    expiresAt: getStudySessionExpiresAt(startedAt),
    startedAt,
    startTime: input.startTime,
  }
}

/** Neue Sessions speichern ihr Ziel explizit. Die Namensräume erhalten den
 * korrekten Rückweg auch für bereits persistierte Payloads ohne dieses Feld. */
export function resolveStudyReturnTarget(
  sessionId: string,
  snapshot: Pick<PersistedStudySession, 'returnTarget'>,
): StudyReturnTarget | null {
  if (snapshot.returnTarget === 'learning-units') return snapshot.returnTarget
  if (
    sessionId.startsWith('unit-exec:')
    || sessionId.startsWith('learning-plan:acronyms:')
    || sessionId.startsWith('learning-plan:subdeck:')
  ) return 'learning-units'
  return null
}
