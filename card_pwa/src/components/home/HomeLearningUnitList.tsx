/**
 * AI_CONTEXT: Home-screen React component of the dedicated SY0-701 learning-unit
 * module: compact ranked recommendation rows (max 5) with an explainable reason
 * each, used inside the LearningUnitsView screen. Activity, evidence,
 * and readiness are labeled separately (§18) — "abgeschlossen" never reads as
 * "beherrscht".
 */
import { motion } from '../../ui/motion'
import { AlertTriangle, ChevronRight, ListChecks } from 'lucide-react'
import type { LearningPhase, LearningUnitDefinition, LearningUnitState, ReadinessStatus } from '../../utils/learningUnits'
import type { LearningUnitReason, RankedLearningUnit } from '../../utils/learningUnitRanking'

export const LEARNING_UNIT_COPY = {
  de: {
    label: 'Lerneinheiten · SY0-701',
    showAll: 'Alle anzeigen',
    progress: (done: number, total: number) => `${done}/${total} bearbeitet`,
    daysLeft: (days: number) => days === 1 ? 'noch 1 Tag' : `noch ${days} Tage`,
    examToday: 'Prüfungstag',
    pastExam: 'Termin überschritten',
    evidenceNote: 'Evidenz: noch unzureichend',
    readiness: {
      notReady: 'Reife: noch nicht bereit',
      approaching: 'Reife: auf dem Weg',
      examReady: 'Reife: prüfungsbereit',
    } satisfies Record<ReadinessStatus, string>,
    phase: {
      foundation: 'Grundlagen',
      deepening: 'Vertiefung',
      exam: 'Prüfungsphase',
      final: 'Endspurt',
      pastExam: 'Termin überschritten',
    } satisfies Record<LearningPhase, string>,
    activity: {
      notStarted: 'offen',
      inProgress: 'in Bearbeitung',
      completed: 'abgeschlossen',
    },
    reason: {
      active_execution: 'Angefangen — fortsetzen',
      scheduler_due: 'Wiederholung fällig',
      unresolved_error_retest: 'Ungelöste Fehler erneut prüfen',
      next_course_in_sequence: 'Nächstes Video der Reihe',
      objective_practice_gap: 'Übung fürs Objective',
      lab_retry: 'Lab erneut versuchen',
      weak_domain: 'Schwache Domain vertiefen',
      exam_practice: 'Prüfungs-Drill',
      scheduled_holdout_mock: 'Geplante Vollsimulation',
      readiness_no_go: 'Termin/Plan prüfen',
    } satisfies Record<LearningUnitReason, string>,
    noGo: 'Der Prüfungstermin ist überschritten. Termin oder Plan aktualisieren — bis dahin gibt es keine aktuelle Empfehlung.',
  },
  en: {
    label: 'Learning units · SY0-701',
    showAll: 'Show all',
    progress: (done: number, total: number) => `${done}/${total} worked through`,
    daysLeft: (days: number) => days === 1 ? '1 day left' : `${days} days left`,
    examToday: 'Exam day',
    pastExam: 'Exam date passed',
    evidenceNote: 'Evidence: still insufficient',
    readiness: {
      notReady: 'Readiness: not ready yet',
      approaching: 'Readiness: approaching',
      examReady: 'Readiness: exam-ready',
    } satisfies Record<ReadinessStatus, string>,
    phase: {
      foundation: 'Foundations',
      deepening: 'Deepening',
      exam: 'Exam phase',
      final: 'Final stretch',
      pastExam: 'Exam date passed',
    } satisfies Record<LearningPhase, string>,
    activity: {
      notStarted: 'open',
      inProgress: 'in progress',
      completed: 'completed',
    },
    reason: {
      active_execution: 'Started — continue',
      scheduler_due: 'Review due',
      unresolved_error_retest: 'Retest unresolved errors',
      next_course_in_sequence: 'Next video in sequence',
      objective_practice_gap: 'Practice for the objective',
      lab_retry: 'Retry the lab',
      weak_domain: 'Strengthen a weak domain',
      exam_practice: 'Exam drill',
      scheduled_holdout_mock: 'Scheduled full mock',
      readiness_no_go: 'Check exam date/plan',
    } satisfies Record<LearningUnitReason, string>,
    noGo: 'The exam date has passed. Update the date or plan — until then there is no current recommendation.',
  },
} as const

const MAX_COMPACT_ROWS = 5

interface Props {
  language: 'de' | 'en'
  phase: LearningPhase
  daysLeft: number | null
  readiness: ReadinessStatus
  courseCompleted: number
  courseTotal: number
  ranked: RankedLearningUnit[]
  stateByUnitId: ReadonlyMap<string, LearningUnitState>
  /** Öffnet die Einheit (Course → Video in der Lernvideos-Ansicht). */
  onOpenUnit: (definition: LearningUnitDefinition) => void
  /** Öffnet die Vollliste; ohne Callback entfällt der Button (z. B. im
   *  LearningUnitsView, wo die Vollliste direkt darunter steht). */
  onShowAll?: () => void
}

