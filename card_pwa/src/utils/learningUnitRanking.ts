/**
 * AI_CONTEXT:
 * Role: Pure exam-timeline, learning-phase, and phase-aware unit-ranking logic of the dedicated SY0-701 learning-unit system (Phase 1).
 * Used by: learning-unit tests and (later phases) the dedicated Lerneinheiten UI — nothing in the existing app imports this yet.
 * Important: Deterministic, no I/O; rules come from docs/lerneinheiten-sy0-701-umsetzungsplan.md §12. Every rank carries an explainable `reason`.
 */
import type {
  LearningPhase,
  LearningUnitDefinition,
  LearningUnitState,
  ObjectiveEvidenceStatus,
  ReadinessStatus,
} from './learningUnits'

export interface ExamTimeline {
  daysLeft: number | null
  examDateIso: string | null
}

export interface LearningPacingResult {
  requiredMinutes: number
  availableMinutesAfterBuffer: number
  requiredMinutesPerLearningDay: number | null
  feasible: boolean
  missingEstimateUnitIds: string[]
  reason: 'on-track' | 'capacity-shortfall' | 'missing-plan' | 'missing-estimates' | 'past-exam'
  workload?: LearningWorkloadMetrics
}

export interface LearningWorkloadMetrics {
  remainingCourseUnitCount: number
  remainingCourseMinutes: number
  remainingLabUnitCount: number
  /** Alle derzeit offenen Labs; bis zur späteren Pflichtlab-Kuratierung bewusst so bezeichnet. */
  remainingLabMinutes: number
  dueReviewCardCount: number
  unresolvedErrorCardCount: number
  pendingReviewCardCount: number
  timedReviewSampleCount: number
  averageReviewSeconds: number | null
  estimatedCurrentReviewMinutes: number | null
  reservePercent: 20
  reserveMinutes: number | null
  totalMinutes: number | null
  missingEstimateUnitIds: string[]
  missingMeasurements: Array<'review-time'>
}

interface EstimatedUnit {
  unitId: string
  estimatedMinutes?: number
}

/**
 * Transparente Restarbeitsmessung ohne Prüfungssimulationen. Kurs-/Labzeiten
 * stammen aus den Unit-Definitionen; Reviewzeit wird ausschließlich aus
 * tatsächlich gemessenen positiven Reviewzeiten geschätzt. Ohne Stichprobe
 * bleibt die Gesamtschätzung offen statt einen Sekundenwert zu erfinden.
 */
export function computeLearningWorkload(input: {
  remainingCourseUnits: EstimatedUnit[]
  remainingLabUnits: EstimatedUnit[]
  dueReviewCardCount: number
  unresolvedErrorCardCount: number
  pendingReviewCardCount: number
  timedReviewSampleCount: number
  observedReviewTimeMs: number
}): LearningWorkloadMetrics {
  const allUnits = [...input.remainingCourseUnits, ...input.remainingLabUnits]
  const missingEstimateUnitIds = allUnits
    .filter(unit => unit.estimatedMinutes === undefined)
    .map(unit => unit.unitId)
  const sumMinutes = (units: EstimatedUnit[]) => units.reduce(
    (sum, unit) => sum + (unit.estimatedMinutes ?? 0),
    0,
  )
  const remainingCourseMinutes = sumMinutes(input.remainingCourseUnits)
  const remainingLabMinutes = sumMinutes(input.remainingLabUnits)
  const timedReviewSampleCount = Math.max(0, Math.floor(input.timedReviewSampleCount))
  const averageReviewSeconds = timedReviewSampleCount > 0 && input.observedReviewTimeMs > 0
    ? input.observedReviewTimeMs / timedReviewSampleCount / 1000
    : null
  const pendingReviewCardCount = Math.max(0, Math.floor(input.pendingReviewCardCount))
  const estimatedCurrentReviewMinutes = pendingReviewCardCount === 0
    ? 0
    : averageReviewSeconds === null
      ? null
      : Math.ceil((pendingReviewCardCount * averageReviewSeconds) / 60)
  const missingMeasurements: LearningWorkloadMetrics['missingMeasurements'] =
    pendingReviewCardCount > 0 && estimatedCurrentReviewMinutes === null ? ['review-time'] : []
  const complete = missingEstimateUnitIds.length === 0 && missingMeasurements.length === 0
  const baseMinutes = remainingCourseMinutes + remainingLabMinutes + (estimatedCurrentReviewMinutes ?? 0)
  const reserveMinutes = complete ? Math.ceil(baseMinutes * 0.2) : null

  return {
    remainingCourseUnitCount: input.remainingCourseUnits.length,
    remainingCourseMinutes,
    remainingLabUnitCount: input.remainingLabUnits.length,
    remainingLabMinutes,
    dueReviewCardCount: Math.max(0, Math.floor(input.dueReviewCardCount)),
    unresolvedErrorCardCount: Math.max(0, Math.floor(input.unresolvedErrorCardCount)),
    pendingReviewCardCount,
    timedReviewSampleCount,
    averageReviewSeconds,
    estimatedCurrentReviewMinutes,
    reservePercent: 20,
    reserveMinutes,
    totalMinutes: reserveMinutes === null ? null : baseMinutes + reserveMinutes,
    missingEstimateUnitIds,
    missingMeasurements,
  }
}

