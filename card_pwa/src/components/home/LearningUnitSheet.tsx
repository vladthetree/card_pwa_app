/**
 * AI_CONTEXT: Full-list sheet ("Alle Lerneinheiten") of the dedicated SY0-701
 * learning-unit module: all 120 course units grouped by domain → objective with
 * separate activity/evidence labels per §18. Read-only besides navigation —
 * tapping a unit opens its video (free Vorziehen), it never completes anything.
 */
import { useState } from 'react'
import { motion } from '../../ui/motion'
import { X } from 'lucide-react'
import { UI_TOKENS } from '../../constants/ui'
import { SY0_701_OBJECTIVES, SY0_701_ROOT_DECKS } from '../../utils/securityDeckHierarchy'
import {
  buildRequirementCoverage,
  summarizeLeafCoverageByObjective,
  type LearningUnitDefinition,
  type LearningUnitState,
  type ObjectiveEvidenceStatus,
  type ReadinessStatus,
} from '../../utils/learningUnits'
import { SY0701_REQUIREMENTS_MANIFEST } from '../../data/sy0701Requirements'
import type { LearningPacingResult, RankedLearningUnit } from '../../utils/learningUnitRanking'
import type { DraftLearnerExamPlanRecord } from '../../db/learningUnitsDb'
import { LEARNING_UNIT_COPY } from './HomeLearningUnitList'

/** Offiziell gelistete SY0-701-Prüfungssprachen (Deutsch ist keine). */
const EXAM_LANGUAGES = ['en', 'ja', 'pt', 'es', 'th'] as const

export interface LearnerExamPlanDraftFields {
  examLanguage: string
  weeklyMinutesAvailable: number
  learningDaysPerWeek: number
  bufferDays: number
}

// Leaf-Coverage je Objective (§5.1): ohne fachlich freigegebene Coverage-
// Einträge sind alle Leafs offen — die Zahlen zeigen ehrlich die Lücke,
// keine Ressourcensummen. Statisch, da rein aus dem generierten Crosswalk.
const LEAF_COVERAGE_BY_OBJECTIVE = summarizeLeafCoverageByObjective({
  requirements: SY0701_REQUIREMENTS_MANIFEST.requirements,
  report: buildRequirementCoverage({
    sourceSnapshotId: SY0701_REQUIREMENTS_MANIFEST.sourceSnapshotId,
    requirements: SY0701_REQUIREMENTS_MANIFEST.requirements,
    criticalErrorDefinitions: [],
    coverage: [],
    now: 0,
  }),
})