function ActivityChip({ language, status }: { language: 'de' | 'en'; status: 'notStarted' | 'inProgress' | 'completed' }) {
  const copy = LEARNING_UNIT_COPY[language]
  const tone = status === 'completed'
    ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
    : status === 'inProgress'
      ? 'border-[--brand-primary-50] bg-[--brand-primary-08] text-[--brand-primary]'
      : 'border-ds-border text-ds-muted'
  return (
    <span className={`shrink-0 rounded-full border px-1.5 py-px font-mono text-[10px] leading-4 ${tone}`}>
      {copy.activity[status]}
    </span>
  )
}

export function HomeLearningUnitList({
  language, phase, daysLeft, readiness, courseCompleted, courseTotal,
  ranked, stateByUnitId, onOpenUnit, onShowAll,
}: Props) {
  const copy = LEARNING_UNIT_COPY[language]
  const rows = ranked.slice(0, MAX_COMPACT_ROWS)
  const noGo = rows.length > 0 && rows.every(row => row.blocked)

  const daysLeftLabel = daysLeft === null
    ? null
    : daysLeft < 0 ? copy.pastExam : daysLeft === 0 ? copy.examToday : copy.daysLeft(daysLeft)

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      data-testid="learning-unit-list"
      className="min-w-0 overflow-hidden rounded-ds border border-ds-border bg-ds-card p-3 shadow-card sm:p-4"
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[--brand-primary]">{copy.label}</div>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-ds-muted">
            <span>{copy.phase[phase]}</span>
            <span aria-hidden>·</span>
            <span>{copy.progress(courseCompleted, courseTotal)}</span>
            {daysLeftLabel && (
              <>
                <span aria-hidden>·</span>
                <span>{daysLeftLabel}</span>
              </>
            )}
          </div>
        </div>
        {onShowAll && (
          <button
            type="button"
            data-testid="learning-unit-show-all"
            onClick={onShowAll}
            className="flex shrink-0 items-center gap-1 rounded-ds border border-ds-border px-2 py-1.5 font-mono text-[11px] text-ds-fg transition hover:border-[--brand-primary-50] hover:text-[--brand-primary]"
          >
            <ListChecks size={13} strokeWidth={1.75} />
            {copy.showAll}
          </button>
        )}
      </div>

      {noGo && (
        <div className="mt-3 flex items-start gap-2 rounded-ds border border-amber-400/40 bg-amber-400/10 px-2.5 py-2">
          <AlertTriangle size={14} strokeWidth={1.75} className="mt-0.5 shrink-0 text-amber-300" />
          <span className="font-mono text-[11px] leading-relaxed text-amber-200">{copy.noGo}</span>
        </div>
      )}

      <ul className="mt-3 grid min-w-0 gap-1.5">
        {rows.map((row, index) => {
          const state = stateByUnitId.get(row.definition.unitId)
          const activity = state?.activityStatus ?? 'notStarted'
          return (
            <li key={row.definition.unitId} className="min-w-0">
              <button
                type="button"
                data-testid={`learning-unit-row-${row.definition.unitId}`}
                onClick={() => onOpenUnit(row.definition)}
                className={`flex w-full min-w-0 items-center gap-2.5 rounded-ds border px-2.5 py-2 text-left transition ${
                  index === 0 && row.recommended
                    ? 'border-[--brand-primary-50] bg-[--brand-primary-08] hover:brightness-110'
                    : 'border-ds-border bg-ds-floor hover:border-[--brand-primary-50]'
                }`}
              >
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-ds-muted">
                  {row.definition.type === 'review' ? 'REV' : String(row.definition.order).padStart(3, '0')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-sans text-[13px] font-semibold leading-tight text-ds-fg">
                    {row.definition.title}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[10px] text-ds-muted">
                    {`Objective ${row.definition.objectiveIds[0]}`} · {copy.reason[row.reason]}
                  </span>
                </span>
                <ActivityChip language={language} status={activity} />
                <ChevronRight size={14} strokeWidth={1.75} className="shrink-0 text-ds-muted" />
              </button>
            </li>
          )
        })}
      </ul>

      {/* Evidenz und Reife bewusst getrennt von der Aktivität (§18): bearbeitete
          Einheiten erzeugen noch keine Mastery-Evidenz. */}
      <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] text-ds-muted">
        <span>{copy.evidenceNote}</span>
        <span aria-hidden>·</span>
        <span>{copy.readiness[readiness]}</span>
      </div>
    </motion.section>
  )
}
