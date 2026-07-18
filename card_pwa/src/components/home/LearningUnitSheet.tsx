/**
 * AI_CONTEXT: Full-list sheet ("Alle Lerneinheiten") of the dedicated SY0-701
 * learning-unit module: all 120 course units grouped by domain → objective with
 * separate activity/evidence labels per §18. Read-only besides navigation —
 * tapping a unit opens its video (free Vorziehen), it never completes anything.
 */
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
import type { RankedLearningUnit } from '../../utils/learningUnitRanking'
import { LEARNING_UNIT_COPY } from './HomeLearningUnitList'

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
  onOpenUnit: (definition: LearningUnitDefinition) => void
  onClose: () => void
}

export function LearningUnitSheet({
  language, readiness, courseCompleted, courseTotal,
  ranked, stateByUnitId, objectiveEvidence, formativeRecallByObjective, onOpenUnit, onClose,
}: Props) {
  const copy = SHEET_COPY[language]
  const listCopy = LEARNING_UNIT_COPY[language]

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