const SHEET_COPY = {
  de: {
    title: 'Alle Lerneinheiten',
    subtitle: (done: number, total: number) => `SY0-701 · ${done} von ${total} bearbeitet`,
    domain: (id: string) => `Domain ${id}`,
    objectiveCount: (done: number, total: number) => `${done}/${total}`,
    evidence: {
      insufficientEvidence: 'Evidenz: unzureichend',
      learning: 'Evidenz: im Aufbau',
      mastered: 'Evidenz: beherrscht',
    } satisfies Record<ObjectiveEvidenceStatus, string>,
    leafLine: (covered: number, total: number, samples: number) =>
      `Leafs ${covered}/${total} nachgewiesen · ${samples} formative Abrufe`,
    honesty: '„Abgeschlossen“ heißt bearbeitet — nicht beherrscht. Mastery entsteht erst aus geprüfter Abruf-Evidenz.',
    close: 'Schließen',
    plan: {
      title: 'Lernplan (Entwurf)',
      examDate: (iso: string | null) => iso ? `Termin ${iso} — aus den Einstellungen` : 'Kein Termin — in den Einstellungen setzen',
      language: 'Prüfungssprache',
      weeklyHours: 'Stunden/Woche',
      learningDays: 'Lerntage/Woche',
      bufferDays: 'Puffertage',
      save: 'Speichern',
      saved: 'Gespeichert',
      pacing: {
        'missing-plan': 'Pacing: Termin oder Wochenbudget fehlt.',
        'past-exam': 'Termin überschritten — Termin aktualisieren.',
        'missing-estimates': 'Dauerschätzungen der Einheiten fehlen noch (Phase 6) — keine Machbarkeitsaussage.',
        'capacity-shortfall': 'Budget reicht nicht — Termin verschieben oder Budget erhöhen.',
        'on-track': 'Machbar im aktuellen Budget.',
      } satisfies Record<LearningPacingResult['reason'], string>,
      perDay: (minutes: number) => `~${minutes} min je Lerntag nötig`,
    },
  },
  en: {
    title: 'All learning units',
    subtitle: (done: number, total: number) => `SY0-701 · ${done} of ${total} worked through`,
    domain: (id: string) => `Domain ${id}`,
    objectiveCount: (done: number, total: number) => `${done}/${total}`,
    evidence: {
      insufficientEvidence: 'Evidence: insufficient',
      learning: 'Evidence: building',
      mastered: 'Evidence: mastered',
    } satisfies Record<ObjectiveEvidenceStatus, string>,
    leafLine: (covered: number, total: number, samples: number) =>
      `Leafs ${covered}/${total} evidenced · ${samples} formative recalls`,
    honesty: '"Completed" means worked through — not mastered. Mastery only comes from verified retrieval evidence.',
    close: 'Close',
    plan: {
      title: 'Study plan (draft)',
      examDate: (iso: string | null) => iso ? `Exam date ${iso} — from settings` : 'No exam date — set it in settings',
      language: 'Exam language',
      weeklyHours: 'Hours/week',
      learningDays: 'Study days/week',
      bufferDays: 'Buffer days',
      save: 'Save',
      saved: 'Saved',
      pacing: {
        'missing-plan': 'Pacing: exam date or weekly budget missing.',
        'past-exam': 'Exam date passed — update it.',
        'missing-estimates': 'Unit duration estimates still missing (phase 6) — no feasibility verdict.',
        'capacity-shortfall': 'Budget insufficient — move the date or raise the budget.',
        'on-track': 'Feasible within the current budget.',
      } satisfies Record<LearningPacingResult['reason'], string>,
      perDay: (minutes: number) => `~${minutes} min per study day needed`,
    },
  },
} as const

interface Props {
  language: 'de' | 'en'
  readiness: ReadinessStatus
  courseCompleted: number
  courseTotal: number
  ranked: RankedLearningUnit[]
  stateByUnitId: ReadonlyMap<string, LearningUnitState>
  objectiveEvidence: ReadonlyMap<string, ObjectiveEvidenceStatus>
  /** Formative Recall-Läufe je Objective (aktuelle Epoch) — keine Mastery. */
  formativeRecallByObjective: ReadonlyMap<string, number>
  plan: DraftLearnerExamPlanRecord | null
  pacing: LearningPacingResult
  /** null = Profil nicht hydratisiert → Editor deaktiviert. */
  onSavePlan: ((fields: LearnerExamPlanDraftFields) => Promise<void>) | null
  onOpenUnit: (definition: LearningUnitDefinition) => void
  onClose: () => void
}