export type LearningUnitReason =
  | 'active_execution'
  | 'scheduler_due'
  | 'unresolved_error_retest'
  | 'next_course_in_sequence'
  | 'objective_practice_gap'
  | 'lab_retry'
  | 'weak_domain'
  | 'exam_practice'
  | 'scheduled_holdout_mock'
  | 'readiness_no_go'

export interface RankedLearningUnit {
  definition: LearningUnitDefinition
  rank: number
  reason: LearningUnitReason
  recommended: boolean
  blocked: boolean
}

/** Lokale Kalendertage bis zum Termin; 0 am Prüfungstag, negativ danach,
 *  null ohne Termin. Bewusst über lokale Mitternacht, nie über UTC. */
export function computeExamTimeline(input: { examDateIso: string | null; now: number }): ExamTimeline {
  if (!input.examDateIso || !/^\d{4}-\d{2}-\d{2}$/.test(input.examDateIso)) {
    return { daysLeft: null, examDateIso: null }
  }
  const [year, month, day] = input.examDateIso.split('-').map(Number)
  const examLocalMidnight = new Date(year, month - 1, day).getTime()
  if (!Number.isFinite(examLocalMidnight)) return { daysLeft: null, examDateIso: null }
  const nowDate = new Date(input.now)
  const todayLocalMidnight = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime()
  const dayMs = 86_400_000
  return {
    daysLeft: Math.round((examLocalMidnight - todayLocalMidnight) / dayMs),
    examDateIso: input.examDateIso,
  }
}

/** Präzedenz laut §12: pastExam → final (≤3) → exam (≤10) → deepening
 *  (≤21 oder Kursfortschritt ≥ 60 %) → foundation. */
export function resolveLearningPhase(input: {
  daysLeft: number | null
  courseProgressRatio: number
}): LearningPhase {
  const progress = Number.isFinite(input.courseProgressRatio)
    ? Math.max(0, Math.min(1, input.courseProgressRatio))
    : 0
  const daysLeft = input.daysLeft
  if (daysLeft !== null) {
    if (daysLeft < 0) return 'pastExam'
    if (daysLeft <= 3) return 'final'
    if (daysLeft <= 10) return 'exam'
    if (daysLeft <= 21) return 'deepening'
  }
  return progress >= 0.6 ? 'deepening' : 'foundation'
}

/**
 * Draft-Pacing der Phase 1: Ohne bestätigten Lernplan und ohne
 * Zeitschätzungen je Unit kann Machbarkeit weder belegt noch widerlegt
 * werden — nur ein überschrittener Termin blockiert (`past-exam`).
 * Die echte Kapazitätsrechnung (Wochenbudget, Puffertage) liefert Phase 3 (§12).
 */
export interface DraftPacingPlanInput {
  weeklyMinutesAvailable?: number
  learningDaysPerWeek?: number
  bufferDays?: number
}

/**
 * Draft-Pacing aus Termin, Wochenbudget und Dauerschätzungen der offenen
 * Units. Ehrlich statt geraten: ohne Termin oder Budget `missing-plan`,
 * ohne (vollständige) Schätzungen `missing-estimates` — nie ein stilles
 * „machbar“. `capacity-shortfall` ist der No-Go-Hinweis (§12).
 */
