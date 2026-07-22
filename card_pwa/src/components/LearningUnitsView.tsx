/**
 * AI_CONTEXT: Vollbild-Ansicht des dedizierten SY0-701-Lerneinheiten-Systems
 * (Nutzerentscheidung 2026-07-18: eigener Screen, das Dashboard trägt nur die
 * Referenz-Kachel). Enthält Lernplan-Editor, Empfehlungsliste und die Vollliste
 * aller Units gruppiert Domain → Objective mit Leaf-Coverage; Aktivität,
 * Evidenz und Reife bleiben getrennt beschriftet (§18). Startet Units exakt:
 * Course → Video/Recall/Karten, Review → eingefrorene Karten-Session.
 */
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChevronDown, Route, X } from 'lucide-react'
import { useSettings } from '../contexts/SettingsContext'
import { profileScopeId } from '../services/profileService'
import { useTodayPackage } from '../hooks/home/useTodayPackage'
import { useLearningUnits } from '../hooks/home/useLearningUnits'
import { HomeLearningUnitList, LEARNING_UNIT_COPY } from './home/HomeLearningUnitList'
import {
  LearningPlanPanel,
  buildLearningPlanFormValues,
  learningPlanFormValuesEqual,
  normalizeLearningPlanFormValues,
  type LearningPlanField,
  type LearningPlanFormValues,
} from './LearningPlanPanel'
import { SY0_701_OBJECTIVES, SY0_701_ROOT_DECKS, getSecurityObjectiveDeckId, getSecurityObjectiveDeckName } from '../utils/securityDeckHierarchy'
import {
  objectiveIdOfDeckId,
  summarizeLeafCoverageByObjective,
  type ExamRequirement,
  type LearningUnitDefinition,
  type ObjectiveEvidenceStatus,
} from '../utils/learningUnits'
import { SY0701_REQUIREMENTS_MANIFEST } from '../data/sy0701Requirements'
import { SY0701_COVERAGE_SUMMARY } from '../data/sy0701Coverage'
import {
  computeDraftPacing,
  computeExamTimeline,
  type LearningPacingResult,
  type RankedLearningUnit,
} from '../utils/learningUnitRanking'
import { abortReviewUnit, startOrResumeCourseUnit, startOrResumeReviewUnit } from '../services/learningUnitRunner'
import { saveDraftLearnerExamPlan } from '../db/queries/learningUnits'
import { toast } from '../hooks/useToast'
import type { Deck } from '../types'

// Kompakte Runtime-Projektion desselben durch buildRequirementCoverage
// erzeugten Reports. Keine lokale Ersatz-Coverage und keine Ressourcenzählung.
const LEAF_COVERAGE_BY_OBJECTIVE = summarizeLeafCoverageByObjective({
  requirements: SY0701_REQUIREMENTS_MANIFEST.requirements,
  report: {
    sourceSnapshotId: SY0701_COVERAGE_SUMMARY.sourceSnapshotId,
    requirementCount: SY0701_COVERAGE_SUMMARY.requirementCount,
    coveredCount: SY0701_COVERAGE_SUMMARY.coveredCount,
    byRequirementId: {},
    blockingRequirementIds: [...SY0701_COVERAGE_SUMMARY.blockingRequirementIds],
    generatedAt: SY0701_COVERAGE_SUMMARY.generatedAt,
  },
})
const REQUIREMENT_BY_ID = new Map(
  SY0701_REQUIREMENTS_MANIFEST.requirements.map(requirement => [requirement.requirementId, requirement]),
)
const MISSING_PRACTICAL_BY_OBJECTIVE = new Map<string, ExamRequirement[]>()
for (const requirementId of SY0701_COVERAGE_SUMMARY.missingPracticalRequirementIds) {
  const requirement = REQUIREMENT_BY_ID.get(requirementId)
  if (!requirement) continue
  const list = MISSING_PRACTICAL_BY_OBJECTIVE.get(requirement.objectiveId) ?? []
  list.push(requirement)
  MISSING_PRACTICAL_BY_OBJECTIVE.set(requirement.objectiveId, list)
}