export function LearningUnitSheet({
  language, readiness, courseCompleted, courseTotal,
  ranked, stateByUnitId, objectiveEvidence, formativeRecallByObjective,
  plan, pacing, onSavePlan, onOpenUnit, onClose,
}: Props) {
  const copy = SHEET_COPY[language]
  const listCopy = LEARNING_UNIT_COPY[language]

  // Entwurfsfelder des Lernplans; Vorbelegung = gespeicherter Draft bzw. die
  // Entscheidungen vom 2026-07-18 (Englisch, ~5 h/Woche).
  const [examLanguage, setExamLanguage] = useState(plan?.examLanguage ?? 'en')
  const [weeklyHours, setWeeklyHours] = useState(() => (plan?.weeklyMinutesAvailable ?? 300) / 60)
  const [learningDays, setLearningDays] = useState(plan?.learningDaysPerWeek ?? 6)
  const [bufferDays, setBufferDays] = useState(plan?.bufferDays ?? 0)
  const [planSaveState, setPlanSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  const handleSavePlan = async () => {
    if (!onSavePlan || planSaveState === 'saving') return
    setPlanSaveState('saving')
    try {
      await onSavePlan({
        examLanguage,
        weeklyMinutesAvailable: Math.max(0, Math.round(weeklyHours * 60)),
        learningDaysPerWeek: Math.min(7, Math.max(1, Math.round(learningDays))),
        bufferDays: Math.max(0, Math.round(bufferDays)),
      })
      setPlanSaveState('saved')
    } catch (error) {
      console.error('[LearningUnitSheet] Plan speichern fehlgeschlagen', error)
      setPlanSaveState('idle')
    }
  }

  const unitsByObjective = new Map<string, RankedLearningUnit[]>()
  for (const row of ranked) {
    const objectiveId = row.definition.objectiveIds[0]
    const list = unitsByObjective.get(objectiveId) ?? []
    list.push(row)
    unitsByObjective.set(objectiveId, list)
  }
  // Sheet-Reihenfolge ist die offizielle Kursreihenfolge, nicht der Rang.
  for (const list of unitsByObjective.values()) {
    list.sort((a, b) => a.definition.order - b.definition.order)
  }

  const domains = Object.keys(SY0_701_ROOT_DECKS)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={UI_TOKENS.modal.overlay}
    >
      <button type="button" aria-label={copy.close} className={UI_TOKENS.modal.backdrop} onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        className={`${UI_TOKENS.modal.shell} max-w-2xl overflow-hidden p-5 sm:p-6`}
        data-testid="learning-unit-sheet"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className={UI_TOKENS.modal.title}>{copy.title}</h3>
            <p className={UI_TOKENS.modal.subtitle}>
              {copy.subtitle(courseCompleted, courseTotal)} · {listCopy.readiness[readiness]}
            </p>
          </div>
          <button
            type="button"
            aria-label={copy.close}
            onClick={onClose}
            className="shrink-0 rounded-ds border border-ds-border p-1.5 text-ds-muted transition hover:border-[--brand-primary-50] hover:text-ds-fg"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <p className="mb-3 font-mono text-[11px] leading-relaxed text-ds-muted">{copy.honesty}</p>

        <section className="mb-3 rounded-ds border border-ds-border bg-ds-floor p-2.5">
          <div className="mb-1.5 flex min-w-0 items-baseline justify-between gap-2">
            <h4 className="font-mono text-[11px] uppercase tracking-[0.14em] text-[--brand-primary]">{copy.plan.title}</h4>
            <span className="min-w-0 truncate font-mono text-[10px] text-ds-muted">
              {copy.plan.examDate(plan?.examDateIso ?? null)}
            </span>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-0.5 font-mono text-[10px] text-ds-muted">
              {copy.plan.language}
              <select
                value={examLanguage}
                onChange={event => setExamLanguage(event.target.value)}
                className="rounded-ds border border-ds-border bg-transparent px-1.5 py-1 font-sans text-[12px] text-ds-fg"
              >
                {EXAM_LANGUAGES.map(code => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-0.5 font-mono text-[10px] text-ds-muted">
              {copy.plan.weeklyHours}
              <input
                type="number" min={0} max={80} step={0.5} value={weeklyHours}
                onChange={event => setWeeklyHours(Number(event.target.value))}
                className="w-20 rounded-ds border border-ds-border bg-transparent px-1.5 py-1 font-sans text-[12px] tabular-nums text-ds-fg"
              />
            </label>
            <label className="grid gap-0.5 font-mono text-[10px] text-ds-muted">
              {copy.plan.learningDays}
              <input
                type="number" min={1} max={7} step={1} value={learningDays}
                onChange={event => setLearningDays(Number(event.target.value))}
                className="w-16 rounded-ds border border-ds-border bg-transparent px-1.5 py-1 font-sans text-[12px] tabular-nums text-ds-fg"
              />
            </label>
            <label className="grid gap-0.5 font-mono text-[10px] text-ds-muted">
              {copy.plan.bufferDays}
              <input
                type="number" min={0} max={60} step={1} value={bufferDays}
                onChange={event => setBufferDays(Number(event.target.value))}
                className="w-16 rounded-ds border border-ds-border bg-transparent px-1.5 py-1 font-sans text-[12px] tabular-nums text-ds-fg"
              />
            </label>
            <button
              type="button"
              disabled={!onSavePlan || planSaveState === 'saving'}
              onClick={() => void handleSavePlan()}
              className="ml-auto rounded-ds border border-ds-border px-2.5 py-1 font-sans text-[12px] text-ds-fg transition hover:border-[--brand-primary-50] disabled:opacity-50"
            >
              {planSaveState === 'saved' ? copy.plan.saved : copy.plan.save}
            </button>
          </div>
          <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-ds-muted">
            {copy.plan.pacing[pacing.reason]}
            {pacing.reason === 'on-track' && pacing.requiredMinutesPerLearningDay !== null
              ? ` ${copy.plan.perDay(pacing.requiredMinutesPerLearningDay)}`
              : ''}
          </p>
        </section>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {domains.map(domainId => {
            const objectives = SY0_701_OBJECTIVES.filter(objective => objective.code.startsWith(`${domainId}.`))
            return (
              <section key={domainId} className="mb-4 last:mb-0">
                <h4 className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[--brand-primary]">
                  {copy.domain(domainId)} — {SY0_701_ROOT_DECKS[domainId].domain}
                </h4>
                {objectives.map(objective => {
                  const units = unitsByObjective.get(objective.code) ?? []
                  if (units.length === 0) return null
                  const done = units.filter(
                    unit => stateByUnitId.get(unit.definition.unitId)?.activityStatus === 'completed',
                  ).length
                  const evidence = objectiveEvidence.get(objective.code) ?? 'insufficientEvidence'
                  const leaf = LEAF_COVERAGE_BY_OBJECTIVE.get(objective.code)
                  const samples = formativeRecallByObjective.get(objective.code) ?? 0
                  return (
                    <div key={objective.code} className="mb-2.5 last:mb-0">
                      <div className="flex min-w-0 items-baseline justify-between gap-2 px-0.5">
                        <div className="min-w-0 truncate font-sans text-[13px] font-semibold text-ds-fg">
                          {objective.code} · {objective.title}
                        </div>
                        <div className="flex shrink-0 items-baseline gap-2 font-mono text-[10px] text-ds-muted">
                          <span>{copy.evidence[evidence]}</span>
                          <span className="tabular-nums">{copy.objectiveCount(done, units.length)}</span>
                        </div>
                      </div>
                      <div className="px-0.5 font-mono text-[10px] tabular-nums text-ds-muted">
                        {copy.leafLine(leaf?.coveredLeafs ?? 0, leaf?.totalLeafs ?? 0, samples)}
                      </div>
                      <ul className="mt-1 grid min-w-0 gap-1">
                        {units.map(unit => {
                          const activity = stateByUnitId.get(unit.definition.unitId)?.activityStatus ?? 'notStarted'
                          return (
                            <li key={unit.definition.unitId} className="min-w-0">
                              <button
                                type="button"
                                onClick={() => onOpenUnit(unit.definition)}
                                className="flex w-full min-w-0 items-center gap-2 rounded-ds border border-ds-border bg-ds-floor px-2 py-1.5 text-left transition hover:border-[--brand-primary-50]"
                              >
                                <span className="shrink-0 font-mono text-[10px] tabular-nums text-ds-muted">
                                  {String(unit.definition.order).padStart(3, '0')}
                                </span>
                                <span className="min-w-0 flex-1 truncate font-sans text-[12px] text-ds-fg">
                                  {unit.definition.title}
                                </span>
                                <span
                                  className={`shrink-0 rounded-full border px-1.5 py-px font-mono text-[9px] leading-4 ${
                                    activity === 'completed'
                                      ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                                      : activity === 'inProgress'
                                        ? 'border-[--brand-primary-50] bg-[--brand-primary-08] text-[--brand-primary]'
                                        : 'border-ds-border text-ds-muted'
                                  }`}
                                >
                                  {listCopy.activity[activity]}
                                </span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })}
              </section>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default LearningUnitSheet
