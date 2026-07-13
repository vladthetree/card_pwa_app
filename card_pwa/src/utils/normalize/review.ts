/**
 * AI_CONTEXT: Normalization utility for review; converts external or sync data into safe internal record shapes.
 */
import type { ReviewRecord } from '../../db'

export function normalizeReview(raw: unknown): Omit<ReviewRecord, 'id'> | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const cardId = value.cardId ?? value.card_id
  const rating = Number(value.rating)
  const timeMs = Number(value.timeMs ?? value.time_ms)
  const timestamp = Number(value.timestamp ?? value.reviewedAt ?? value.reviewed_at)
  const createdAt = Number(value.createdAt ?? value.created_at)
  const opIdRaw = value.opId ?? value.reviewOpId ?? value.review_op_id
  const sourceClientRaw = value.sourceClient ?? value.source_client

  if (typeof cardId !== 'string' || !cardId) return null
  if (![1, 2, 3, 4].includes(rating)) return null

  // Antwortdetails: verschachtelt (`answer`, Snapshot/Sync-Op) oder flach
  // (`selectedAnswer`/…, Dexie-Export) — beide Formen akzeptieren.
  const answer = value.answer && typeof value.answer === 'object'
    ? value.answer as Record<string, unknown>
    : {}
  const selectedAnswerRaw = answer.selected ?? value.selectedAnswer ?? value.selected_answer
  const correctAnswerRaw = answer.correct ?? value.correctAnswer ?? value.correct_answer
  const answerCorrectRaw = typeof answer.wasCorrect === 'boolean'
    ? answer.wasCorrect
    : (typeof value.answerCorrect === 'boolean' ? value.answerCorrect : undefined)

  return {
    opId: typeof opIdRaw === 'string' && opIdRaw.trim() ? opIdRaw.trim() : undefined,
    cardId,
    rating: rating as ReviewRecord['rating'],
    timeMs: Number.isFinite(timeMs) ? timeMs : 0,
    timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
    sourceClient: typeof sourceClientRaw === 'string' && sourceClientRaw.trim()
      ? sourceClientRaw.trim()
      : undefined,
    createdAt: Number.isFinite(createdAt) ? createdAt : undefined,
    ...(typeof selectedAnswerRaw === 'string' && selectedAnswerRaw ? { selectedAnswer: selectedAnswerRaw } : {}),
    ...(typeof correctAnswerRaw === 'string' && correctAnswerRaw ? { correctAnswer: correctAnswerRaw } : {}),
    ...(answerCorrectRaw !== undefined ? { answerCorrect: answerCorrectRaw } : {}),
  }
}