const VIEW_COPY = {
  de: {
    title: 'Lerneinheiten',
    subtitle: (done: number, total: number) => `SY0-701 · ${done} von ${total} bearbeitet`,
    back: 'Zurück',
    loading: 'Lade Lerneinheiten …',
    unavailable: 'Kurskatalog nicht verfügbar (offline ohne Daten?).',
    allUnits: 'Alle Einheiten',
    pathHint: 'Fokuspfad · Domain wählen',
    domainNav: 'Prüfungsdomain auswählen',
    domain: (id: string) => `Domain ${id}`,
    domainShort: (id: string) => `D${id}`,
    unitCount: (done: number, total: number) => `${done}/${total} erledigt`,
    cardCount: (reviewed: number, total: number) => `${reviewed}/${total} Karten bearbeitet`,
    subDeck: (objective: string, sources: string[]) => sources.length > 0
      ? `Subdeck ${objective} · Karten aus ${sources.join(', ')}`
      : `Subdeck ${objective}`,
    expandObjective: (code: string) => `Objective ${code} öffnen`,
    collapseObjective: (code: string) => `Objective ${code} schließen`,
    objectiveCount: (done: number, total: number) => `${done}/${total}`,
    evidence: {
      insufficientEvidence: 'Evidenz: unzureichend',
      learning: 'Evidenz: im Aufbau',
      mastered: 'Evidenz: beherrscht',
    } satisfies Record<ObjectiveEvidenceStatus, string>,
    leafLine: (covered: number, total: number, samples: number) =>
      `Leafs ${covered}/${total} nachgewiesen · ${samples} formative Abrufe`,
    coverageSummary: (covered: number, total: number, practiceGaps: number) =>
      `Fachlich vollständig: ${covered}/${total} Leafs · ${practiceGaps} offene Praxispfade`,
    practiceGaps: (count: number) => `${count} szenariobasierte Anforderungen ohne gemapptes Praxis-Item`,
    honesty: '„Abgeschlossen“ heißt bearbeitet — nicht beherrscht. Mastery entsteht erst aus geprüfter Abruf-Evidenz.',
    abortReview: 'Wiederholung abbrechen',
    reviewEmpty: 'Nichts zu wiederholen — in diesem Objective sind keine Karten fällig und keine Fehler ungelöst.',
    reviewStartFailed: 'Wiederholung konnte nicht gestartet werden.',
    plan: {
      title: 'Lernplan (Entwurf)',
      examDate: (iso: string | null) => iso ? `Termin ${iso} — aus den Einstellungen` : 'Kein Termin — in den Einstellungen setzen',
      language: 'Prüfungssprache',
      weeklyHours: 'Stunden/Woche',
      learningDays: 'Lerntage/Woche',
      bufferDays: 'Puffertage',
      save: 'Speichern',
      saved: 'Gespeichert',
      saveFailed: 'Der Lernplan konnte nicht gespeichert werden. Bitte erneut versuchen.',
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
    pathHint: 'Focus path · choose a domain',
    domainNav: 'Choose exam domain',
    domain: (id: string) => `Domain ${id}`,
    domainShort: (id: string) => `D${id}`,
    unitCount: (done: number, total: number) => `${done}/${total} done`,
    cardCount: (reviewed: number, total: number) => `${reviewed}/${total} cards reviewed`,
    subDeck: (objective: string, sources: string[]) => sources.length > 0
      ? `Subdeck ${objective} · cards from ${sources.join(', ')}`
      : `Subdeck ${objective}`,
    expandObjective: (code: string) => `Open objective ${code}`,
    collapseObjective: (code: string) => `Close objective ${code}`,
    objectiveCount: (done: number, total: number) => `${done}/${total}`,
    evidence: {
      insufficientEvidence: 'Evidence: insufficient',
      learning: 'Evidence: building',
      mastered: 'Evidence: mastered',
    } satisfies Record<ObjectiveEvidenceStatus, string>,
    leafLine: (covered: number, total: number, samples: number) =>
      `Leafs ${covered}/${total} evidenced · ${samples} formative recalls`,
    coverageSummary: (covered: number, total: number, practiceGaps: number) =>
      `Fully evidenced: ${covered}/${total} leaves · ${practiceGaps} open practical paths`,
    practiceGaps: (count: number) => `${count} scenario requirements without a mapped practical item`,
    honesty: '"Completed" means worked through — not mastered. Mastery only comes from verified retrieval evidence.',
    abortReview: 'Abort review',
    reviewEmpty: 'Nothing to review — no cards due and no unresolved errors in this objective.',
    reviewStartFailed: 'Could not start the review.',
    plan: {
      title: 'Study plan (draft)',
      examDate: (iso: string | null) => iso ? `Exam date ${iso} — from settings` : 'No exam date — set it in settings',
      language: 'Exam language',
      weeklyHours: 'Hours/week',
      learningDays: 'Study days/week',
      bufferDays: 'Buffer days',
      save: 'Save',
      saved: 'Saved',
      saveFailed: 'The study plan could not be saved. Please try again.',
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
  /** Nur im Vollbild-Modus (mit eigenem Header) nötig. */
  onExit?: () => void
  onStartStudy: (deck: Deck, cardIds?: string[], options?: { sessionId?: string; allowResume?: boolean; returnToUnits?: boolean }) => void
  onOpenVideoAtIndex: (videoIndex: number, openRecall: boolean) => void
  /** Lab-Unit → Labs-Ansicht direkt beim Szenario (Deep Link, §13). */
  onOpenLabScenario: (scenarioId: string) => void
  /** Als Home-Modus unter der Homebar gerendert: kein eigener Header/Zurück-
   *  Pfeil, kompakte Titelzeile im Inhalt (Nutzerentscheidung 2026-07-19). */
  embedded?: boolean
}

export default function LearningUnitsView({ onExit, onStartStudy, onOpenVideoAtIndex, onOpenLabScenario, embedded = false }: Props) {
  const { settings, profile, isProfileHydrated, setExamDateIso } = useSettings()
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
    examDateUpdatedAt: settings.examDateUpdatedAt,
    nextDayStartsAt: settings.nextDayStartsAt,
    learnAheadMinutes: settings.learnAheadMinutes,
  })
  const { plan, pacing } = learningUnits

  // Der Settings-Termin ist der profilgesyncte Primärpfad. Der Plantermin ist
  // nur Fallback für ältere/restaurierte Drafts und wird beim Speichern wieder
  // in beide Pfade geschrieben.
  const storedPlanValues = useMemo(() => buildLearningPlanFormValues({
    examDateIso: learningUnits.effectiveExamDateIso,
    examLanguage: plan?.examLanguage,
    weeklyMinutesAvailable: plan?.weeklyMinutesAvailable,
    learningDaysPerWeek: plan?.learningDaysPerWeek,
    bufferDays: plan?.bufferDays,
  }), [
    learningUnits.effectiveExamDateIso,
    plan?.bufferDays,
    plan?.examLanguage,
    plan?.learningDaysPerWeek,
    plan?.weeklyMinutesAvailable,
  ])
  const [planEditorOpen, setPlanEditorOpen] = useState(false)
  const [planBaseline, setPlanBaseline] = useState<LearningPlanFormValues>(storedPlanValues)
  const [planDraft, setPlanDraft] = useState<LearningPlanFormValues>(storedPlanValues)
  const [planSaving, setPlanSaving] = useState(false)
  const [planSaveError, setPlanSaveError] = useState<string | null>(null)
  const planDirty = !learningPlanFormValuesEqual(planBaseline, planDraft)

  useEffect(() => {
    if (planEditorOpen || planSaving) return
    setPlanBaseline(storedPlanValues)
    setPlanDraft(storedPlanValues)
  }, [planEditorOpen, planSaving, storedPlanValues])

  const previewPacing = useMemo<LearningPacingResult>(() => {
    const normalized = normalizeLearningPlanFormValues(planDraft)
    if (!normalized) return computeDraftPacing({ daysLeft: null })
    const timeline = computeExamTimeline({ examDateIso: normalized.examDateIso, now: Date.now() })
    return computeDraftPacing({
      daysLeft: timeline.daysLeft,
      plan: normalized,
      workload: pacing.workload,
    })
  }, [pacing.workload, planDraft])

  const handleOpenPlan = () => {
    setPlanBaseline(storedPlanValues)
    setPlanDraft(storedPlanValues)
    setPlanSaveError(null)
    setPlanEditorOpen(true)
  }

  const handlePlanChange = (field: LearningPlanField, value: string) => {
    setPlanSaveError(null)
    setPlanDraft(current => ({ ...current, [field]: value }))
  }

  const handleSavePlan = async () => {
    if (profileId === null || planSaving) return
    const normalized = normalizeLearningPlanFormValues(planDraft)
    if (!normalized) return
    setPlanSaving(true)
    setPlanSaveError(null)
    try {
      await saveDraftLearnerExamPlan({
        profileId,
        now: Date.now(),
        examDateIso: normalized.examDateIso,
        uiLanguage: settings.language,
        examLanguage: normalized.examLanguage,
        weeklyMinutesAvailable: normalized.weeklyMinutesAvailable,
        learningDaysPerWeek: normalized.learningDaysPerWeek,
        bufferDays: normalized.bufferDays,
      })
      // Settings ist der geräte-/profilsynchrone Terminpfad. Auch ein bewusstes
      // Löschen muss dort einen updatedAt erhalten, wenn nur ein alter Planwert
      // existierte.
      if (
        settings.examDateIso !== normalized.examDateIso ||
        (settings.examDateUpdatedAt === null && (plan?.examDateIso ?? null) !== normalized.examDateIso)
      ) {
        setExamDateIso(normalized.examDateIso)
      }
      setPlanBaseline(planDraft)
      learningUnits.reload()
      setPlanEditorOpen(false)
      toast.success(copy.plan.saved)
    } catch (error) {
      console.error('[LearningUnitsView] Plan speichern fehlgeschlagen', error)
      setPlanSaveError(copy.plan.saveFailed)
      toast.error(copy.plan.saveFailed)
    } finally {
      setPlanSaving(false)
    }
  }

  const handleOpenUnit = async (definition: LearningUnitDefinition) => {
    if (definition.type === 'lab') {
      // Versuch startet beim Öffnen des Szenarios in der Labs-Ansicht (§13.2).
      if (definition.labScenarioId) onOpenLabScenario(definition.labScenarioId)
      return
    }
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
        if (!launch || launch.remainingCardIds.length === 0) {
          // Ohne Feedback wirkte der Tap „tot" — ehrlich sagen, dass die
          // eingefrorene Auswahl leer wäre (nichts fällig, keine Fehler offen).
          toast.show(copy.reviewEmpty, 'info')
          return
        }
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
          { sessionId: `unit-exec:${launch.execution.executionId}`, allowResume: true, returnToUnits: true },
        )
      } catch (error) {
        console.error('[LearningUnitsView] Review-Unit-Start fehlgeschlagen', error)
        toast.error(copy.reviewStartFailed)
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
          { sessionId: `unit-exec:${launch.execution.executionId}`, allowResume: true, returnToUnits: true },
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
  const preferredObjectiveId = (
    learningUnits.ranked.find(row => row.recommended) ?? learningUnits.ranked[0]
  )?.definition.objectiveIds[0] ?? null
  const [selectedDomainId, setSelectedDomainId] = useState(domains[0] ?? '1')
  const [expandedObjectiveId, setExpandedObjectiveId] = useState<string | null>(null)
  const [pathInitialized, setPathInitialized] = useState(false)

  useEffect(() => {
    if (pathInitialized || !preferredObjectiveId) return
    setSelectedDomainId(preferredObjectiveId.split('.')[0])
    setExpandedObjectiveId(preferredObjectiveId)
    setPathInitialized(true)
  }, [pathInitialized, preferredObjectiveId])

  const domainSummaries = domains.map(domainId => {
    const objectiveIds = SY0_701_OBJECTIVES
      .filter(objective => objective.code.startsWith(`${domainId}.`))
      .map(objective => objective.code)
    const units = objectiveIds.flatMap(objectiveId => unitsByObjective.get(objectiveId) ?? [])
    const done = units.filter(
      unit => learningUnits.stateByUnitId.get(unit.definition.unitId)?.activityStatus === 'completed',
    ).length
    return { domainId, done, total: units.length }
  })

  const selectDomain = (domainId: string) => {
    setSelectedDomainId(domainId)
    const domainObjectives = SY0_701_OBJECTIVES.filter(
      objective => objective.code.startsWith(`${domainId}.`) && (unitsByObjective.get(objective.code)?.length ?? 0) > 0,
    )
    const nextObjective = preferredObjectiveId?.startsWith(`${domainId}.`)
      ? preferredObjectiveId
      : domainObjectives[0]?.code ?? null
    setExpandedObjectiveId(nextObjective)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!embedded && (
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
      )}

      <div className={`min-h-0 flex-1 overflow-y-auto ${embedded ? 'px-0 py-1' : 'px-4 py-3'}`} data-study-scroll="allow">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 pb-safe-2">
          {embedded && (
            <div className="truncate px-0.5 font-mono text-[12px] text-ds-muted" data-testid="learning-units-embedded-subtitle">
              {copy.subtitle(learningUnits.courseCompleted, learningUnits.courseTotal)} · {listCopy.readiness[learningUnits.readiness]}
            </div>
          )}
          <p className="font-mono text-[11px] leading-relaxed text-ds-muted">{copy.honesty}</p>
          <div
            className="rounded-ds border border-amber-400/35 bg-amber-400/10 px-3 py-2 font-mono text-[11px] leading-relaxed text-amber-100"
            data-testid="learning-units-coverage-summary"
          >
            {copy.coverageSummary(
              SY0701_COVERAGE_SUMMARY.coveredCount,
              SY0701_COVERAGE_SUMMARY.requirementCount,
              SY0701_COVERAGE_SUMMARY.missingPracticalRequirementIds.length,
            )}
          </div>

          <LearningPlanPanel
            language={settings.language}
            summaryValues={planBaseline}
            values={planDraft}
            pacing={pacing}
            previewPacing={previewPacing}
            contentProgress={learningUnits.contentMapping.summary}
            open={planEditorOpen}
            dirty={planDirty}
            saving={planSaving}
            saveError={planSaveError}
            configured={plan !== null}
            collapseSignal={plan?.updatedAt ?? 0}
            onOpen={handleOpenPlan}
            onChange={handlePlanChange}
            onSave={() => void handleSavePlan()}
            onClose={() => {
              setPlanEditorOpen(false)
              setPlanDraft(planBaseline)
              setPlanSaveError(null)
            }}
          />

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
            <section data-testid="learning-units-full-list" className="rounded-ds border border-ds-border bg-ds-card p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ds border border-[--brand-primary-50] bg-[--brand-primary-08] text-[--brand-primary]">
                  <Route size={16} strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-sans text-[15px] font-semibold text-ds-fg">{copy.allUnits}</h3>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ds-muted">{copy.pathHint}</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-5 gap-1.5" role="tablist" aria-label={copy.domainNav}>
                {domainSummaries.map(summary => {
                  const active = summary.domainId === selectedDomainId
                  return (
                    <button
                      key={summary.domainId}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      aria-controls={`learning-domain-${summary.domainId}`}
                      onClick={() => selectDomain(summary.domainId)}
                      className={`flex min-h-12 min-w-0 flex-col items-center justify-center rounded-ds border px-1 transition active:scale-[0.98] ${
                        active
                          ? 'border-[--brand-primary-50] bg-[--brand-primary-12] text-[--brand-primary]'
                          : 'border-ds-border bg-ds-floor text-ds-muted hover:border-ds-border-hover'
                      }`}
                    >
                      <span className="font-mono text-[12px] font-bold">{copy.domainShort(summary.domainId)}</span>
                      <span className="font-mono text-[9px] tabular-nums opacity-75">{summary.done}/{summary.total}</span>
                    </button>
                  )
                })}
              </div>

              <div
                id={`learning-domain-${selectedDomainId}`}
                role="tabpanel"
                className="mt-3"
              >
                <div className="mb-2 px-0.5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[--brand-primary]">
                    {copy.domain(selectedDomainId)}
                  </div>
                  <div className="font-sans text-[14px] font-semibold leading-tight text-ds-fg">
                    {SY0_701_ROOT_DECKS[selectedDomainId].domain}
                  </div>
                </div>

                <div className="grid gap-2">
                  {SY0_701_OBJECTIVES
                    .filter(objective => objective.code.startsWith(`${selectedDomainId}.`))
                    .map(objective => {
                      const units = unitsByObjective.get(objective.code) ?? []
                      if (units.length === 0) return null
                      const expanded = objective.code === expandedObjectiveId
                      const done = units.filter(
                        unit => learningUnits.stateByUnitId.get(unit.definition.unitId)?.activityStatus === 'completed',
                      ).length
                      const evidence = learningUnits.objectiveEvidence.get(objective.code) ?? 'insufficientEvidence'
                      const leaf = LEAF_COVERAGE_BY_OBJECTIVE.get(objective.code)
                      const samples = learningUnits.formativeRecallByObjective.get(objective.code) ?? 0
                      const missingPractical = MISSING_PRACTICAL_BY_OBJECTIVE.get(objective.code) ?? []
                      const deckMapping = learningUnits.contentMapping.byObjectiveId.get(objective.code)
                      const contentId = `learning-objective-${objective.code.replace('.', '-')}`
                      return (
                        <section key={objective.code} className={`overflow-hidden rounded-ds border transition ${
                          expanded ? 'border-[--brand-primary-50] bg-ds-floor' : 'border-ds-border bg-ds-floor/70'
                        }`}>
                          <button
                            type="button"
                            onClick={() => setExpandedObjectiveId(expanded ? null : objective.code)}
                            className="flex min-h-14 w-full items-start gap-2.5 px-3 py-3 text-left"
                            aria-expanded={expanded}
                            aria-controls={contentId}
                            aria-label={expanded ? copy.collapseObjective(objective.code) : copy.expandObjective(objective.code)}
                          >
                            <span className={`mt-0.5 shrink-0 rounded-md border px-1.5 py-1 font-mono text-[11px] font-bold ${
                              expanded
                                ? 'border-[--brand-primary-50] bg-[--brand-primary-12] text-[--brand-primary]'
                                : 'border-ds-border text-ds-muted'
                            }`}>
                              {objective.code}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-sans text-[13px] font-semibold leading-snug text-ds-fg">
                                {objective.title}
                              </span>
                              <span className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 font-mono text-[10px] leading-relaxed text-ds-muted">
                                <span className="tabular-nums">{copy.unitCount(done, units.length)}</span>
                                {deckMapping && deckMapping.cardIds.length > 0 && (
                                  <span className="tabular-nums text-[--brand-secondary]">
                                    {copy.cardCount(deckMapping.reviewedCardIds.length, deckMapping.cardIds.length)}
                                  </span>
                                )}
                                <span>{copy.evidence[evidence]}</span>
                                <span>{copy.leafLine(leaf?.coveredLeafs ?? 0, leaf?.totalLeafs ?? 0, samples)}</span>
                              </span>
                            </span>
                            <ChevronDown
                              size={16}
                              strokeWidth={1.75}
                              className={`mt-1 shrink-0 text-ds-muted transition-transform ${expanded ? 'rotate-180' : 'rotate-0'}`}
                            />
                          </button>

                          {expanded && (
                            <div id={contentId} className="border-t border-ds-border px-3 pb-3 pt-2.5">
                              {missingPractical.length > 0 && (
                                <details className="mb-3 rounded-ds border border-amber-400/35 bg-amber-400/10 px-2.5 py-2 text-amber-100">
                                  <summary className="cursor-pointer font-mono text-[10px] leading-relaxed">
                                    {copy.practiceGaps(missingPractical.length)}
                                  </summary>
                                  <ul className="mt-2 grid gap-1 border-t border-amber-400/20 pt-2 font-mono text-[10px] leading-relaxed">
                                    {missingPractical.map(requirement => (
                                      <li key={requirement.requirementId}>{requirement.requirementSummary}</li>
                                    ))}
                                  </ul>
                                </details>
                              )}
                              <ul className="ml-2 grid min-w-0 gap-2 border-l border-ds-border pl-3">
                                {units.map(unit => {
                                  const activity = learningUnits.stateByUnitId.get(unit.definition.unitId)?.activityStatus ?? 'notStarted'
                                  const abortable = unit.definition.type === 'review' && activity === 'inProgress'
                                  const unitMapping = learningUnits.contentMapping.byUnitId.get(unit.definition.unitId)
                                  const sourceSubDeckObjectives = (unitMapping?.sourceSubDeckIds ?? [])
                                    .map(subDeckId => objectiveIdOfDeckId(subDeckId))
                                    .filter((objectiveId): objectiveId is string => (
                                      objectiveId !== null && objectiveId !== unitMapping?.objectiveId
                                    ))
                                  return (
                                    <li key={unit.definition.unitId} className="relative flex min-w-0 items-stretch gap-2 before:absolute before:-left-[17px] before:top-5 before:h-2 before:w-2 before:rounded-full before:border before:border-ds-border-hover before:bg-ds-floor">
                                      <button
                                        type="button"
                                        onClick={() => void handleOpenUnit(unit.definition)}
                                        className={`grid min-h-12 w-full min-w-0 flex-1 grid-cols-[auto,minmax(0,1fr)] items-start gap-2 rounded-ds border px-2.5 py-2.5 text-left transition hover:border-[--brand-primary-50] ${
                                          unit.recommended
                                            ? 'border-[--brand-primary-50] bg-[--brand-primary-08]'
                                            : 'border-ds-border bg-ds-card'
                                        }`}
                                      >
                                        <span className="pt-0.5 font-mono text-[10px] tabular-nums text-ds-muted">
                                          {unit.definition.type === 'review' ? 'REV' : String(unit.definition.order).padStart(3, '0')}
                                        </span>
                                        <span className="min-w-0">
                                          <span className="block break-words font-sans text-[13px] font-semibold leading-snug text-ds-fg">
                                            {unit.definition.title}
                                          </span>
                                          <span className="mt-1 flex flex-wrap items-center gap-1.5">
                                            <span className={`rounded-full border px-1.5 py-px font-mono text-[9px] leading-4 ${
                                              activity === 'completed'
                                                ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                                                : activity === 'inProgress'
                                                  ? 'border-[--brand-primary-50] bg-[--brand-primary-08] text-[--brand-primary]'
                                                  : 'border-ds-border text-ds-muted'
                                            }`}>
                                              {listCopy.activity[activity]}
                                            </span>
                                            {unit.recommended && (
                                              <span className="font-mono text-[9px] text-[--brand-primary]">
                                                {listCopy.reason[unit.reason]}
                                              </span>
                                            )}
                                            {unitMapping && (
                                              <>
                                                <span className="rounded-full border border-ds-border px-1.5 py-px font-mono text-[9px] leading-4 text-ds-muted">
                                                  {copy.subDeck(unitMapping.objectiveId, sourceSubDeckObjectives)}
                                                </span>
                                                {unitMapping.cardIds.length > 0 && (
                                                  <span className="rounded-full border border-[--brand-secondary-25] bg-[--brand-secondary-08] px-1.5 py-px font-mono text-[9px] leading-4 text-[--brand-secondary]">
                                                    {copy.cardCount(unitMapping.reviewedCardIds.length, unitMapping.cardIds.length)}
                                                  </span>
                                                )}
                                              </>
                                            )}
                                          </span>
                                        </span>
                                      </button>
                                      {abortable && (
                                        <button
                                          type="button"
                                          aria-label={copy.abortReview}
                                          title={copy.abortReview}
                                          data-testid={`learning-unit-abort-${unit.definition.unitId}`}
                                          onClick={() => void handleAbortReviewUnit(unit.definition)}
                                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-ds border border-ds-border text-ds-muted transition hover:border-red-400/50 hover:text-red-300"
                                        >
                                          <X size={14} strokeWidth={2} />
                                        </button>
                                      )}
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>
                          )}
                        </section>
                      )
                    })}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
