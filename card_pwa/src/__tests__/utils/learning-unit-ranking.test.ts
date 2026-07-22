import { describe, it, expect } from 'vitest'
import type { LearningUnitDefinition, LearningUnitState } from '../../utils/learningUnits'
import {
  computeDraftPacing,
  computeExamTimeline,
  computeLearningWorkload,
  rankLearningUnits,
  resolveLearningPhase,
  type LearningPacingResult,
} from '../../utils/learningUnitRanking'

function isoDaysFromNow(days: number, now: number): string {
  const base = new Date(now)
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const NOW = new Date(2026, 6, 15, 14, 30).getTime() // lokale Zeit, TZ-unabhängig

describe('computeExamTimeline', () => {
  it('rechnet in lokalen Kalendertagen: 0 am Prüfungstag, negativ danach', () => {
    expect(computeExamTimeline({ examDateIso: isoDaysFromNow(0, NOW), now: NOW }).daysLeft).toBe(0)
    expect(computeExamTimeline({ examDateIso: isoDaysFromNow(5, NOW), now: NOW }).daysLeft).toBe(5)
    expect(computeExamTimeline({ examDateIso: isoDaysFromNow(-2, NOW), now: NOW }).daysLeft).toBe(-2)
  })

  it('liefert null ohne bzw. bei ungültigem Termin', () => {
    expect(computeExamTimeline({ examDateIso: null, now: NOW }).daysLeft).toBeNull()
    expect(computeExamTimeline({ examDateIso: 'quatsch', now: NOW }).daysLeft).toBeNull()
  })
})

describe('resolveLearningPhase', () => {
  it('folgt der Präzedenz pastExam → final → exam → deepening → foundation', () => {
    expect(resolveLearningPhase({ daysLeft: -1, courseProgressRatio: 0 })).toBe('pastExam')
    expect(resolveLearningPhase({ daysLeft: 0, courseProgressRatio: 0 })).toBe('final')
    expect(resolveLearningPhase({ daysLeft: 3, courseProgressRatio: 0 })).toBe('final')
    expect(resolveLearningPhase({ daysLeft: 10, courseProgressRatio: 0 })).toBe('exam')
    expect(resolveLearningPhase({ daysLeft: 21, courseProgressRatio: 0 })).toBe('deepening')
    expect(resolveLearningPhase({ daysLeft: 22, courseProgressRatio: 0 })).toBe('foundation')
  })

  it('nutzt ohne Termin den Kursfortschritt (≥ 60 % → deepening)', () => {
    expect(resolveLearningPhase({ daysLeft: null, courseProgressRatio: 0.59 })).toBe('foundation')
    expect(resolveLearningPhase({ daysLeft: null, courseProgressRatio: 0.6 })).toBe('deepening')
    expect(resolveLearningPhase({ daysLeft: null, courseProgressRatio: Number.NaN })).toBe('foundation')
  })
})

// ── rankLearningUnits ───────────────────────────────────────────────────────

function unit(partial: Partial<LearningUnitDefinition> & Pick<LearningUnitDefinition, 'unitId' | 'type' | 'order'>): LearningUnitDefinition {
  return {
    title: partial.unitId,
    objectiveIds: ['1.1'],
    requirementIds: [],
    definitionVersion: 'v1',
    ...partial,
  }
}

const course2 = unit({ unitId: 'unit:course:002', type: 'course', order: 2 })
const course3 = unit({ unitId: 'unit:course:003', type: 'course', order: 3 })
const review11 = unit({ unitId: 'unit:review:1.1', type: 'review', order: 1 })
const lab1 = unit({ unitId: 'unit:lab:fw-01', type: 'lab', order: 50, objectiveIds: ['4.5'] })
const drill = unit({
  unitId: 'unit:exam:drill-1', type: 'exam', order: 90,
  examLaunch: {
    descriptorId: 'drill-1', descriptorVersion: 'v1', purpose: 'practice', mode: 'drill',
    blueprintId: 'bp', blueprintVersion: 'v1', sourceSnapshotId: 's', contentManifestVersion: 'm',
    scoringRegistryVersion: 'v1', languagePolicy: { kind: 'fixed', language: 'en' },
    itemCount: 15, durationSec: 900, eligiblePhaseIds: ['exam', 'final'],
  },
})

const okPacing: LearningPacingResult = {
  requiredMinutes: 100, availableMinutesAfterBuffer: 500, requiredMinutesPerLearningDay: 30,
  feasible: true, missingEstimateUnitIds: [], reason: 'on-track',
}

function rank(overrides: Partial<Parameters<typeof rankLearningUnits>[0]> = {}) {
  return rankLearningUnits({
    definitions: [course2, course3, review11, lab1, drill],
    stateByUnitId: new Map<string, LearningUnitState>(),
    phase: 'foundation',
    localLearningDay: '2026-07-15',
    reviewCompletedToday: false,
    reviewDueUnitIds: new Set(['unit:review:1.1']),
    objectiveEvidence: new Map(),
    readiness: 'notReady',
    daysLeft: 30,
    pacing: okPacing,
    ...overrides,
  })
}

describe('rankLearningUnits', () => {
  it('setzt eine aktive Ausführung immer an Rang 1', () => {
    const state: LearningUnitState = {
      profileId: 'p', evidenceEpoch: 1, unitId: 'unit:course:003', activityStatus: 'inProgress',
      currentStep: 'cards', activeExecutionId: 'exec-1', lastActivityAt: 1, updatedAt: 1,
    }
    const ranked = rank({ stateByUnitId: new Map([['unit:course:003', state]]) })
    expect(ranked[0].definition.unitId).toBe('unit:course:003')
    expect(ranked[0].reason).toBe('active_execution')
    expect(ranked[0].recommended).toBe(true)
  })

  it('foundation: höchstens eine Review-Empfehlung, dann nächste Kurseinheit', () => {
    const ranked = rank()
    expect(ranked[0].definition.unitId).toBe('unit:review:1.1')
    expect(ranked[0].reason).toBe('scheduler_due')
    expect(ranked[1].definition.unitId).toBe('unit:course:002')
    expect(ranked[1].reason).toBe('next_course_in_sequence')
    expect(ranked.filter(r => r.recommended)).toHaveLength(2)
  })

  it('foundation: nach erledigter Tagesreview wird keine Review mehr empfohlen', () => {
    const ranked = rank({ reviewCompletedToday: true })
    expect(ranked[0].definition.unitId).toBe('unit:course:002')
    expect(ranked.find(r => r.definition.unitId === 'unit:review:1.1')?.recommended).toBe(false)
  })

  it('bereits abgeschlossene Kurseinheiten geben die Empfehlung an die nächste weiter', () => {
    const done: LearningUnitState = {
      profileId: 'p', evidenceEpoch: 1, unitId: 'unit:course:002', activityStatus: 'completed',
      currentStep: 'done', lastActivityAt: 1, updatedAt: 1,
    }
    const ranked = rank({ stateByUnitId: new Map([['unit:course:002', done]]), reviewDueUnitIds: new Set() })
    expect(ranked[0].definition.unitId).toBe('unit:course:003')
    expect(ranked[0].recommended).toBe(true)
  })

  it('exam-Phase: Drills vor allem anderen, keine automatische Course-Empfehlung', () => {
    const ranked = rank({ phase: 'exam' })
    expect(ranked[0].definition.unitId).toBe('unit:exam:drill-1')
    expect(ranked[0].recommended).toBe(true)
    for (const entry of ranked.filter(r => r.definition.type === 'course')) {
      expect(entry.recommended).toBe(false)
    }
  })

  it('final-Phase: nur kurze Reviews/Drills, keine Course-/Lab-Empfehlung', () => {
    const ranked = rank({ phase: 'final' })
    const recommendedIds = ranked.filter(r => r.recommended).map(r => r.definition.unitId)
    expect(recommendedIds).toContain('unit:review:1.1')
    expect(recommendedIds).toContain('unit:exam:drill-1')
    expect(recommendedIds).not.toContain('unit:course:002')
    expect(recommendedIds).not.toContain('unit:lab:fw-01')
  })

  it('pastExam: nichts wird empfohlen, alles trägt readiness_no_go', () => {
    const ranked = rank({ phase: 'pastExam', daysLeft: -1, pacing: { ...okPacing, feasible: false, reason: 'past-exam' } })
    expect(ranked.every(r => !r.recommended)).toBe(true)
    expect(ranked.every(r => r.reason === 'readiness_no_go')).toBe(true)
  })

  it('No-Go-Pacing blockiert Empfehlungen, versteckt aber keine Einheit', () => {
    const ranked = rank({ pacing: { ...okPacing, feasible: false, reason: 'capacity-shortfall' } })
    expect(ranked).toHaveLength(5)
    expect(ranked.every(r => r.blocked)).toBe(true)
    expect(ranked.every(r => !r.recommended)).toBe(true)
  })

  it('ist deterministisch: gleiche Eingaben ergeben identische Reihenfolge', () => {
    expect(rank().map(r => r.definition.unitId)).toEqual(rank().map(r => r.definition.unitId))
  })
})

describe('computeDraftPacing', () => {
  const plan = { weeklyMinutesAvailable: 300, learningDaysPerWeek: 6, bufferDays: 2 }

  it('ohne Termin oder Budget: missing-plan, ohne Machbarkeitsurteil', () => {
    expect(computeDraftPacing({ daysLeft: null }).reason).toBe('missing-plan')
    expect(computeDraftPacing({ daysLeft: 30 }).reason).toBe('missing-plan')
    expect(computeDraftPacing({ daysLeft: 30, plan: { weeklyMinutesAvailable: 0 } }).reason).toBe('missing-plan')
  })

  it('überfälliger Termin: past-exam und nicht machbar', () => {
    const result = computeDraftPacing({ daysLeft: -1, plan })
    expect(result.reason).toBe('past-exam')
    expect(result.feasible).toBe(false)
  })

  it('fehlende Schätzungen werden benannt statt als machbar auszugeben', () => {
    const result = computeDraftPacing({
      daysLeft: 30,
      plan,
      remainingUnits: [
        { unitId: 'unit:course:002', estimatedMinutes: 40 },
        { unitId: 'unit:course:003' },
      ],
    })
    expect(result.reason).toBe('missing-estimates')
    expect(result.missingEstimateUnitIds).toEqual(['unit:course:003'])
    expect(result.requiredMinutes).toBe(40)
  })

  it('rechnet Budget nach Puffertagen und meldet capacity-shortfall ehrlich', () => {
    // 30 Tage − 2 Puffer = 28 Tage · (300/7) = 1200 min verfügbar,
    // 24 Lerntage → 50 min/Lerntag bei 1200 min Bedarf: genau machbar.
    const onTrack = computeDraftPacing({
      daysLeft: 30,
      plan,
      remainingUnits: [{ unitId: 'unit:course:002', estimatedMinutes: 1200 }],
    })
    expect(onTrack.reason).toBe('on-track')
    expect(onTrack.availableMinutesAfterBuffer).toBe(1200)
    expect(onTrack.requiredMinutesPerLearningDay).toBe(50)

    const shortfall = computeDraftPacing({
      daysLeft: 30,
      plan,
      remainingUnits: [{ unitId: 'unit:course:002', estimatedMinutes: 1201 }],
    })
    expect(shortfall.reason).toBe('capacity-shortfall')
    expect(shortfall.feasible).toBe(false)
  })

  it('nutzt die vollständige Restarbeit und reicht ihre Messdaten an die Anzeige durch', () => {
    const workload = computeLearningWorkload({
      remainingCourseUnits: [{ unitId: 'course-1', estimatedMinutes: 60 }],
      remainingLabUnits: [{ unitId: 'lab-1', estimatedMinutes: 30 }],
      dueReviewCardCount: 8,
      unresolvedErrorCardCount: 4,
      pendingReviewCardCount: 10,
      timedReviewSampleCount: 4,
      observedReviewTimeMs: 120_000,
    })
    const result = computeDraftPacing({ daysLeft: 30, plan, workload })

    expect(workload.averageReviewSeconds).toBe(30)
    expect(workload.estimatedCurrentReviewMinutes).toBe(5)
    expect(workload.reserveMinutes).toBe(19)
    expect(workload.totalMinutes).toBe(114)
    expect(result.requiredMinutes).toBe(114)
    expect(result.workload).toBe(workload)
    expect(result.reason).toBe('on-track')
  })

  it('erfindet ohne persönliche Kartenzeit keine Review- oder Gesamtdauer', () => {
    const workload = computeLearningWorkload({
      remainingCourseUnits: [{ unitId: 'course-1', estimatedMinutes: 60 }],
      remainingLabUnits: [],
      dueReviewCardCount: 3,
      unresolvedErrorCardCount: 0,
      pendingReviewCardCount: 3,
      timedReviewSampleCount: 0,
      observedReviewTimeMs: 0,
    })
    const result = computeDraftPacing({ daysLeft: 30, plan, workload })

    expect(workload.averageReviewSeconds).toBeNull()
    expect(workload.estimatedCurrentReviewMinutes).toBeNull()
    expect(workload.totalMinutes).toBeNull()
    expect(workload.missingMeasurements).toEqual(['review-time'])
    expect(result.reason).toBe('missing-estimates')
    expect(result.workload).toBe(workload)
  })
})
