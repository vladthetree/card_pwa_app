import { describe, it, expect } from 'vitest'
import { computeAnswerStats, type AnswerHintRow } from '../../utils/answerStats'

const T0 = 1_784_000_000_000

function row(overrides: Partial<AnswerHintRow>): AnswerHintRow {
  return { itemId: 'c1', correct: true, answeredAt: T0, timeMs: 1000, ...overrides }
}

describe('computeAnswerStats', () => {
  it('liefert vollständige Kennzahlen statt Wrong-only: scored/correct/wrong, Zeit, Aktualität', () => {
    const stats = computeAnswerStats({
      rows: [
        row({ answeredAt: T0, correct: false, timeMs: 5000 }),
        row({ answeredAt: T0 + 1000, correct: true, timeMs: 3000 }),
        row({ itemId: 'c2', answeredAt: T0 + 2000, correct: true, timeMs: 2000 }),
      ],
      groupBy: 'item',
    })
    expect(stats.map(s => s.scopeId)).toEqual(['c1', 'c2'])
    const c1 = stats[0]
    expect(c1).toMatchObject({
      scored: 2, correct: 1, wrong: 1, partial: 0, unanswered: 0,
      earnedPoints: 1, possiblePoints: 2, uniqueItemCount: 1,
      exposureCount: 2, totalTimeMs: 8000,
      firstAnsweredAt: T0, lastAnsweredAt: T0 + 1000, lastAnswerCorrect: true,
    })
  })

  it('löst Fehler nur durch strikt spätere korrekte Antwort auf', () => {
    const stats = computeAnswerStats({
      rows: [
        // c1: Fehler → später korrekt = aufgelöst.
        row({ itemId: 'c1', answeredAt: T0, correct: false }),
        row({ itemId: 'c1', answeredAt: T0 + 5000, correct: true }),
        // c2: korrekt → später Fehler = ungelöst (Reihenfolge zählt).
        row({ itemId: 'c2', answeredAt: T0, correct: true }),
        row({ itemId: 'c2', answeredAt: T0 + 5000, correct: false }),
        // c3: gleichzeitige korrekte Antwort zählt nicht als Auflösung.
        row({ itemId: 'c3', answeredAt: T0, correct: false }),
        row({ itemId: 'c3', answeredAt: T0, correct: true }),
      ],
      groupBy: 'item',
    })
    const byId = new Map(stats.map(s => [s.scopeId, s]))
    expect(byId.get('c1')?.unresolvedErrorItemIds).toEqual([])
    expect(byId.get('c1')?.resolvedAtByItemId).toEqual({ c1: T0 + 5000 })
    expect(byId.get('c2')?.unresolvedErrorItemIds).toEqual(['c2'])
    expect(byId.get('c3')?.unresolvedErrorItemIds).toEqual(['c3'])
  })

  it('gruppiert nach Objective/Domain über das Mapping und lässt Unmapped aus', () => {
    const mapping = new Map([
      ['c1', '1.1'],
      ['c2', '1.2'],
      ['c3', '2.4'],
    ])
    const rows = [
      row({ itemId: 'c1', correct: true }),
      row({ itemId: 'c2', correct: false }),
      row({ itemId: 'c3', correct: true }),
      row({ itemId: 'unmapped', correct: false }),
    ]
    const byObjective = computeAnswerStats({ rows, groupBy: 'objective', objectiveIdByItemId: mapping })
    expect(byObjective.map(s => s.scopeId)).toEqual(['1.1', '1.2', '2.4'])

    const byDomain = computeAnswerStats({ rows, groupBy: 'domain', objectiveIdByItemId: mapping })
    expect(byDomain.map(s => s.scopeId)).toEqual(['1.0', '2.0'])
    const domain1 = byDomain[0]
    expect(domain1.scored).toBe(2)
    expect(domain1.uniqueItemCount).toBe(2)
  })

  it('respektiert das Zeitfenster; Hints liefern nie unabhängige Sitzungen', () => {
    const stats = computeAnswerStats({
      rows: [
        row({ answeredAt: T0 - 1000 }),
        row({ answeredAt: T0 + 1000 }),
        row({ answeredAt: T0 + 99_000 }),
      ],
      groupBy: 'item',
      sinceMs: T0,
      untilMs: T0 + 50_000,
    })
    expect(stats[0].scored).toBe(1)
    expect(stats[0].independentSessionCount).toBe(0)
  })
})
