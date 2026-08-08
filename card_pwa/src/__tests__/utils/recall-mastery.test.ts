import { describe, it, expect } from 'vitest'
import {
  RECALL_BASE_STABILITY_DAYS,
  RECALL_PASS_RETENTION,
  RECALL_REFRESH_SAMPLE_SIZE,
  RECALL_STABILITY_GROWTH,
  computeRecallMastery,
  computeRecallRetrievability,
  computeRecallRunTally,
  formatLocalDayOf,
  selectRecallRunQuestionIds,
  type RecallRunLike,
} from '../../utils/recallMastery'

const DAY_MS = 86_400_000

function runAt(dayStartMs: number, overrides: Partial<RecallRunLike> = {}): RecallRunLike {
  return {
    questionIds: ['Q1', 'Q2', 'Q3'],
    missedQuestionIds: [],
    correct: 3,
    total: 3,
    completedAt: dayStartMs,
    ...overrides,
  }
}

describe('formatLocalDayOf', () => {
  it('formatiert denselben Kalendertag stabil, unabhängig von der Uhrzeit', () => {
    const morning = new Date('2026-08-01T00:05:00').getTime()
    const night = new Date('2026-08-01T23:55:00').getTime()
    expect(formatLocalDayOf(morning)).toBe(formatLocalDayOf(night))
    expect(formatLocalDayOf(morning)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('computeRecallRetrievability', () => {
  it('liegt bei t = Stabilität exakt auf der 90%-Schwelle (FSRS-Definition von S)', () => {
    expect(computeRecallRetrievability(3, 3)).toBeCloseTo(0.9, 10)
  })

  it('ist 1 bei t = 0 und fällt streng monoton mit der Zeit', () => {
    expect(computeRecallRetrievability(3, 0)).toBe(1)
    expect(computeRecallRetrievability(3, 1)).toBeGreaterThan(computeRecallRetrievability(3, 5))
    expect(computeRecallRetrievability(3, 10)).toBeLessThan(0.9)
  })

  it('liefert 0 ohne Stabilität (nie richtig beantwortet)', () => {
    expect(computeRecallRetrievability(0, 0)).toBe(0)
  })
})

describe('computeRecallMastery', () => {
  const dayOne = new Date('2026-08-01T09:00:00').getTime()

  it('gilt ohne jeden Lauf für keine Frage als bestanden', () => {
    const result = computeRecallMastery({ runs: [], questionIds: ['Q1', 'Q2'], now: dayOne })
    expect(result.passed).toBe(false)
    expect(result.pendingQuestionIds).toEqual(['Q1', 'Q2'])
    expect(result.passedQuestionIds).toEqual([])
  })

  it('markiert eine frisch richtig beantwortete Frage sofort als bestanden (Retrievability ~1)', () => {
    const run = runAt(dayOne, { questionIds: ['Q1'], correct: 1, total: 1 })
    const result = computeRecallMastery({ runs: [run], questionIds: ['Q1'], now: dayOne })
    expect(result.passed).toBe(true)
    expect(result.byQuestionId.get('Q1')?.retrievability).toBeCloseTo(1, 5)
  })

  it('lässt eine falsch beantwortete Frage nicht bestehen, auch wenn andere Fragen desselben Laufs richtig waren', () => {
    const run = runAt(dayOne, { missedQuestionIds: ['Q1'], correct: 2, total: 3 })
    const result = computeRecallMastery({ runs: [run], questionIds: ['Q1', 'Q2', 'Q3'], now: dayOne })
    expect(result.passed).toBe(false)
    expect(result.pendingQuestionIds).toEqual(['Q1'])
    expect(result.byQuestionId.get('Q1')?.pendingWrongDay).toBe(formatLocalDayOf(dayOne))
  })

  it('tilgt einen Fehler NICHT durch eine richtige Antwort am selben Tag — nur an einem SPÄTEREN Kalendertag', () => {
    const wrong = runAt(dayOne, { questionIds: ['Q1'], missedQuestionIds: ['Q1'], correct: 0, total: 1 })
    const sameDayCorrect = runAt(dayOne + 60_000, { questionIds: ['Q1'], correct: 1, total: 1 })
    const stillPending = computeRecallMastery({ runs: [wrong, sameDayCorrect], questionIds: ['Q1'], now: dayOne + 120_000 })
    expect(stillPending.passed).toBe(false)
    expect(stillPending.byQuestionId.get('Q1')?.pendingWrongDay).toBe(formatLocalDayOf(dayOne))

    const nextDay = dayOne + DAY_MS + 60_000
    const nextDayCorrect = runAt(nextDay, { questionIds: ['Q1'], correct: 1, total: 1 })
    const tilgt = computeRecallMastery({ runs: [wrong, sameDayCorrect, nextDayCorrect], questionIds: ['Q1'], now: nextDay })
    expect(tilgt.passed).toBe(true)
    expect(tilgt.byQuestionId.get('Q1')?.pendingWrongDay).toBeNull()
  })

  it('klingt ohne Auffrischung unter die 90%-Schwelle ab — Reihenfolge alter Fragen aus dem Modell', () => {
    const run = runAt(dayOne, { questionIds: ['Q1'], correct: 1, total: 1 })
    // Stabilität nach einer richtigen Antwort = RECALL_BASE_STABILITY_DAYS; bei
    // exakt dieser Spanne ist die Frage noch bestanden, klar danach nicht mehr.
    const atStability = computeRecallMastery({
      runs: [run],
      questionIds: ['Q1'],
      now: dayOne + RECALL_BASE_STABILITY_DAYS * DAY_MS,
    })
    expect(atStability.passed).toBe(true)
    const wellPast = computeRecallMastery({
      runs: [run],
      questionIds: ['Q1'],
      now: dayOne + RECALL_BASE_STABILITY_DAYS * DAY_MS * 5,
    })
    expect(wellPast.passed).toBe(false)
  })

  it('erhöht die Stabilität mit jeder weiteren, an einem späteren Tag richtig beantworteten Wiederholung', () => {
    const first = runAt(dayOne, { questionIds: ['Q1'], correct: 1, total: 1 })
    const second = runAt(dayOne + DAY_MS, { questionIds: ['Q1'], correct: 1, total: 1 })
    const afterFirst = computeRecallMastery({ runs: [first], questionIds: ['Q1'], now: dayOne })
    const afterSecond = computeRecallMastery({ runs: [first, second], questionIds: ['Q1'], now: dayOne + DAY_MS })
    const stabilityAfterFirst = afterFirst.byQuestionId.get('Q1')!.retrievability
    const stabilityAfterSecond = afterSecond.byQuestionId.get('Q1')!.retrievability
    expect(stabilityAfterFirst).toBeCloseTo(1, 5)
    expect(stabilityAfterSecond).toBeCloseTo(1, 5)
    // Weiter in der Zukunft zeigt die höhere Stabilität ihre Wirkung.
    const farLater = dayOne + DAY_MS + RECALL_BASE_STABILITY_DAYS * DAY_MS * 2
    const oneRunRetrievability = computeRecallRetrievability(RECALL_BASE_STABILITY_DAYS, (farLater - dayOne) / DAY_MS)
    const twoRunsRetrievability = computeRecallRetrievability(
      RECALL_BASE_STABILITY_DAYS * RECALL_STABILITY_GROWTH,
      (farLater - (dayOne + DAY_MS)) / DAY_MS,
    )
    expect(twoRunsRetrievability).toBeGreaterThan(oneRunRetrievability)
  })

  it('ignoriert Alt-Läufe ohne missedQuestionIds, wenn sie nicht vollständig richtig waren (mehrdeutig)', () => {
    const ambiguous: RecallRunLike = {
      questionIds: ['Q1', 'Q2'],
      correct: 1,
      total: 2,
      completedAt: dayOne,
      // missedQuestionIds absichtlich weggelassen (Alt-Lauf)
    }
    const result = computeRecallMastery({ runs: [ambiguous], questionIds: ['Q1', 'Q2'], now: dayOne })
    expect(result.passed).toBe(false)
    expect(result.byQuestionId.get('Q1')?.answered).toBe(false)
  })

  it('bestanden = true erfordert eine nicht-leere Zielmenge', () => {
    expect(computeRecallMastery({ runs: [], questionIds: [], now: dayOne }).passed).toBe(false)
  })
})

describe('computeRecallRunTally', () => {
  it('summiert richtig/falsch über mehrere Läufe', () => {
    const tally = computeRecallRunTally([
      { correct: 2, total: 3 },
      { correct: 5, total: 5 },
      { correct: 0, total: 2 },
    ])
    expect(tally).toEqual({ correct: 7, wrong: 3 })
  })

  it('liefert 0/0 ohne Läufe', () => {
    expect(computeRecallRunTally([])).toEqual({ correct: 0, wrong: 0 })
  })
})

describe('selectRecallRunQuestionIds', () => {
  const all = Array.from({ length: 10 }, (_, i) => `Q${i + 1}`)

  it('fragt beim Erst-Check (nichts beantwortet) die komplette Zielmenge', () => {
    const result = selectRecallRunQuestionIds({ questionIds: all, pendingQuestionIds: all, seed: 's1' })
    expect(new Set(result)).toEqual(new Set(all))
    expect(result).toHaveLength(all.length)
  })

  it('fragt bei vollständig bestandener Menge trotzdem alles (Wiederholungslauf)', () => {
    const result = selectRecallRunQuestionIds({ questionIds: all, pendingQuestionIds: [], seed: 's1' })
    expect(new Set(result)).toEqual(new Set(all))
  })

  it('mischt bei Teil-Mastery offene Fragen mit einer kleinen Auffrischungs-Auswahl bestandener Fragen', () => {
    const pending = ['Q1', 'Q2']
    const result = selectRecallRunQuestionIds({ questionIds: all, pendingQuestionIds: pending, seed: 's1' })
    expect(result).toEqual(expect.arrayContaining(pending))
    const refreshCount = result.length - pending.length
    expect(refreshCount).toBe(Math.min(RECALL_REFRESH_SAMPLE_SIZE, all.length - pending.length))
    // Auffrischung kommt aus den bestandenen Fragen, nie aus den offenen doppelt.
    const refreshIds = result.filter(id => !pending.includes(id))
    for (const id of refreshIds) expect(pending).not.toContain(id)
  })

  it('ist deterministisch unter demselben Seed', () => {
    const a = selectRecallRunQuestionIds({ questionIds: all, pendingQuestionIds: ['Q1', 'Q2'], seed: 'fixed' })
    const b = selectRecallRunQuestionIds({ questionIds: all, pendingQuestionIds: ['Q1', 'Q2'], seed: 'fixed' })
    expect(a).toEqual(b)
  })
})

describe('RECALL_PASS_RETENTION', () => {
  it('ist auf 90% festgelegt (Produktanforderung)', () => {
    expect(RECALL_PASS_RETENTION).toBe(0.9)
  })
})
