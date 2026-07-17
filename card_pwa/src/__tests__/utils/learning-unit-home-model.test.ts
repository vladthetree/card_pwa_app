import { describe, it, expect } from 'vitest'
import {
  COURSE_FIRST_INDEX,
  COURSE_LAST_INDEX,
  formatCourseUnitId,
  overlayLegacyCourseStates,
  type LearningUnitState,
} from '../../utils/learningUnits'
import { computeDraftPacing } from '../../utils/learningUnitRanking'

// ── Fixtures ────────────────────────────────────────────────────────────────

const NOW = 1_800_000_000_000

function makeState(unitId: string, overrides: Partial<LearningUnitState> = {}): LearningUnitState {
  return {
    profileId: 'vlad',
    evidenceEpoch: 1,
    unitId,
    activityStatus: 'notStarted',
    currentStep: 'video',
    lastActivityAt: NOW - 1000,
    updatedAt: NOW - 1000,
    ...overrides,
  }
}

function makePointer(overrides: Partial<Parameters<typeof overlayLegacyCourseStates>[0]['pointer'] & object> = {}) {
  return {
    lastCompletedIndex: 0,
    lastCompletedAt: 0,
    activeIndex: 0,
    activeStartedAt: 0,
    ...overrides,
  }
}

function overlay(
  states: LearningUnitState[],
  pointer: ReturnType<typeof makePointer> | null,
): Map<string, LearningUnitState> {
  return overlayLegacyCourseStates({ states, pointer, profileId: 'vlad', evidenceEpoch: 1, now: NOW })
}

// ── computeDraftPacing ──────────────────────────────────────────────────────

describe('computeDraftPacing', () => {
  it('bleibt ohne Termin machbar mit reason missing-plan', () => {
    const pacing = computeDraftPacing({ daysLeft: null })
    expect(pacing.feasible).toBe(true)
    expect(pacing.reason).toBe('missing-plan')
  })

  it('blockiert nach überschrittenem Termin mit past-exam', () => {
    const pacing = computeDraftPacing({ daysLeft: -1 })
    expect(pacing.feasible).toBe(false)
    expect(pacing.reason).toBe('past-exam')
  })

  it('meldet mit Termin fehlende Zeitschätzungen statt behaupteter Machbarkeitsrechnung', () => {
    for (const daysLeft of [0, 1, 42]) {
      const pacing = computeDraftPacing({ daysLeft })
      expect(pacing.feasible).toBe(true)
      expect(pacing.reason).toBe('missing-estimates')
    }
  })
})

// ── overlayLegacyCourseStates ───────────────────────────────────────────────

describe('overlayLegacyCourseStates', () => {
  it('lässt die States ohne Pointer unverändert', () => {
    const state = makeState(formatCourseUnitId(5), { activityStatus: 'completed', currentStep: 'done' })
    const result = overlay([state], null)
    expect(result.size).toBe(1)
    expect(result.get(state.unitId)).toBe(state)
  })

  it('synthetisiert completed-States für den abgeschlossenen Pointer-Bereich', () => {
    const completedAt = NOW - 5000
    const result = overlay([], makePointer({ lastCompletedIndex: 4, lastCompletedAt: completedAt }))
    for (let index = COURSE_FIRST_INDEX; index <= 4; index++) {
      const state = result.get(formatCourseUnitId(index))
      expect(state?.activityStatus).toBe('completed')
      expect(state?.lastCompletedAt).toBe(completedAt)
    }
    expect(result.has(formatCourseUnitId(5))).toBe(false)
  })

  it('klemmt einen zu großen lastCompletedIndex auf das Kursende', () => {
    const result = overlay([], makePointer({ lastCompletedIndex: 999, lastCompletedAt: NOW - 1 }))
    expect(result.get(formatCourseUnitId(COURSE_LAST_INDEX))?.activityStatus).toBe('completed')
    expect(result.size).toBe(COURSE_LAST_INDEX - COURSE_FIRST_INDEX + 1)
  })

  it('überschreibt persistierte inProgress-States nicht', () => {
    const unitId = formatCourseUnitId(3)
    const persisted = makeState(unitId, { activityStatus: 'inProgress', activeExecutionId: 'exec-1' })
    const result = overlay([persisted], makePointer({ lastCompletedIndex: 4, lastCompletedAt: NOW - 1 }))
    expect(result.get(unitId)).toBe(persisted)
  })

  it('wertet persistierte notStarted-States zum Pointer-Stand auf', () => {
    const unitId = formatCourseUnitId(2)
    const result = overlay([makeState(unitId)], makePointer({ lastCompletedIndex: 2, lastCompletedAt: NOW - 1 }))
    expect(result.get(unitId)?.activityStatus).toBe('completed')
  })

  it('synthetisiert die aktive Pointer-Unit als inProgress mit Legacy-Ausführungskennung', () => {
    const startedAt = NOW - 2000
    const result = overlay(
      [],
      makePointer({ lastCompletedIndex: 4, lastCompletedAt: NOW - 9000, activeIndex: 5, activeStartedAt: startedAt }),
    )
    const active = result.get(formatCourseUnitId(5))
    expect(active?.activityStatus).toBe('inProgress')
    expect(active?.activeExecutionId).toBe('legacy:pointer:5')
    expect(active?.startedAt).toBe(startedAt)
  })

  it('ignoriert einen aktiven Pointer ohne Startzeit oder im abgeschlossenen Bereich', () => {
    const noStart = overlay([], makePointer({ activeIndex: 5, activeStartedAt: 0 }))
    expect(noStart.has(formatCourseUnitId(5))).toBe(false)

    const behindCompleted = overlay(
      [],
      makePointer({ lastCompletedIndex: 6, lastCompletedAt: NOW - 1, activeIndex: 5, activeStartedAt: NOW - 2 }),
    )
    expect(behindCompleted.get(formatCourseUnitId(5))?.activityStatus).toBe('completed')
  })
})