export function computeDraftPacing(input: {
  daysLeft: number | null
  plan?: DraftPacingPlanInput | null
  /** Offene (nicht abgeschlossene) Units; ohne `estimatedMinutes` → missing-estimates. */
  remainingUnits?: Array<{ unitId: string; estimatedMinutes?: number }>
  workload?: LearningWorkloadMetrics
}): LearningPacingResult {
  const remaining = input.remainingUnits ?? []
  const missingEstimateUnitIds = input.workload?.missingEstimateUnitIds ?? remaining
    .filter(unit => unit.estimatedMinutes === undefined)
    .map(unit => unit.unitId)
  const requiredMinutes = input.workload
    ? input.workload.totalMinutes ?? (
        input.workload.remainingCourseMinutes +
        input.workload.remainingLabMinutes +
        (input.workload.estimatedCurrentReviewMinutes ?? 0)
      )
    : remaining.reduce((sum, unit) => sum + (unit.estimatedMinutes ?? 0), 0)
  const base = {
    requiredMinutes,
    availableMinutesAfterBuffer: 0,
    requiredMinutesPerLearningDay: null as number | null,
    missingEstimateUnitIds,
    ...(input.workload ? { workload: input.workload } : {}),
  }
  if (input.daysLeft === null) return { ...base, feasible: true, reason: 'missing-plan' }
  if (input.daysLeft < 0) return { ...base, feasible: false, reason: 'past-exam' }

  const weeklyMinutes = input.plan?.weeklyMinutesAvailable ?? 0
  if (weeklyMinutes <= 0) return { ...base, feasible: true, reason: 'missing-plan' }

  const bufferDays = Math.max(0, input.plan?.bufferDays ?? 0)
  const effectiveDays = Math.max(0, input.daysLeft - bufferDays)
  const learningDaysPerWeek = Math.min(7, Math.max(1, input.plan?.learningDaysPerWeek ?? 7))
  const availableMinutesAfterBuffer = Math.floor(effectiveDays * (weeklyMinutes / 7))
  const remainingLearningDays = Math.floor(effectiveDays * (learningDaysPerWeek / 7))

  const requiredMinutesPerLearningDay =
    remainingLearningDays > 0 ? Math.ceil(requiredMinutes / remainingLearningDays) : null

  const shared = {
    requiredMinutes,
    availableMinutesAfterBuffer,
    requiredMinutesPerLearningDay,
    missingEstimateUnitIds,
    ...(input.workload ? { workload: input.workload } : {}),
  }
  if (missingEstimateUnitIds.length > 0 || (input.workload?.missingMeasurements.length ?? 0) > 0) {
    // Unvollständige Schätzungen: keine Machbarkeitsaussage vortäuschen.
    return { ...shared, feasible: true, reason: 'missing-estimates' }
  }
  if (requiredMinutes > availableMinutesAfterBuffer) {
    return { ...shared, feasible: false, reason: 'capacity-shortfall' }
  }
  return { ...shared, feasible: true, reason: 'on-track' }
}

interface Prioritized {
  definition: LearningUnitDefinition
  priority: number
  reason: LearningUnitReason
  recommended: boolean
  blocked: boolean
}

/**
 * Phasenabhängige Rangfolge (§12). Deterministisch: Sortierung nach
 * (priority, order, unitId); jede Zeile trägt einen erklärbaren Grund.
 *
 * Phase-1-Stand: Review-Fälligkeit kommt als `reviewDueUnitIds` herein
 * (Empfehlungseigenschaft, kein ActivityStatus); die vollständige
 * Evidenz-/Fehlerauflösung liefert Phase 3 über dieselbe Signatur.
 */
