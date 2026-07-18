/**
 * AI_CONTEXT:
 * Role: `listAnswerStats` des dedizierten SY0-701-Systems (Phase 3, §10) —
 *       vollständige Antwortstatistik über die vorhandenen ReviewRecords
 *       statt einer Wrong-only-Query.
 * Used by: (später) Review-Unit-Builder/Empfehlung des Lerneinheiten-Moduls
 *          und Tests — bestehende App-Pfade bleiben unberührt (read-only).
 * Important: Legacy-Reviews sind Hints mit unsicherer Herkunft (§10): sie
 *            dürfen Empfehlungen informieren, aber nie Mastery liefern —
 *            `masteryEligibleOnly: true` liefert deshalb bewusst ein leeres
 *            Ergebnis, bis das serverakzeptierte Ledger existiert.
 */
import { db } from '../../db'
import { computeAnswerStats, type AnswerStats } from '../../utils/answerStats'
import { objectiveIdOfDeckId } from '../../utils/learningUnits'
import { listCardsByIds } from './decks'

export interface ListAnswerStatsInput {
  groupBy: 'item' | 'objective' | 'domain'
  /** Karten-IDs zum Einschränken (z. B. eingefrorene Execution-Auswahl). */
  itemIds?: string[]
  sinceMs?: number
  untilMs?: number
  /** true ⇒ leeres Ergebnis: Hints sind nie masteryfähig (§10). */
  masteryEligibleOnly?: boolean
}

export async function listAnswerStats(input: ListAnswerStatsInput): Promise<AnswerStats[]> {
  if (input.masteryEligibleOnly) return []

  const reviews = input.itemIds !== undefined
    ? await db.reviews.where('cardId').anyOf(input.itemIds).toArray()
    : await db.reviews.toArray()

  const rows = reviews.map(review => ({
    itemId: review.cardId,
    // §10: `answerCorrect` hat Vorrang, sonst markierter Fallback rating >= 3.
    correct: review.answerCorrect ?? review.rating >= 3,
    answeredAt: review.timestamp,
    timeMs: review.timeMs ?? 0,
  }))

  let objectiveIdByItemId: Map<string, string> | undefined
  if (input.groupBy !== 'item') {
    const cardIds = [...new Set(rows.map(row => row.itemId))]
    const cards = await listCardsByIds(cardIds)
    objectiveIdByItemId = new Map()
    for (const card of cards) {
      const objectiveId = objectiveIdOfDeckId(card.deckId)
      if (objectiveId) objectiveIdByItemId.set(card.id, objectiveId)
    }
  }

  return computeAnswerStats({
    rows,
    groupBy: input.groupBy,
    objectiveIdByItemId,
    sinceMs: input.sinceMs,
    untilMs: input.untilMs,
  })
}
