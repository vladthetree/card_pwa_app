/**
 * AI_CONTEXT: Vollbild-Ansicht des dedizierten SY0-701-Lerneinheiten-Systems
 * (Nutzerentscheidung 2026-07-18: eigener Screen, das Dashboard trägt nur die
 * Referenz-Kachel). Enthält Lernplan-Editor, Empfehlungsliste und die Vollliste
 * aller Units gruppiert Domain → Objective mit Leaf-Coverage; Aktivität,
 * Evidenz und Reife bleiben getrennt beschriftet (§18). Startet Units exakt:
 * Course → Video/Recall/Karten, Review → eingefrorene Karten-Session.
 */
import { useState } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import { useSettings } from '../contexts/SettingsContext'
import { profileScopeId } from '../services/profileService'
import { useTodayPackage } from '../hooks/home/useTodayPackage'
import { useLearningUnits } from '../hooks/home/useLearningUnits'
import { HomeLearningUnitList, LEARNING_UNIT_COPY } from './home/HomeLearningUnitList'
import { SY0_701_OBJECTIVES, SY0_701_ROOT_DECKS, getSecurityObjectiveDeckId, getSecurityObjectiveDeckName } from '../utils/securityDeckHierarchy'
import {
  buildRequirementCoverage,
  summarizeLeafCoverageByObjective,
  type LearningUnitDefinition,
  type ObjectiveEvidenceStatus,
} from '../utils/learningUnits'
import { SY0701_REQUIREMENTS_MANIFEST } from '../data/sy0701Requirements'
import type { LearningPacingResult, RankedLearningUnit } from '../utils/learningUnitRanking'
import { abortReviewUnit, startOrResumeCourseUnit, startOrResumeReviewUnit } from '../services/learningUnitRunner'
import { saveDraftLearnerExamPlan } from '../db/queries/learningUnits'
import type { Deck } from '../types'

/** Offiziell gelistete SY0-701-Prüfungssprachen (Deutsch ist keine). */
const EXAM_LANGUAGES = ['en', 'ja', 'pt', 'es', 'th'] as const

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

