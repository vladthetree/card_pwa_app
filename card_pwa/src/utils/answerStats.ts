/**
 * AI_CONTEXT:
 * Role: Pure answer-statistics core of the dedicated SY0-701 learning-unit
 *       system (Phase 3, Detailplan §10): vollständige Statistik je Scope
 *       (scored/correct/wrong, Fehlerauflösung, Exposition, Aktualität)
 *       statt einer Wrong-only-Query.
 * Used by: db/queries/answerStats.ts (listAnswerStats) and tests.
 * Important: Hint-Qualität — Legacy-Reviews haben unsichere Herkunft (§10):
 *            sie informieren Empfehlungen, liefern aber NIE Mastery. Deshalb
 *            sind `independentSessionCount` immer 0 und `partial`/`unanswered`
 *            strukturell 0, bis das serverakzeptierte AssessmentEvent-Ledger
 *            existiert. Pure und deterministisch, kein I/O.
 */

export interface AnswerHintRow {
  /** Karten-ID — Metriken hängen an der Karten-ID (Nutzerentscheidung 2026-07-18). */
  itemId: string
  /** `answerCorrect` hat Vorrang; Fallback `rating >= 3` setzt der Aufrufer (§10). */
  correct: boolean
  answeredAt: number
  timeMs: number
}

export interface AnswerStats {
  scopeId: string
  scopeType: 'item' | 'objective' | 'domain'
  scored: number
  correct: number
  wrong: number
  /** Immer 0, bis das Ledger Teilpunkte liefert (§10). */
  partial: number
  /** Immer 0: Reviews kennen keine unbeantworteten Items (§10). */
  unanswered: number
  earnedPoints: number
  possiblePoints: number
  uniqueItemCount: number
  /** Immer 0: Legacy-Hints haben keine servergebundenen Sitzungszeiten (§10). */
  independentSessionCount: number
  exposureCount: number
  totalTimeMs: number
  /** Antworten mit tatsächlich gemessener positiver Bearbeitungszeit. */
  timedAnswerCount: number
  /** Summe ausschließlich der positiven, tatsächlich gemessenen Zeiten. */
  timedAnswerTimeMs: number
  firstAnsweredAt?: number
  lastAnsweredAt?: number
  lastAnswerCorrect?: boolean
  unresolvedErrorItemIds: string[]
  resolvedAtByItemId: Record<string, number>
}

/** Objective „1.1“ → Domain „1.0“. */
function domainIdOfObjectiveId(objectiveId: string): string {
  return `${objectiveId.split('.')[0]}.0`
}

/**
 * Aggregiert Antwort-Hints je Item/Objective/Domain. Auflösungsregel nach §10
 * in Hint-Näherung: Ein Fehler gilt als aufgelöst, wenn dasselbe Item zu einem
 * **strikt späteren** Zeitpunkt korrekt gelöst wurde (Sitzungen sind aus
 * Legacy-Reviews nicht rekonstruierbar). Ergebnis deterministisch nach scopeId.
 */
export function computeAnswerStats(input: {
  rows: AnswerHintRow[]
  groupBy: 'item' | 'objective' | 'domain'
  /** Pflicht für groupBy objective/domain; Items ohne Mapping werden ausgelassen. */
  objectiveIdByItemId?: ReadonlyMap<string, string>
  sinceMs?: number
  untilMs?: number
}): AnswerStats[] {
  const scopeOf = (itemId: string): string | null => {
    if (input.groupBy === 'item') return itemId
    const objectiveId = input.objectiveIdByItemId?.get(itemId)
    if (!objectiveId) return null
    return input.groupBy === 'objective' ? objectiveId : domainIdOfObjectiveId(objectiveId)
  }

  const rowsByScope = new Map<string, AnswerHintRow[]>()
  for (const row of input.rows) {
    if (input.sinceMs !== undefined && row.answeredAt < input.sinceMs) continue
    if (input.untilMs !== undefined && row.answeredAt > input.untilMs) continue
    const scopeId = scopeOf(row.itemId)
    if (scopeId === null) continue
    const list = rowsByScope.get(scopeId) ?? []
    list.push(row)
    rowsByScope.set(scopeId, list)
  }

  const stats: AnswerStats[] = []
  for (const [scopeId, rows] of rowsByScope) {
    rows.sort((a, b) => a.answeredAt - b.answeredAt)

    const itemIds = new Set<string>()
    let correct = 0
    let totalTimeMs = 0
    let timedAnswerCount = 0
    let timedAnswerTimeMs = 0
    for (const row of rows) {
      itemIds.add(row.itemId)
      if (row.correct) correct += 1
      totalTimeMs += row.timeMs
      if (row.timeMs > 0) {
        timedAnswerCount += 1
        timedAnswerTimeMs += row.timeMs
      }
    }
    const scored = rows.length
    const last = rows[rows.length - 1]

    // Fehlerauflösung je Item: letzte falsche Antwort vs. erste striktere
    // spätere korrekte Antwort.
    const unresolvedErrorItemIds: string[] = []
    const resolvedAtByItemId: Record<string, number> = {}
    for (const itemId of itemIds) {
      const itemRows = rows.filter(row => row.itemId === itemId)
      const lastWrongAt = itemRows.reduce<number | null>(
        (max, row) => (!row.correct && (max === null || row.answeredAt > max) ? row.answeredAt : max),
        null,
      )
      if (lastWrongAt === null) continue
      const resolvingRow = itemRows.find(row => row.correct && row.answeredAt > lastWrongAt)
      if (resolvingRow) resolvedAtByItemId[itemId] = resolvingRow.answeredAt
      else unresolvedErrorItemIds.push(itemId)
    }
    unresolvedErrorItemIds.sort()

    stats.push({
      scopeId,
      scopeType: input.groupBy,
      scored,
      correct,
      wrong: scored - correct,
      partial: 0,
      unanswered: 0,
      earnedPoints: correct,
      possiblePoints: scored,
      uniqueItemCount: itemIds.size,
      independentSessionCount: 0,
      exposureCount: scored,
      totalTimeMs,
      timedAnswerCount,
      timedAnswerTimeMs,
      firstAnsweredAt: rows[0]?.answeredAt,
      lastAnsweredAt: last?.answeredAt,
      lastAnswerCorrect: last?.correct,
      unresolvedErrorItemIds,
      resolvedAtByItemId,
    })
  }

  return stats.sort((a, b) => a.scopeId.localeCompare(b.scopeId))
}
