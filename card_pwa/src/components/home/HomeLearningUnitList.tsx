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
import type { RankedLearningUnit } from '../../utils/learningUnitRanking'
import type { ActiveUnitCardProgress } from '../../hooks/home/useLearningUnits'
import { LEARNING_UNIT_COPY } from './learningUnitCopy'

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
  activeCardProgressByUnitId?: ReadonlyMap<string, ActiveUnitCardProgress>
  /** Öffnet die Einheit (Course → Video in der Lernvideos-Ansicht). */
  onOpenUnit: (definition: LearningUnitDefinition) => void
  /** Öffnet die Vollliste; ohne Callback entfällt der Button (z. B. im
   *  LearningUnitsView, wo die Vollliste direkt darunter steht). */
  onShowAll?: () => void
}

function ActivityChip({ language, status }: { language: 'de' | 'en'; status: 'notStarted' | 'inProgress' | 'completed' }) {
  const copy = LEARNING_UNIT_COPY[language]
  const tone = status === 'completed'
    ? 'border-black bg-[#86EFAC] text-black'
    : status === 'inProgress'
      ? 'border-black bg-[#FDBA74] text-black'
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
  ranked, stateByUnitId, activeCardProgressByUnitId, onOpenUnit, onShowAll,
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

      <div
        data-testid="learning-unit-completion-rule"
        className="neo-learning-note mt-4 px-3 py-2.5 font-sans text-[11px] font-bold leading-relaxed text-black"
      >
        {copy.completionRule}
      </div>

      <ul className="mt-4 grid min-w-0 gap-3">
        {rows.map((row, index) => {
          const state = stateByUnitId.get(row.definition.unitId)
          const activity = state?.activityStatus ?? 'notStarted'
          const activeCardProgress = activeCardProgressByUnitId?.get(row.definition.unitId)
          const highlighted = index === 0 && row.recommended
          const rowTone = activity === 'completed'
            ? 'bg-[#86EFAC]'
            : activity === 'inProgress'
              ? 'bg-[#FDBA74]'
              : highlighted
                ? 'neo-learning-accent'
                : 'neo-learning-hover-yellow bg-white'
          return (
            <li key={row.definition.unitId} className="min-w-0">
              <button
                type="button"
                data-testid={`learning-unit-row-${row.definition.unitId}`}
                onClick={() => onOpenUnit(row.definition)}
                className={`neo-learning-press group flex min-h-16 w-full min-w-0 items-center gap-3 p-3 text-left ${rowTone}`}
              >
                <UnitTypeMark
                  type={row.definition.type}
                  recommended={highlighted && activity === 'notStarted'}
                />
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
                    <ActivityChip language={language} status={activity} />
                  </span>
                  <span className="mt-0.5 block break-words font-sans text-[11px] font-medium leading-relaxed text-black">
                    {copy.reason[row.reason]}
                  </span>
                  {state && (
                    <span className="mt-0.5 block break-words font-sans text-[11px] font-bold leading-relaxed text-black">
                      {activity === 'completed'
                        ? copy.completedDetail[row.definition.type]
                        : activity === 'inProgress'
                          ? copy.currentStep[state.currentStep]
                          : null}
                    </span>
                  )}
                  {activity === 'inProgress' && activeCardProgress && (
                    <span className="mt-0.5 block break-words font-sans text-[11px] font-bold leading-relaxed text-black">
                      {copy.activeCardProgress(activeCardProgress.reviewed, activeCardProgress.total)}
                    </span>
                  )}
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
