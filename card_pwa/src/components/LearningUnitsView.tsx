/**
 * AI_CONTEXT: Home-Modus des dedizierten SY0-701-Lerneinheiten-Systems
 * (optional weiterhin eigenständig renderbar). Zeigt den Lernpfad gruppiert
 * nach Domain → Objective,
 * ohne vorläufige Evidenz-/Reifeanzeigen oder einen redundanten Videocounter.
 * Startet Units exakt:
 * Course → Video/Recall/Selbsteinschätzung, Review → eingefrorene Karten-Session.
 */
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, ChevronDown, Circle, Info, Route, X } from 'lucide-react'
import { useSettings } from '../contexts/SettingsContext'
import { useTheme, themeScopeClass } from '../contexts/ThemeContext'
import { profileScopeId } from '../services/profileService'
import { useTodayPackage } from '../hooks/home/useTodayPackage'
import { useLearningUnits } from '../hooks/home/useLearningUnits'
import { LEARNING_UNIT_COPY } from './home/learningUnitCopy'
import { SY0_701_OBJECTIVES, SY0_701_ROOT_DECKS, getSecurityObjectiveDeckId, getSecurityObjectiveDeckName } from '../utils/securityDeckHierarchy'
import {
  buildUniqueLearningPlanSessionCardIds,
  type LearningPlanAcronymCardMapping,
  type LearningPlanSubDeckReadModel,
} from '../utils/learningPlanMapping'
import type { LearningUnitDefinition } from '../utils/learningUnits'
import type { RankedLearningUnit } from '../utils/learningUnitRanking'
import { startOrResumeCourseUnit, startOrResumeReviewUnit } from '../services/learningUnitRunner'
import { toast } from '../hooks/useToast'
import type { Deck } from '../types'
import {
  LearningPlanAcronymReferences,
  LearningPlanSubDeckCard,
  LearningPlanSubDeckInfoModal,
} from './LearningPlanSubDeckCard'
import {
  SY0701_ACRONYM_DECK_ID,
  SY0701_ACRONYM_DECK_NAME,
} from '../data/sy0701LearningPlanAcronymMap'

