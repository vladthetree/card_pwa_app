/**
 * AI_CONTEXT: Home-screen React component of the dedicated SY0-701 learning-unit
 * module: compact ranked recommendation rows (max 5) with an explainable reason
 * each, used inside the LearningUnitsView screen. Activity, evidence,
 * and readiness are labeled separately (§18) — "abgeschlossen" never reads as
 * "beherrscht".
 */
import { motion } from '../../ui/motion'
import {
  AlertTriangle,
  Beaker,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  ListChecks,
  Play,
  RefreshCw,
} from 'lucide-react'
import type { LearningPhase, LearningUnitDefinition, LearningUnitState, ReadinessStatus } from '../../utils/learningUnits'
import type { LearningUnitReason, RankedLearningUnit } from '../../utils/learningUnitRanking'

export const LEARNING_UNIT_COPY = {
  de: {
    label: 'Lerneinheiten · SY0-701',
    showAll: 'Alle anzeigen',
    recommended: 'Empfohlen',
    duration: (minutes: number) => `ca. ${minutes} Min.`,
    type: {
      course: 'Video',
      review: 'Wiederholung',
      lab: 'Lab',
      exam: 'Prüfung',
    },
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
    recommended: 'Recommended',
    duration: (minutes: number) => `about ${minutes} min`,
    type: {
      course: 'Video',
      review: 'Review',
      lab: 'Lab',
      exam: 'Exam',
    },
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

const MAX_COMPACT_ROWS = 3

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
    ? 'border-black bg-[#C4B5FD] text-black'
    : status === 'inProgress'
      ? 'border-black bg-[#FF6B6B] text-black'
      : 'border-black bg-white text-black'
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[11px] leading-4 ${tone}`}>
      {copy.activity[status]}
    </span>
  )
}

function UnitTypeMark({
  type,
  recommended,
}: {
  type: LearningUnitDefinition['type']
  recommended: boolean
}) {
  const Icon = type === 'course'
    ? Play
    : type === 'review'
      ? RefreshCw
      : type === 'lab'
        ? Beaker
        : ClipboardCheck
  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center border-2 border-black text-black ${
      recommended
        ? 'bg-[#FF6B6B]'
        : type === 'review'
          ? 'bg-[#C4B5FD]'
          : type === 'lab'
            ? 'bg-[#FFD93D]'
            : 'bg-white'
    }`}>
      <Icon size={17} strokeWidth={2.5} />
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
      className="neo-learning-card min-w-0 p-4 sm:p-5"
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-black">{copy.label}</div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[12px] text-ds-muted">
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
            className="neo-learning-press neo-learning-secondary flex min-h-11 shrink-0 items-center gap-1.5 px-3 py-2 font-sans text-[12px] font-bold uppercase tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          >
            <ListChecks size={13} strokeWidth={1.75} />
            {copy.showAll}
          </button>
        )}
      </div>

      {noGo && (
        <div className="neo-learning-note mt-4 flex items-start gap-2 px-3 py-3">
          <AlertTriangle size={16} strokeWidth={2.5} className="mt-0.5 shrink-0 text-black" />
          <span className="font-sans text-[13px] font-bold leading-relaxed text-black">{copy.noGo}</span>
        </div>
      )}

      <ul className="mt-4 grid min-w-0 gap-3">
        {rows.map((row, index) => {
          const state = stateByUnitId.get(row.definition.unitId)
          const activity = state?.activityStatus ?? 'notStarted'
          const highlighted = index === 0 && row.recommended
          return (
            <li key={row.definition.unitId} className="min-w-0">
              <button
                type="button"
                data-testid={`learning-unit-row-${row.definition.unitId}`}
                onClick={() => onOpenUnit(row.definition)}
                className={`neo-learning-press group flex min-h-16 w-full min-w-0 items-center gap-3 p-3 text-left ${
                  highlighted
                    ? 'neo-learning-accent'
                    : 'neo-learning-hover-yellow bg-white'
                }`}
              >
                <UnitTypeMark type={row.definition.type} recommended={highlighted} />
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="break-words font-sans text-[15px] font-bold leading-snug text-black">
                      {row.definition.title}
                    </span>
                    {highlighted && (
                      <span className="neo-learning-label font-sans text-[10px] uppercase tracking-[0.06em]">
                        {copy.recommended}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[11px] font-bold leading-relaxed text-black">
                    <span>{copy.type[row.definition.type]}</span>
                    {row.definition.estimatedMinutes !== undefined && (
                      <span className="inline-flex items-center gap-1">
                        <Clock3 size={11} strokeWidth={1.75} />
                        {copy.duration(row.definition.estimatedMinutes)}
                      </span>
                    )}
                    <span>{`Objective ${row.definition.objectiveIds[0]}`}</span>
                  </span>
                  <span className="mt-0.5 block break-words font-sans text-[11px] font-medium leading-relaxed text-black">
                    {copy.reason[row.reason]}
                  </span>
                </span>
                <span className="hidden shrink-0 sm:block">
                  <ActivityChip language={language} status={activity} />
                </span>
                <ChevronRight size={18} strokeWidth={3} className="shrink-0 text-black transition-transform group-hover:translate-x-0.5" />
              </button>
            </li>
          )
        })}
      </ul>

      {/* Evidenz und Reife bewusst getrennt von der Aktivität (§18): bearbeitete
          Einheiten erzeugen noch keine Mastery-Evidenz. */}
      <div className="mt-4 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 border-t-2 border-black pt-3 font-sans text-[11px] font-bold text-black">
        <span>{copy.evidenceNote}</span>
        <span aria-hidden>·</span>
        <span>{copy.readiness[readiness]}</span>
      </div>
    </motion.section>
  )
}
