/**
 * AI_CONTEXT: Kompakte Referenz-Kachel des Lerneinheiten-Moduls auf dem
 * Dashboard (Nutzerentscheidung 2026-07-18: Lerneinheiten haben einen eigenen
 * Screen, Home trägt nur die Referenz). Zeigt Phase, Fortschritt, Termin und
 * die nächste Empfehlung — jede Interaktion navigiert in den LearningUnitsView.
 */
import { motion } from '../../ui/motion'
import { ChevronRight, GraduationCap } from 'lucide-react'
import type { LearningPhase, ReadinessStatus } from '../../utils/learningUnits'
import type { RankedLearningUnit } from '../../utils/learningUnitRanking'
import { LEARNING_UNIT_COPY } from './HomeLearningUnitList'

interface Props {
  language: 'de' | 'en'
  phase: LearningPhase
  daysLeft: number | null
  readiness: ReadinessStatus
  courseCompleted: number
  courseTotal: number
  /** Rangliste nur zur Anzeige der Top-Empfehlung — gestartet wird im Screen. */
  ranked: RankedLearningUnit[]
  onOpen: () => void
}

export function HomeLearningUnitsTile({
  language, phase, daysLeft, readiness, courseCompleted, courseTotal, ranked, onOpen,
}: Props) {
  const copy = LEARNING_UNIT_COPY[language]
  const top = ranked.find(row => row.recommended) ?? ranked[0]
  const daysLeftLabel = daysLeft === null
    ? null
    : daysLeft < 0 ? copy.pastExam : daysLeft === 0 ? copy.examToday : copy.daysLeft(daysLeft)

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      data-testid="learning-units-tile"
      className="min-w-0 overflow-hidden rounded-ds border border-ds-border bg-ds-card shadow-card"
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full min-w-0 items-center gap-3 p-3 text-left transition hover:border-[--brand-primary-50] sm:p-4"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ds border border-[--brand-primary-50] bg-[--brand-primary-08] text-[--brand-primary]">
          <GraduationCap size={16} strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-[--brand-primary]">
            {copy.label}
          </span>
          <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-ds-muted">
            <span>{copy.phase[phase]}</span>
            <span aria-hidden>·</span>
            <span>{copy.progress(courseCompleted, courseTotal)}</span>
            {daysLeftLabel && (
              <>
                <span aria-hidden>·</span>
                <span>{daysLeftLabel}</span>
              </>
            )}
            <span aria-hidden>·</span>
            <span>{copy.readiness[readiness]}</span>
          </span>
          {top && (
            <span className="mt-1 block truncate font-sans text-[13px] font-semibold leading-tight text-ds-fg">
              {top.definition.title}
            </span>
          )}
        </span>
        <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-ds-muted" />
      </button>
    </motion.section>
  )
}