const VIEW_COPY = {
  de: {
    title: 'Lerneinheiten',
    subtitle: 'SY0-701 · Lernpfad',
    back: 'Zurück',
    loading: 'Lade Lerneinheiten …',
    unavailable: 'Kurskatalog nicht verfügbar (offline ohne Daten?).',
    allUnits: 'Alle Einheiten',
    pathSection: 'Lernpfad',
    materialSection: 'Material & Üben',
    pathHint: 'Video + Abruf-Check + Lernstatus = abgeschlossen',
    domainNav: 'Prüfungsdomain auswählen',
    domain: (id: string) => `Domain ${id}`,
    domainShort: (id: string) => `D${id}`,
    unitCount: (done: number, total: number) => `${done}/${total} Einheiten`,
    expandObjective: (code: string) => `Objective ${code} öffnen`,
    collapseObjective: (code: string) => `Objective ${code} schließen`,
    unitType: {
      course: 'Video',
      review: 'Wiederholung',
      lab: 'Lab',
    },
    duration: (minutes: number) => `ca. ${minutes} Min.`,
    criteriaOpen: (title: string) => `Abschlusskriterien für ${title} anzeigen`,
    criteriaTitle: 'Wann ist diese Einheit fertig?',
    criteriaDone: 'Erfüllt',
    criteriaOpenState: 'Noch offen',
    criteriaHint: 'Erst wenn alle Kriterien erfüllt sind, wird die Karte grün.',
    criteria: {
      video: 'Video ansehen oder nach dem Abruf-Check als angesehen bestätigen',
      recall: 'Abruf-Check vollständig beantworten',
      confidence: 'Lernstatus wählen: Lücken, Okay oder Sicher',
      reviewCards: (reviewed: number, total: number) =>
        total > 0 ? `Alle ausgewählten Karten bewerten (${reviewed}/${total})` : 'Alle ausgewählten Karten bewerten',
      lab: 'Lab vollständig lösen und Ergebnis prüfen',
    },
    reviewEmpty: 'Nichts zu wiederholen — in diesem Objective sind keine Karten fällig und keine Fehler ungelöst.',
    reviewReserved: 'Die fälligen Karten gehören bereits zu einer laufenden Lernsitzung. Setze diese zuerst fort oder beende sie.',
    reviewStartFailed: 'Wiederholung konnte nicht gestartet werden.',
    mappedCardsMissing: 'Die gemappten Karten sind auf diesem Gerät nicht verfügbar.',
  },
  en: {
    title: 'Learning units',
    subtitle: 'SY0-701 · Learning path',
    back: 'Back',
    loading: 'Loading learning units …',
    unavailable: 'Course catalog unavailable (offline without data?).',
    allUnits: 'All units',
    pathSection: 'Learning path',
    materialSection: 'Material & practice',
    pathHint: 'Video + recall check + learning status = completed',
    domainNav: 'Choose exam domain',
    domain: (id: string) => `Domain ${id}`,
    domainShort: (id: string) => `D${id}`,
    unitCount: (done: number, total: number) => `${done}/${total} units`,
    expandObjective: (code: string) => `Open objective ${code}`,
    collapseObjective: (code: string) => `Close objective ${code}`,
    unitType: {
      course: 'Video',
      review: 'Review',
      lab: 'Lab',
    },
    duration: (minutes: number) => `about ${minutes} min`,
    criteriaOpen: (title: string) => `Show completion criteria for ${title}`,
    criteriaTitle: 'When is this unit complete?',
    criteriaDone: 'Completed',
    criteriaOpenState: 'Still open',
    criteriaHint: 'The card turns green only after every criterion is completed.',
    criteria: {
      video: 'Watch the video or confirm it as watched after the recall check',
      recall: 'Complete the entire recall check',
      confidence: 'Choose a learning status: Gaps, Okay, or Solid',
      reviewCards: (reviewed: number, total: number) =>
        total > 0 ? `Rate every selected card (${reviewed}/${total})` : 'Rate every selected card',
      lab: 'Solve the lab completely and check the result',
    },
    reviewEmpty: 'Nothing to review — no cards due and no unresolved errors in this objective.',
    reviewReserved: 'The due cards already belong to an active study session. Resume or finish that session first.',
    reviewStartFailed: 'Could not start the review.',
    mappedCardsMissing: 'The mapped cards are not available on this device.',
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
  const { themeKey } = useTheme()
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

  const handleStudySubDeck = (deck: LearningPlanSubDeckReadModel) => {
    const cardIds = buildUniqueLearningPlanSessionCardIds(deck.installedCardIds)
    if (cardIds.length === 0) {
      toast.show(copy.mappedCardsMissing, 'info')
      return
    }
    onStartStudy(
      {
        id: deck.deckId,
        name: deck.subDeckName,
        total: cardIds.length,
        new: 0,
        learning: 0,
        due: 0,
      },
      cardIds,
      {
        // Dasselbe Session-Ziel wie das echte Deck; die Karten selbst werden
        // weiterhin über ihre kanonischen IDs geladen und bewertet.
        sessionId: `learning-plan:subdeck:${deck.objectiveId}`,
        allowResume: true,
        returnToUnits: true,
      },
    )
  }

  const handleStudyAcronym = (
    objectiveId: string,
    card: LearningPlanAcronymCardMapping,
  ) => {
    const cardIds = buildUniqueLearningPlanSessionCardIds([card.cardId])
    if (!card.installed || cardIds.length === 0) {
      toast.show(copy.mappedCardsMissing, 'info')
      return
    }
    onStartStudy(
      {
        id: SY0701_ACRONYM_DECK_ID,
        name: SY0701_ACRONYM_DECK_NAME,
        total: 1,
        new: 0,
        learning: 0,
        due: 0,
      },
      cardIds,
      {
        sessionId: `learning-plan:acronyms:${objectiveId}`,
        allowResume: false,
        returnToUnits: true,
      },
    )
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
        if (launch.status === 'unavailable') {
          toast.show(
            launch.reason === 'reserved-by-active-session' ? copy.reviewReserved : copy.reviewEmpty,
            'info',
          )
          return
        }
        if (launch.remainingCardIds.length === 0) {
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
      })
      learningUnits.reload()
      onOpenVideoAtIndex(videoIndex, launch.step === 'recall')
    } catch (error) {
      // Startfehler darf die Navigation nicht blockieren — Video read-only öffnen.
      console.error('[LearningUnitsView] Lerneinheit-Start fehlgeschlagen', error)
      onOpenVideoAtIndex(videoIndex, false)
    }
  }

  const unitsByObjective = useMemo(() => {
    const map = new Map<string, RankedLearningUnit[]>()
    for (const row of learningUnits.ranked) {
      const objectiveId = row.definition.objectiveIds[0]
      const list = map.get(objectiveId) ?? []
      list.push(row)
      map.set(objectiveId, list)
    }
    // Listenreihenfolge ist die offizielle Kursreihenfolge, nicht der Rang.
    for (const list of map.values()) {
      list.sort((a, b) => a.definition.order - b.definition.order)
    }
    return map
  }, [learningUnits.ranked])
  const domains = Object.keys(SY0_701_ROOT_DECKS)
  const preferredObjectiveId = (
    learningUnits.ranked.find(row => row.recommended) ?? learningUnits.ranked[0]
  )?.definition.objectiveIds[0] ?? null
  const [selectedDomainId, setSelectedDomainId] = useState(domains[0] ?? '1')
  const [expandedObjectiveId, setExpandedObjectiveId] = useState<string | null>(null)
  const [criteriaUnitId, setCriteriaUnitId] = useState<string | null>(null)
  const [subDeckInfo, setSubDeckInfo] = useState<LearningPlanSubDeckReadModel | null>(null)
  const [pathInitialized, setPathInitialized] = useState(false)

  useEffect(() => {
    if (pathInitialized || !preferredObjectiveId) return
    setSelectedDomainId(preferredObjectiveId.split('.')[0])
    setExpandedObjectiveId(preferredObjectiveId)
    setPathInitialized(true)
  }, [pathInitialized, preferredObjectiveId])

  const domainSummaries = useMemo(() => domains.map(domainId => {
    const objectiveIds = SY0_701_OBJECTIVES
      .filter(objective => objective.code.startsWith(`${domainId}.`))
      .map(objective => objective.code)
    const units = objectiveIds.flatMap(objectiveId => unitsByObjective.get(objectiveId) ?? [])
    const done = units.filter(
      unit => learningUnits.stateByUnitId.get(unit.definition.unitId)?.activityStatus === 'completed',
    ).length
    return { domainId, done, total: units.length }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [unitsByObjective, learningUnits.stateByUnitId])

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

  const criteriaUnit = criteriaUnitId === null
    ? null
    : learningUnits.ranked.find(unit => unit.definition.unitId === criteriaUnitId) ?? null
  const criteriaFor = (unit: RankedLearningUnit) => {
    const state = learningUnits.stateByUnitId.get(unit.definition.unitId)
    const completed = state?.activityStatus === 'completed'
    if (unit.definition.type === 'course') {
      const live = learningUnits.activeCourseCriteriaByUnitId.get(unit.definition.unitId)
      return [
        { label: copy.criteria.video, done: completed || live?.videoDone === true },
        { label: copy.criteria.recall, done: completed || live?.recallDone === true },
        { label: copy.criteria.confidence, done: completed || live?.confidenceDone === true },
      ]
    }
    if (unit.definition.type === 'review') {
      const progress = learningUnits.activeCardProgressByUnitId.get(unit.definition.unitId)
      return [{
        label: copy.criteria.reviewCards(progress?.reviewed ?? 0, progress?.total ?? 0),
        done: completed || (progress !== undefined && progress.reviewed === progress.total),
      }]
    }
    return [{ label: copy.criteria.lab, done: completed }]
  }

  return (
    <div className={`${themeScopeClass(themeKey, 'learning-units')} flex h-full min-h-0 flex-col`}>
      {!embedded && (
        <div className="shrink-0 border-b-4 border-black bg-[#FFD93D] px-4 pb-3 pt-safe-2">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onExit} className="neo-learning-press flex h-11 w-11 shrink-0 items-center justify-center bg-white" aria-label={copy.back}>
              <ArrowLeft size={18} strokeWidth={3} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="font-sans text-[24px] font-black uppercase leading-tight text-black">{copy.title}</div>
              <div className="break-words font-sans text-[12px] font-bold leading-snug text-black">
                {copy.subtitle}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`learning-units-scroll min-h-0 flex-1 overflow-y-auto ${embedded ? 'px-0 py-1' : 'px-4 py-3'}`} data-study-scroll="allow">
        {/* Embedded erbt die Breite vom Home-Container (homeMaxWidth) — eine
            eigene max-w-Kette würde die Karte schmaler als die Toolbar machen
            und die linken Kanten verspringen lassen. */}
        <div className={`flex w-full flex-col gap-3 pb-safe-2 ${
          embedded ? '' : 'mx-auto max-w-2xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-[1600px]'
        }`}>
          {embedded && (
            <div className="px-0.5" data-testid="learning-units-embedded-subtitle">
              <h2 className="font-sans text-[26px] font-black uppercase leading-none tracking-tight text-black sm:hidden">
                {copy.title}
              </h2>
              <div className="mt-2 break-words font-sans text-[13px] font-bold leading-snug text-black sm:mt-0">
                {copy.subtitle}
              </div>
            </div>
          )}

          {learningUnits.loading && (
            <p className="font-mono text-[12px] text-ds-muted">{copy.loading}</p>
          )}
          {!learningUnits.loading && !learningUnits.available && (
            <p className="font-mono text-[12px] text-ds-muted">{copy.unavailable}</p>
          )}

          {learningUnits.available && (
            <section data-testid="learning-units-full-list" className="neo-learning-card p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-11 w-11 shrink-0 -rotate-2 items-center justify-center border-[3px] border-black bg-[#FF6B6B] text-black shadow-[3px_3px_0_0_var(--neo-ink)]">
                  <Route size={20} strokeWidth={3} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-sans text-[20px] font-black uppercase text-black 2xl:text-[22px]">{copy.allUnits}</h3>
                  <p className="mt-0.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-black 2xl:text-xs">{copy.pathHint}</p>
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
                      className={`neo-learning-press flex min-h-14 min-w-[74px] flex-1 flex-col items-center justify-center px-2 font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 sm:min-w-0 2xl:min-h-12 2xl:flex-row 2xl:gap-2 ${
                        active
                          ? 'bg-[#FFD93D] text-black'
                          : 'neo-learning-hover-violet bg-white text-black'
                      }`}
                    >
                      <span className="text-[13px] font-black 2xl:text-[15px]">{copy.domainShort(summary.domainId)}</span>
                      <span className="mt-0.5 text-[10px] font-bold tabular-nums 2xl:mt-0 2xl:text-xs">{summary.done}/{summary.total}</span>
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
                  <div className="font-sans text-[11px] font-black uppercase tracking-[0.12em] text-black 2xl:text-[13px]">
                    {copy.domain(selectedDomainId)}
                  </div>
                  <div className="mt-0.5 font-sans text-[18px] font-black leading-tight text-black 2xl:text-[20px]">
                    {SY0_701_ROOT_DECKS[selectedDomainId].domain}
                  </div>
                </div>

                <div className="grid gap-2 lg:grid-cols-2 lg:gap-3 2xl:grid-cols-3">
                  {SY0_701_OBJECTIVES
                    .filter(objective => objective.code.startsWith(`${selectedDomainId}.`))
                    .map(objective => {
                      const units = unitsByObjective.get(objective.code) ?? []
                      const subDeck = learningUnits.subDecksByObjectiveId.get(objective.code)
                      const acronymCards = learningUnits.contentMapping.acronymCardsByObjectiveId.get(objective.code) ?? []
                      if (units.length === 0 && !subDeck && acronymCards.length === 0) return null
                      const expanded = objective.code === expandedObjectiveId
                      const done = units.filter(
                        unit => learningUnits.stateByUnitId.get(unit.definition.unitId)?.activityStatus === 'completed',
                      ).length
                      const contentId = `learning-objective-${objective.code.replace('.', '-')}`
                      return (
                        <section key={objective.code} className={`neo-learning-tile flex flex-col overflow-hidden transition ${
                          expanded ? 'bg-[#C4B5FD] lg:col-span-2 2xl:col-span-3' : 'bg-white'
                        }`}>
                          <button
                            type="button"
                            onClick={() => setExpandedObjectiveId(expanded ? null : objective.code)}
                            className={`neo-learning-hover-yellow flex min-h-16 w-full items-start gap-3 px-3 py-3 text-left transition duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black ${
                              expanded ? '' : 'flex-1'
                            }`}
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
                              <span className="block font-sans text-[15px] font-black leading-snug text-black 2xl:text-[17px]">
                                {objective.title}
                              </span>
                              <span className="mt-1 flex flex-wrap gap-x-2 gap-y-1 font-sans text-[11px] font-bold leading-relaxed text-black 2xl:text-xs">
                                <span className="tabular-nums">{copy.unitCount(done, units.length)}</span>
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
                              {/* Ordnung im Objective: erst der nummerierte Lernpfad
                                  (offizielle Kursreihenfolge), darunter ein eigener
                                  Material-Block (Sub-Deck + Acronym-Referenzen). */}
                              {units.length > 0 && (
                                <div className="mb-2 px-0.5 font-sans text-[10px] font-black uppercase tracking-[0.14em] text-black 2xl:text-xs">
                                  {copy.pathSection}
                                </div>
                              )}
                              <ul className="ml-2 grid min-w-0 gap-3 border-l-2 border-black pl-3 lg:ml-0 lg:grid-cols-2 lg:items-stretch lg:border-l-0 lg:pl-0 2xl:grid-cols-3 min-[1800px]:grid-cols-4">
                                {units.map((unit, unitIndex) => {
                                  const state = learningUnits.stateByUnitId.get(unit.definition.unitId)
                                  const activity = state?.activityStatus ?? 'notStarted'
                                  const activeCardProgress = learningUnits.activeCardProgressByUnitId.get(unit.definition.unitId)
                                  const unitTone = activity === 'completed'
                                    ? 'bg-[#86EFAC]'
                                    : activity === 'inProgress'
                                      ? 'bg-[#FDBA74]'
                                      : unit.recommended
                                        ? 'bg-[#FF6B6B]'
                                        : 'neo-learning-hover-yellow bg-white'
                                  return (
                                    <li key={unit.definition.unitId} className="relative flex min-w-0 items-stretch gap-2 before:absolute before:-left-[18px] before:top-5 before:h-2.5 before:w-2.5 before:rounded-full before:border-2 before:border-black before:bg-[#FFD93D] lg:before:hidden">
                                      <div className={`neo-learning-press relative min-w-0 flex-1 ${unitTone}`}>
                                        <button
                                          type="button"
                                          onClick={() => void handleOpenUnit(unit.definition)}
                                          className="grid min-h-14 w-full min-w-0 grid-cols-[auto,minmax(0,1fr)] items-start gap-2.5 px-3 py-3 pr-14 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black"
                                        >
                                          <span className={`border-2 border-black px-1.5 py-1 font-sans text-[10px] font-black uppercase tracking-[0.06em] 2xl:text-xs ${
                                            unit.recommended
                                              ? 'bg-[#FFD93D] text-black'
                                              : unit.definition.type === 'lab'
                                                ? 'bg-[#C4B5FD] text-black'
                                                : 'bg-white text-black'
                                          }`}>
                                            <span className="tabular-nums">{String(unitIndex + 1).padStart(2, '0')}</span>
                                            {' · '}
                                            {copy.unitType[unit.definition.type]}
                                          </span>
                                          <span className="min-w-0">
                                            <span className="block break-words font-sans text-[14px] font-black leading-snug text-black 2xl:text-base">
                                              {unit.definition.title}
                                            </span>
                                            <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                              {unit.definition.estimatedMinutes !== undefined && (
                                                <span className="font-sans text-[10px] font-bold text-black 2xl:text-xs">
                                                  {copy.duration(unit.definition.estimatedMinutes)}
                                                </span>
                                              )}
                                              <span className={`rounded-full border-2 border-black px-2 py-0.5 font-sans text-[10px] font-bold leading-4 text-black 2xl:text-xs ${
                                                activity === 'completed'
                                                  ? 'bg-[#86EFAC]'
                                                  : activity === 'inProgress'
                                                    ? 'bg-[#FDBA74]'
                                                    : 'bg-white'
                                              }`}>
                                                {listCopy.activity[activity]}
                                              </span>
                                              {state && activity !== 'notStarted' && (
                                                <span className="basis-full font-sans text-[10px] font-bold leading-relaxed text-black 2xl:text-xs">
                                                  {activity === 'completed'
                                                    ? listCopy.completedDetail[unit.definition.type]
                                                    : listCopy.currentStep[state.currentStep]}
                                                </span>
                                              )}
                                              {activity === 'inProgress' && activeCardProgress && (
                                                <span className="basis-full font-sans text-[10px] font-bold leading-relaxed text-black 2xl:text-xs">
                                                  {listCopy.activeCardProgress(activeCardProgress.reviewed, activeCardProgress.total)}
                                                </span>
                                              )}
                                              {unit.recommended && (
                                                <span className="font-sans text-[10px] font-black text-black 2xl:text-xs">
                                                  {listCopy.reason[unit.reason]}
                                                </span>
                                              )}
                                            </span>
                                          </span>
                                        </button>
                                        <button
                                          type="button"
                                          aria-label={copy.criteriaOpen(unit.definition.title)}
                                          title={copy.criteriaOpen(unit.definition.title)}
                                          data-testid={`learning-unit-criteria-${unit.definition.unitId}`}
                                          onClick={() => setCriteriaUnitId(unit.definition.unitId)}
                                          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center border-2 border-black bg-white text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                                        >
                                          <Info size={16} strokeWidth={2.5} />
                                        </button>
                                      </div>
                                    </li>
                                  )
                                })}
                              </ul>

                              {(subDeck || acronymCards.length > 0) && (
                                <div className="mt-3 border-t-2 border-dashed border-black pt-3">
                                  <div className="mb-2 px-0.5 font-sans text-[10px] font-black uppercase tracking-[0.14em] text-black 2xl:text-xs">
                                    {copy.materialSection}
                                  </div>
                                  {subDeck && (
                                    <ul className="grid min-w-0 gap-3 lg:grid-cols-2 lg:items-stretch 2xl:grid-cols-3 min-[1800px]:grid-cols-4">
                                      <li className="flex min-w-0 items-stretch">
                                        <LearningPlanSubDeckCard
                                          language={settings.language}
                                          deck={subDeck}
                                          onStudy={handleStudySubDeck}
                                          onOpenInfo={setSubDeckInfo}
                                        />
                                      </li>
                                    </ul>
                                  )}
                                  {acronymCards.length > 0 && (
                                    <div className={subDeck ? 'mt-3' : ''}>
                                      <LearningPlanAcronymReferences
                                        language={settings.language}
                                        cards={acronymCards}
                                        onStudy={card => handleStudyAcronym(objective.code, card)}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
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

      {criteriaUnit && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="learning-unit-criteria-title"
          onClick={() => setCriteriaUnitId(null)}
        >
          <section
            className="neo-learning-modal w-full max-w-md bg-[#FFFDF5] p-4 text-black"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <Info size={22} strokeWidth={3} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <h2 id="learning-unit-criteria-title" className="font-sans text-[18px] font-black uppercase leading-tight">
                  {copy.criteriaTitle}
                </h2>
                <p className="mt-1 break-words font-sans text-[14px] font-bold leading-snug">
                  {criteriaUnit.definition.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCriteriaUnitId(null)}
                className="neo-learning-press flex h-10 w-10 shrink-0 items-center justify-center bg-white"
                aria-label={copy.back}
              >
                <X size={16} strokeWidth={3} />
              </button>
            </div>

            <ul className="mt-4 grid gap-2">
              {criteriaFor(criteriaUnit).map(criterion => (
                <li
                  key={criterion.label}
                  className={`flex items-start gap-2.5 border-2 border-black px-3 py-2.5 ${
                    criterion.done ? 'bg-[#86EFAC]' : 'bg-[#FDBA74]'
                  }`}
                >
                  {criterion.done
                    ? <CheckCircle2 size={18} strokeWidth={3} className="mt-0.5 shrink-0" />
                    : <Circle size={18} strokeWidth={3} className="mt-0.5 shrink-0" />}
                  <span className="min-w-0 flex-1 font-sans text-[13px] font-bold leading-relaxed">
                    {criterion.label}
                  </span>
                  <span className="shrink-0 font-sans text-[10px] font-black uppercase tracking-wide">
                    {criterion.done ? copy.criteriaDone : copy.criteriaOpenState}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-4 border-t-2 border-black pt-3 font-sans text-[12px] font-bold leading-relaxed">
              {copy.criteriaHint}
            </p>
          </section>
        </div>
      )}

      {subDeckInfo && (
        <LearningPlanSubDeckInfoModal
          language={settings.language}
          deck={subDeckInfo}
          onClose={() => setSubDeckInfo(null)}
        />
      )}
    </div>
  )
}