export function rankLearningUnits(input: {
  definitions: LearningUnitDefinition[]
  stateByUnitId: ReadonlyMap<string, LearningUnitState>
  phase: LearningPhase
  localLearningDay: string
  reviewCompletedToday: boolean
  reviewDueUnitIds: ReadonlySet<string>
  objectiveEvidence: ReadonlyMap<string, ObjectiveEvidenceStatus>
  readiness: ReadinessStatus
  daysLeft: number | null
  pacing: LearningPacingResult
}): RankedLearningUnit[] {
  const noGo = !input.pacing.feasible || input.pacing.reason === 'past-exam'

  const activeUnits: Prioritized[] = []
  const rest: Prioritized[] = []

  const nextCourse = input.definitions
    .filter(d => d.type === 'course')
    .filter(d => (input.stateByUnitId.get(d.unitId)?.activityStatus ?? 'notStarted') === 'notStarted')
    .sort((a, b) => a.order - b.order)[0]

  let reviewRecommendations = 0

  for (const definition of input.definitions) {
    const state = input.stateByUnitId.get(definition.unitId)
    if (state?.activityStatus === 'inProgress' && state.activeExecutionId) {
      // Immer zuerst: bereits aktive Ausführungen (frei vorgezogene inklusive).
      activeUnits.push({ definition, priority: 0, reason: 'active_execution', recommended: true, blocked: false })
      continue
    }

    let priority = 900
    let reason: LearningUnitReason = 'objective_practice_gap'
    let recommended = false

    const isReviewDue = input.reviewDueUnitIds.has(definition.unitId)
    const hasWeakEvidence = definition.objectiveIds.some(
      id => input.objectiveEvidence.get(id) === 'insufficientEvidence',
    )

    switch (input.phase) {
      case 'foundation':
        if (definition.type === 'review' && isReviewDue && !input.reviewCompletedToday && reviewRecommendations < 1) {
          // Höchstens eine empfohlene Review vor neuem Stoff; blockiert nie den Kurs.
          priority = 10
          reason = 'scheduler_due'
          recommended = true
          reviewRecommendations += 1
        } else if (definition.type === 'course' && definition.unitId === nextCourse?.unitId) {
          priority = 20
          reason = 'next_course_in_sequence'
          recommended = true
        } else if (definition.type === 'course') {
          priority = 100 + definition.order
          reason = 'next_course_in_sequence'
        } else if (definition.type === 'review' && isReviewDue) {
          priority = 200
          reason = 'scheduler_due'
        } else if (definition.type === 'lab') {
          priority = 300
          reason = 'objective_practice_gap'
        } else {
          priority = 800
          reason = 'exam_practice'
        }
        break

      case 'deepening':
        if (definition.type === 'review' && isReviewDue) {
          priority = 10
          reason = 'scheduler_due'
          recommended = !input.reviewCompletedToday && reviewRecommendations < 1
          if (recommended) reviewRecommendations += 1
        } else if (definition.type === 'lab' && hasWeakEvidence) {
          priority = 20
          reason = 'weak_domain'
          recommended = true
        } else if (definition.type === 'lab') {
          priority = 40
          reason = 'objective_practice_gap'
        } else if (definition.type === 'course' && definition.unitId === nextCourse?.unitId) {
          priority = 60
          reason = 'next_course_in_sequence'
          recommended = true
        } else if (definition.type === 'course') {
          priority = 100 + definition.order
          reason = 'next_course_in_sequence'
        } else {
          priority = 200
          reason = 'exam_practice'
        }
        break

      case 'exam':
        // Keine automatische Empfehlung neuer Course-Units.
        if (definition.type === 'exam') {
          priority = definition.examLaunch?.purpose === 'readiness' ? 5 : 10
          reason = definition.examLaunch?.purpose === 'readiness' ? 'scheduled_holdout_mock' : 'exam_practice'
          recommended = true
        } else if (definition.type === 'review' && isReviewDue) {
          priority = 20
          reason = 'unresolved_error_retest'
          recommended = true
        } else if (definition.type === 'lab' && hasWeakEvidence) {
          priority = 30
          reason = 'weak_domain'
        } else if (definition.type === 'course') {
          priority = 500 + definition.order
          reason = 'next_course_in_sequence'
        } else {
          priority = 400
          reason = 'objective_practice_gap'
        }
        break

      case 'final':
        // Nur kurze, gezielte Arbeit; keine automatische Course-/große Lab-Empfehlung.
        if (definition.type === 'review' && isReviewDue) {
          priority = 10
          reason = 'unresolved_error_retest'
          recommended = true
        } else if (definition.type === 'exam' && definition.examLaunch?.mode === 'drill') {
          priority = 20
          reason = 'exam_practice'
          recommended = true
        } else if (definition.type === 'exam') {
          priority = 100
          reason = 'exam_practice'
        } else if (definition.type === 'lab') {
          priority = 500
          reason = 'objective_practice_gap'
        } else {
          priority = 600 + definition.order
          reason = 'next_course_in_sequence'
        }
        break

      case 'pastExam':
        // Termin aktualisieren; keine scheinbar aktuelle Empfehlung.
        priority = 900 + definition.order
        reason = 'readiness_no_go'
        recommended = false
        break
    }

    rest.push({ definition, priority, reason, recommended, blocked: noGo })
  }

  const ordered = [
    ...activeUnits.sort(byDeterministicOrder),
    ...rest.sort(byDeterministicOrder),
  ]

  return ordered.map((entry, index) => ({
    definition: entry.definition,
    rank: index + 1,
    // Bei No-Go bleibt die Liste sichtbar, aber nichts wird als "empfohlen"
    // dargestellt außer der klaren No-Go-Erklärung (§12: nichts verstecken).
    reason: entry.blocked && !entry.recommended ? 'readiness_no_go' : entry.reason,
    recommended: entry.recommended && !entry.blocked,
    blocked: entry.blocked,
  }))
}

function byDeterministicOrder(a: Prioritized, b: Prioritized): number {
  if (a.priority !== b.priority) return a.priority - b.priority
  if (a.definition.order !== b.definition.order) return a.definition.order - b.definition.order
  return a.definition.unitId < b.definition.unitId ? -1 : a.definition.unitId > b.definition.unitId ? 1 : 0
}
