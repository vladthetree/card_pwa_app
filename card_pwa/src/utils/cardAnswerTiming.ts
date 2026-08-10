/**
 * AI_CONTEXT:
 * Role: Pure normalization and aggregation rules for per-card answer timing.
 * Important: A card contributes at most one appearance and one answer sample
 * per sessionRunId; all persisted durations are whole seconds.
 */
import type { CardAnswerTimingStats } from '../db'

function normalizeNonNegativeInteger(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.round(parsed))
}

function normalizeSessionRunId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

export function normalizeCardAnswerTimingStats(value: unknown): CardAnswerTimingStats {
  const raw = value && typeof value === 'object'
    ? value as Partial<CardAnswerTimingStats>
    : {}
  const answerTimeSampleCount = normalizeNonNegativeInteger(raw.answerTimeSampleCount)
  const storedAverage = normalizeNonNegativeInteger(raw.averageAnswerTimeSeconds)
  const storedTotal = normalizeNonNegativeInteger(raw.totalAnswerTimeSeconds)
  const totalAnswerTimeSeconds = storedTotal > 0
    ? storedTotal
    : storedAverage * answerTimeSampleCount

  return {
    averageAnswerTimeSeconds: answerTimeSampleCount > 0
      ? Math.round(totalAnswerTimeSeconds / answerTimeSampleCount)
      : 0,
    totalAnswerTimeSeconds,
    answerTimeSampleCount,
    studySessionCount: normalizeNonNegativeInteger(raw.studySessionCount),
    lastAnsweredSessionRunId: normalizeSessionRunId(raw.lastAnsweredSessionRunId),
    lastSeenSessionRunId: normalizeSessionRunId(raw.lastSeenSessionRunId),
  }
}

export function buildCardSessionAppearance(
  current: unknown,
  sessionRunId: string,
): { changed: boolean; stats: CardAnswerTimingStats } {
  const stats = normalizeCardAnswerTimingStats(current)
  const normalizedSessionRunId = normalizeSessionRunId(sessionRunId)
  if (!normalizedSessionRunId || stats.lastSeenSessionRunId === normalizedSessionRunId) {
    return { changed: false, stats }
  }

  return {
    changed: true,
    stats: {
      ...stats,
      studySessionCount: stats.studySessionCount + 1,
      lastSeenSessionRunId: normalizedSessionRunId,
    },
  }
}

export function buildFirstCardAnswerTiming(
  current: unknown,
  sessionRunId: string,
  elapsedSeconds: number,
): { changed: boolean; stats: CardAnswerTimingStats } {
  const appearance = buildCardSessionAppearance(current, sessionRunId)
  const stats = appearance.stats
  const normalizedSessionRunId = normalizeSessionRunId(sessionRunId)
  if (!normalizedSessionRunId || stats.lastAnsweredSessionRunId === normalizedSessionRunId) {
    return { changed: appearance.changed, stats }
  }

  const sampleSeconds = normalizeNonNegativeInteger(elapsedSeconds)
  const answerTimeSampleCount = stats.answerTimeSampleCount + 1
  const totalAnswerTimeSeconds = stats.totalAnswerTimeSeconds + sampleSeconds

  return {
    changed: true,
    stats: {
      ...stats,
      averageAnswerTimeSeconds: Math.round(totalAnswerTimeSeconds / answerTimeSampleCount),
      totalAnswerTimeSeconds,
      answerTimeSampleCount,
      lastAnsweredSessionRunId: normalizedSessionRunId,
    },
  }
}