const VIEW_COPY = {
  de: {
    title: 'Lerneinheiten',
    subtitle: (done: number, total: number) => `SY0-701 · ${done} von ${total} bearbeitet`,
    back: 'Zurück',
    loading: 'Lade Lerneinheiten …',
    unavailable: 'Kurskatalog nicht verfügbar (offline ohne Daten?).',
    allUnits: 'Alle Einheiten',
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
    abortReview: 'Wiederholung abbrechen',
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
    title: 'Learning units',
    subtitle: (done: number, total: number) => `SY0-701 · ${done} of ${total} worked through`,
    back: 'Back',
    loading: 'Loading learning units …',
    unavailable: 'Course catalog unavailable (offline without data?).',
    allUnits: 'All units',
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
    abortReview: 'Abort review',
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
  onExit: () => void
  onStartStudy: (deck: Deck, cardIds?: string[], options?: { sessionId?: string; allowResume?: boolean }) => void
  onOpenVideoAtIndex: (videoIndex: number, openRecall: boolean) => void
}

export default function LearningUnitsView({ onExit, onStartStudy, onOpenVideoAtIndex }: Props) {
  const { settings, profile, isProfileHydrated } = useSettings()
  const copy = VIEW_COPY[settings.language]
  const listCopy = LEARNING_UNIT_COPY[settings.language]

  const todayPackage = useTodayPackage({
    nextDayStartsAt: settings.nextDayStartsAt,
    packageCardLimit: settings.newCardsPerDay,
  })
  const profileId = isProfileHydrated ? profileScopeId(profile) : null
  const learningUnits = useLearningUnits({
    catalog: todayPackage.catalog,
    catalogLoading: todayPackage.loading,
    profileId,
    examDateIso: settings.examDateIso,
    nextDayStartsAt: settings.nextDayStartsAt,
    learnAheadMinutes: settings.learnAheadMinutes,
  })
  const { plan, pacing } = learningUnits

  // Entwurfsfelder des Lernplans; Vorbelegung = gespeicherter Draft bzw. die
  // Entscheidungen vom 2026-07-18 (Englisch, ~5 h/Woche).
  const [examLanguage, setExamLanguage] = useState(plan?.examLanguage ?? 'en')
  const [weeklyHours, setWeeklyHours] = useState(() => (plan?.weeklyMinutesAvailable ?? 300) / 60)
  const [learningDays, setLearningDays] = useState(plan?.learningDaysPerWeek ?? 6)
  const [bufferDays, setBufferDays] = useState(plan?.bufferDays ?? 0)
  const [planSaveState, setPlanSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  // Sobald der gespeicherte Draft nachlädt, einmalig in die Felder übernehmen.
  const [hydratedPlanKey, setHydratedPlanKey] = useState<number | null>(null)
  if (plan && hydratedPlanKey !== plan.updatedAt) {
    setHydratedPlanKey(plan.updatedAt)
    setExamLanguage(plan.examLanguage ?? 'en')
    setWeeklyHours((plan.weeklyMinutesAvailable ?? 300) / 60)
    setLearningDays(plan.learningDaysPerWeek ?? 6)
    setBufferDays(plan.bufferDays ?? 0)
  }

  const handleSavePlan = async () => {
    if (profileId === null || planSaveState === 'saving') return
    setPlanSaveState('saving')
    try {
      await saveDraftLearnerExamPlan({
        profileId,
        now: Date.now(),
        examLanguage,
        weeklyMinutesAvailable: Math.max(0, Math.round(weeklyHours * 60)),
        learningDaysPerWeek: Math.min(7, Math.max(1, Math.round(learningDays))),
        bufferDays: Math.max(0, Math.round(bufferDays)),
      })
      learningUnits.reload()
      setPlanSaveState('saved')
    } catch (error) {
      console.error('[LearningUnitsView] Plan speichern fehlgeschlagen', error)
      setPlanSaveState('idle')
    }
  }

  const handleOpenUnit = async (definition: LearningUnitDefinition) => {
    if (definition.type === 'review') {
      if (profileId === null) return
      try {
        const launch = await startOrResumeReviewUnit({
          profileId,
          definition,
          settings: {
            reviewCardLimit: settings.studyCardLimit ?? 0,
            nextDayStartsAt: settings.nextDayStartsAt,
            learnAheadMinutes: settings.learnAheadMinutes,
          },
        })
        learningUnits.reload()
        if (!launch || launch.remainingCardIds.length === 0) return
        const objectiveId = definition.objectiveIds[0]
        onStartStudy(
          {
            id: getSecurityObjectiveDeckId(objectiveId),
            name: getSecurityObjectiveDeckName(objectiveId),
            total: launch.remainingCardIds.length,
            new: 0,
            learning: 0,
            due: 0,
          },
          launch.remainingCardIds,
          { sessionId: `unit-exec:${launch.execution.executionId}`, allowResume: true },
        )
      } catch (error) {
        console.error('[LearningUnitsView] Review-Unit-Start fehlgeschlagen', error)
      }
      return
    }
    if (definition.type !== 'course' || definition.videoIndex === undefined) return
    const videoIndex = definition.videoIndex
    if (profileId === null) {
      onOpenVideoAtIndex(videoIndex, false)
      return
    }
    try {
      const launch = await startOrResumeCourseUnit({
        profileId,
        definition,
        settings: {
          packageCardLimit: settings.newCardsPerDay,
          nextDayStartsAt: settings.nextDayStartsAt,
          learnAheadMinutes: settings.learnAheadMinutes,
          recallCheckSize: settings.recallCheckSize,
          algorithm: settings.algorithm,
        },
      })
      learningUnits.reload()
      if (launch.step === 'cards' && launch.remainingCardIds.length > 0) {
        const objectiveId = definition.objectiveIds[0]
        onStartStudy(
          {
            id: getSecurityObjectiveDeckId(objectiveId),
            name: getSecurityObjectiveDeckName(objectiveId),
            total: launch.remainingCardIds.length,
            new: 0,
            learning: 0,
            due: 0,
          },
          launch.remainingCardIds,
          // Session per Execution persistieren (§16): parallele Units bleiben
          // getrennt und eine unterbrochene Karten-Session ist wiederaufnehmbar.
          { sessionId: `unit-exec:${launch.execution.executionId}`, allowResume: true },
        )
        return
      }
      onOpenVideoAtIndex(videoIndex, launch.step === 'recall')
    } catch (error) {
      // Startfehler darf die Navigation nicht blockieren — Video read-only öffnen.
      console.error('[LearningUnitsView] Lerneinheit-Start fehlgeschlagen', error)
      onOpenVideoAtIndex(videoIndex, false)
    }
  }

  const handleAbortReviewUnit = async (definition: LearningUnitDefinition) => {
    if (profileId === null) return
    try {
      await abortReviewUnit({ profileId, unitId: definition.unitId })
    } catch (error) {
      console.error('[LearningUnitsView] Review-Abbruch fehlgeschlagen', error)
    }
    learningUnits.reload()
  }

  const unitsByObjective = new Map<string, RankedLearningUnit[]>()
  for (const row of learningUnits.ranked) {
    const objectiveId = row.definition.objectiveIds[0]
    const list = unitsByObjective.get(objectiveId) ?? []
    list.push(row)
    unitsByObjective.set(objectiveId, list)
  }
  // Listenreihenfolge ist die offizielle Kursreihenfolge, nicht der Rang.
  for (const list of unitsByObjective.values()) {
    list.sort((a, b) => a.definition.order - b.definition.order)
  }
  const domains = Object.keys(SY0_701_ROOT_DECKS)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-ds-border px-4 pb-3 pt-safe-2">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onExit} className="ds-icon-button flex h-11 w-11 shrink-0" aria-label={copy.back}>
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[22px] font-bold leading-tight text-ds-fg">{copy.title}</div>
            <div className="truncate font-mono text-[12px] text-ds-muted">
              {copy.subtitle(learningUnits.courseCompleted, learningUnits.courseTotal)} · {listCopy.readiness[learningUnits.readiness]}
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3" data-study-scroll="allow">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 pb-safe-2">
          <p className="font-mono text-[11px] leading-relaxed text-ds-muted">{copy.honesty}</p>

          <section className="rounded-ds border border-ds-border bg-ds-floor p-2.5">
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
                disabled={profileId === null || planSaveState === 'saving'}
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

          {learningUnits.loading && (
            <p className="font-mono text-[12px] text-ds-muted">{copy.loading}</p>
          )}
          {!learningUnits.loading && !learningUnits.available && (
            <p className="font-mono text-[12px] text-ds-muted">{copy.unavailable}</p>
          )}

          {learningUnits.available && learningUnits.ranked.length > 0 && (
            <HomeLearningUnitList
              language={settings.language}
              phase={learningUnits.phase}
              daysLeft={learningUnits.daysLeft}
              readiness={learningUnits.readiness}
              courseCompleted={learningUnits.courseCompleted}
              courseTotal={learningUnits.courseTotal}
              ranked={learningUnits.ranked}
              stateByUnitId={learningUnits.stateByUnitId}
              onOpenUnit={handleOpenUnit}
            />
          )}

          {learningUnits.available && (
            <section data-testid="learning-units-full-list">
              <h3 className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ds-muted">{copy.allUnits}</h3>
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
                        unit => learningUnits.stateByUnitId.get(unit.definition.unitId)?.activityStatus === 'completed',
                      ).length
                      const evidence = learningUnits.objectiveEvidence.get(objective.code) ?? 'insufficientEvidence'
                      const leaf = LEAF_COVERAGE_BY_OBJECTIVE.get(objective.code)
                      const samples = learningUnits.formativeRecallByObjective.get(objective.code) ?? 0
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
                              const activity = learningUnits.stateByUnitId.get(unit.definition.unitId)?.activityStatus ?? 'notStarted'
                              const abortable = unit.definition.type === 'review' && activity === 'inProgress'
                              return (
                                <li key={unit.definition.unitId} className="flex min-w-0 items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => void handleOpenUnit(unit.definition)}
                                    className="flex w-full min-w-0 flex-1 items-center gap-2 rounded-ds border border-ds-border bg-ds-floor px-2 py-1.5 text-left transition hover:border-[--brand-primary-50]"
                                  >
                                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-ds-muted">
                                      {unit.definition.type === 'review' ? 'REV' : String(unit.definition.order).padStart(3, '0')}
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
                                  {abortable && (
                                    <button
                                      type="button"
                                      aria-label={copy.abortReview}
                                      title={copy.abortReview}
                                      data-testid={`learning-unit-abort-${unit.definition.unitId}`}
                                      onClick={() => void handleAbortReviewUnit(unit.definition)}
                                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-ds border border-ds-border text-ds-muted transition hover:border-red-400/50 hover:text-red-300"
                                    >
                                      <X size={13} strokeWidth={2} />
                                    </button>
                                  )}
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
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
