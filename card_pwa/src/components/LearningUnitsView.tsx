/**
 * AI_CONTEXT: Vollbild-Ansicht des dedizierten SY0-701-Lerneinheiten-Systems
 * (Nutzerentscheidung 2026-07-18: eigener Screen, das Dashboard trägt nur die
 * Referenz-Kachel). Enthält Empfehlungsliste und die Vollliste aller Units
 * gruppiert Domain → Objective mit Leaf-Coverage; Aktivität,
 * Evidenz und Reife bleiben getrennt beschriftet (§18). Startet Units exakt:
 * Course → Video/Recall/Karten, Review → eingefrorene Karten-Session.
 */
import { useEffect, useState } from 'react'
import { ArrowLeft, ChevronDown, Route, X } from 'lucide-react'
import { useSettings } from '../contexts/SettingsContext'
import { profileScopeId } from '../services/profileService'
import { useTodayPackage } from '../hooks/home/useTodayPackage'
import { useLearningUnits } from '../hooks/home/useLearningUnits'
import { HomeLearningUnitList } from './home/HomeLearningUnitList'
import { LEARNING_UNIT_COPY } from './home/learningUnitCopy'
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
import type { RankedLearningUnit } from '../utils/learningUnitRanking'
import { abortReviewUnit, startOrResumeCourseUnit, startOrResumeReviewUnit } from '../services/learningUnitRunner'
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
    subtitle: (done: number, total: number) => `SY0-701 · Kurs ${done}/${total} Videos`,
    back: 'Zurück',
    loading: 'Lade Lerneinheiten …',
    unavailable: 'Kurskatalog nicht verfügbar (offline ohne Daten?).',
    allUnits: 'Alle Einheiten',
    pathHint: 'Lernpfad · Domain wählen',
    domainNav: 'Prüfungsdomain auswählen',
    domain: (id: string) => `Domain ${id}`,
    domainShort: (id: string) => `D${id}`,
    unitCount: (done: number, total: number) => `${done}/${total} Einheiten`,
    cardCount: (reviewed: number, total: number) => `${reviewed}/${total} Karten gelernt`,
    subDeck: (objective: string, sources: string[]) => sources.length > 0
      ? `Karten für ${objective} + ${sources.join(', ')}`
      : `Karten für ${objective}`,
    expandObjective: (code: string) => `Objective ${code} öffnen`,
    collapseObjective: (code: string) => `Objective ${code} schließen`,
    objectiveCount: (done: number, total: number) => `${done}/${total}`,
    evidence: {
      insufficientEvidence: 'Evidenz: unzureichend',
      learning: 'Evidenz: im Aufbau',
      mastered: 'Evidenz: beherrscht',
    } satisfies Record<ObjectiveEvidenceStatus, string>,
    leafLine: (covered: number, total: number, samples: number) =>
      `${covered}/${total} Prüfungsziele abgedeckt · ${samples} Wissenschecks`,
    practiceGaps: (count: number) => `${count} Praxisanforderungen benötigen noch eine passende Übung`,
    unitType: {
      course: 'Video',
      review: 'Wiederholung',
      lab: 'Lab',
      exam: 'Prüfung',
    },
    duration: (minutes: number) => `ca. ${minutes} Min.`,
    abortReview: 'Wiederholung abbrechen',
    reviewEmpty: 'Nichts zu wiederholen — in diesem Objective sind keine Karten fällig und keine Fehler ungelöst.',
    reviewStartFailed: 'Wiederholung konnte nicht gestartet werden.',
  },
  en: {
    title: 'Learning units',
    subtitle: (done: number, total: number) => `SY0-701 · Course ${done}/${total} videos`,
    back: 'Back',
    loading: 'Loading learning units …',
    unavailable: 'Course catalog unavailable (offline without data?).',
    allUnits: 'All units',
    pathHint: 'Learning path · choose a domain',
    domainNav: 'Choose exam domain',
    domain: (id: string) => `Domain ${id}`,
    domainShort: (id: string) => `D${id}`,
    unitCount: (done: number, total: number) => `${done}/${total} units`,
    cardCount: (reviewed: number, total: number) => `${reviewed}/${total} cards learned`,
    subDeck: (objective: string, sources: string[]) => sources.length > 0
      ? `Cards for ${objective} + ${sources.join(', ')}`
      : `Cards for ${objective}`,
    expandObjective: (code: string) => `Open objective ${code}`,
    collapseObjective: (code: string) => `Close objective ${code}`,
    objectiveCount: (done: number, total: number) => `${done}/${total}`,
    evidence: {
      insufficientEvidence: 'Evidence: insufficient',
      learning: 'Evidence: building',
      mastered: 'Evidence: mastered',
    } satisfies Record<ObjectiveEvidenceStatus, string>,
    leafLine: (covered: number, total: number, samples: number) =>
      `${covered}/${total} exam objectives covered · ${samples} knowledge checks`,
    practiceGaps: (count: number) => `${count} practical requirements still need a matching exercise`,
    unitType: {
      course: 'Video',
      review: 'Review',
      lab: 'Lab',
      exam: 'Exam',
    },
    duration: (minutes: number) => `about ${minutes} min`,
    abortReview: 'Abort review',
    reviewEmpty: 'Nothing to review — no cards due and no unresolved errors in this objective.',
    reviewStartFailed: 'Could not start the review.',
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
    examDateUpdatedAt: settings.examDateUpdatedAt,
    nextDayStartsAt: settings.nextDayStartsAt,
    learnAheadMinutes: settings.learnAheadMinutes,
  })

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
    <div className="learning-units-neo flex h-full min-h-0 flex-col">
      {!embedded && (
        <div className="shrink-0 border-b-4 border-black bg-[#FFD93D] px-4 pb-3 pt-safe-2">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onExit} className="neo-learning-press flex h-11 w-11 shrink-0 items-center justify-center bg-white" aria-label={copy.back}>
              <ArrowLeft size={18} strokeWidth={3} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="font-sans text-[24px] font-black uppercase leading-tight text-black">{copy.title}</div>
              <div className="break-words font-sans text-[12px] font-bold leading-snug text-black">
                {copy.subtitle(learningUnits.courseCompleted, learningUnits.courseTotal)} · {listCopy.readiness[learningUnits.readiness]}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`min-h-0 flex-1 overflow-y-auto ${embedded ? 'px-0 py-1' : 'px-4 py-3'}`} data-study-scroll="allow">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 pb-safe-2 lg:max-w-5xl xl:max-w-6xl">
          {embedded && (
            <div className="px-0.5" data-testid="learning-units-embedded-subtitle">
              <h2 className="font-sans text-[26px] font-black uppercase leading-none tracking-tight text-black sm:hidden">
                {copy.title}
              </h2>
              <div className="mt-2 break-words font-sans text-[13px] font-bold leading-snug text-black sm:mt-0">
                {copy.subtitle(learningUnits.courseCompleted, learningUnits.courseTotal)} · {listCopy.readiness[learningUnits.readiness]}
              </div>
            </div>
          )}

          <div className="flex min-w-0 flex-col gap-3">
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
          </div>

          {learningUnits.available && (
            <section data-testid="learning-units-full-list" className="neo-learning-card p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-11 w-11 shrink-0 -rotate-2 items-center justify-center border-[3px] border-black bg-[#FF6B6B] text-black shadow-[3px_3px_0_0_#000]">
                  <Route size={20} strokeWidth={3} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-sans text-[20px] font-black uppercase text-black">{copy.allUnits}</h3>
                  <p className="mt-0.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-black">{copy.pathHint}</p>
                </div>
              </div>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-5 sm:overflow-visible sm:pb-0" role="tablist" aria-label={copy.domainNav}>
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
                      className={`neo-learning-press flex min-h-14 min-w-[74px] flex-1 flex-col items-center justify-center px-2 font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 sm:min-w-0 ${
                        active
                          ? 'bg-[#FFD93D] text-black'
                          : 'neo-learning-hover-violet bg-white text-black'
                      }`}
                    >
                      <span className="text-[13px] font-black">{copy.domainShort(summary.domainId)}</span>
                      <span className="mt-0.5 text-[10px] font-bold tabular-nums">{summary.done}/{summary.total}</span>
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
                  <div className="font-sans text-[11px] font-black uppercase tracking-[0.12em] text-black">
                    {copy.domain(selectedDomainId)}
                  </div>
                  <div className="mt-0.5 font-sans text-[18px] font-black leading-tight text-black">
                    {SY0_701_ROOT_DECKS[selectedDomainId].domain}
                  </div>
                </div>

                <div className="grid gap-2 lg:grid-cols-2 lg:items-start lg:gap-3">
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
                        <section key={objective.code} className={`overflow-hidden border-2 border-black transition ${
                          expanded ? 'bg-[#C4B5FD]' : 'bg-white'
                        }`}>
                          <button
                            type="button"
                            onClick={() => setExpandedObjectiveId(expanded ? null : objective.code)}
                            className="neo-learning-hover-yellow flex min-h-16 w-full items-start gap-3 px-3 py-3 text-left transition duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black"
                            aria-expanded={expanded}
                            aria-controls={contentId}
                            aria-label={expanded ? copy.collapseObjective(objective.code) : copy.expandObjective(objective.code)}
                          >
                            <span className={`mt-0.5 shrink-0 border-2 border-black px-2 py-1 font-sans text-[12px] font-black ${
                              expanded
                                ? 'bg-[#FF6B6B] text-black'
                                : 'bg-white text-black'
                            }`}>
                              {objective.code}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-sans text-[15px] font-black leading-snug text-black">
                                {objective.title}
                              </span>
                              <span className="mt-1 flex flex-wrap gap-x-2 gap-y-1 font-sans text-[11px] font-bold leading-relaxed text-black">
                                <span className="tabular-nums">{copy.unitCount(done, units.length)}</span>
                                {deckMapping && deckMapping.cardIds.length > 0 && (
                                  <span className="tabular-nums text-black">
                                    {copy.cardCount(deckMapping.reviewedCardIds.length, deckMapping.cardIds.length)}
                                  </span>
                                )}
                                <span>{copy.evidence[evidence]}</span>
                              </span>
                            </span>
                            <ChevronDown
                              size={16}
                              strokeWidth={1.75}
                              className={`mt-1 shrink-0 text-black transition-transform ${expanded ? 'rotate-180' : 'rotate-0'}`}
                            />
                          </button>

                          {expanded && (
                            <div id={contentId} className="border-t-2 border-black bg-[#FFFDF5] px-3 pb-3 pt-3">
                              <div className="mb-3 border-2 border-black bg-white px-2.5 py-2 font-sans text-[11px] font-bold leading-relaxed text-black">
                                {copy.leafLine(leaf?.coveredLeafs ?? 0, leaf?.totalLeafs ?? 0, samples)}
                              </div>
                              {missingPractical.length > 0 && (
                                <details className="mb-3 border-2 border-black bg-[#FFD93D] px-2.5 py-2 text-black">
                                  <summary className="cursor-pointer font-sans text-[11px] font-bold leading-relaxed">
                                    {copy.practiceGaps(missingPractical.length)}
                                  </summary>
                                  <ul className="mt-2 grid gap-1 border-t-2 border-black pt-2 font-sans text-[11px] font-medium leading-relaxed">
                                    {missingPractical.map(requirement => (
                                      <li key={requirement.requirementId}>{requirement.requirementSummary}</li>
                                    ))}
                                  </ul>
                                </details>
                              )}
                              <ul className="ml-2 grid min-w-0 gap-3 border-l-2 border-black pl-3">
                                {units.map(unit => {
                                  const state = learningUnits.stateByUnitId.get(unit.definition.unitId)
                                  const activity = state?.activityStatus ?? 'notStarted'
                                  const abortable = unit.definition.type === 'review' && activity === 'inProgress'
                                  const unitMapping = learningUnits.contentMapping.byUnitId.get(unit.definition.unitId)
                                  const sourceSubDeckObjectives = (unitMapping?.sourceSubDeckIds ?? [])
                                    .map(subDeckId => objectiveIdOfDeckId(subDeckId))
                                    .filter((objectiveId): objectiveId is string => (
                                      objectiveId !== null && objectiveId !== unitMapping?.objectiveId
                                    ))
                                  return (
                                    <li key={unit.definition.unitId} className="relative flex min-w-0 items-stretch gap-2 before:absolute before:-left-[18px] before:top-5 before:h-2.5 before:w-2.5 before:rounded-full before:border-2 before:border-black before:bg-[#FFD93D]">
                                      <button
                                        type="button"
                                        onClick={() => void handleOpenUnit(unit.definition)}
                                        className={`neo-learning-press grid min-h-14 w-full min-w-0 flex-1 grid-cols-[auto,minmax(0,1fr)] items-start gap-2.5 px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${
                                          unit.recommended
                                            ? 'bg-[#FF6B6B]'
                                            : 'neo-learning-hover-yellow bg-white'
                                        }`}
                                      >
                                        <span className={`border-2 border-black px-1.5 py-1 font-sans text-[10px] font-black uppercase tracking-[0.06em] ${
                                          unit.recommended
                                            ? 'bg-[#FFD93D] text-black'
                                            : unit.definition.type === 'lab'
                                              ? 'bg-[#C4B5FD] text-black'
                                              : 'bg-white text-black'
                                        }`}>
                                          {copy.unitType[unit.definition.type]}
                                        </span>
                                        <span className="min-w-0">
                                          <span className="block break-words font-sans text-[14px] font-black leading-snug text-black">
                                            {unit.definition.title}
                                          </span>
                                          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                            {unit.definition.estimatedMinutes !== undefined && (
                                              <span className="font-sans text-[10px] font-bold text-black">
                                                {copy.duration(unit.definition.estimatedMinutes)}
                                              </span>
                                            )}
                                            <span className={`rounded-full border-2 border-black px-2 py-0.5 font-sans text-[10px] font-bold leading-4 text-black ${
                                              activity === 'completed'
                                                ? 'bg-[#C4B5FD]'
                                                : activity === 'inProgress'
                                                  ? 'bg-[#FF6B6B]'
                                                  : 'bg-white'
                                            }`}>
                                              {listCopy.activity[activity]}
                                            </span>
                                            {state && activity !== 'notStarted' && (
                                              <span className="basis-full font-sans text-[10px] font-bold leading-relaxed text-black">
                                                {activity === 'completed'
                                                  ? listCopy.completedDetail[unit.definition.type]
                                                  : listCopy.currentStep[state.currentStep]}
                                              </span>
                                            )}
                                            {unit.recommended && (
                                              <span className="font-sans text-[10px] font-black text-black">
                                                {listCopy.reason[unit.reason]}
                                              </span>
                                            )}
                                            {unitMapping && (
                                              <>
                                                <span className="rounded-full border-2 border-black bg-white px-2 py-0.5 font-sans text-[10px] font-bold leading-4 text-black">
                                                  {copy.subDeck(unitMapping.objectiveId, sourceSubDeckObjectives)}
                                                </span>
                                                {unitMapping.cardIds.length > 0 && (
                                                  <span className="rounded-full border-2 border-black bg-[#C4B5FD] px-2 py-0.5 font-sans text-[10px] font-bold leading-4 text-black">
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
                                          className="neo-learning-press flex h-11 w-11 shrink-0 items-center justify-center bg-[#FF6B6B] text-black"
                                        >
                                          <X size={16} strokeWidth={3} />
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
