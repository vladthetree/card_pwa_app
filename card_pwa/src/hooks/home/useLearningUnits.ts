/**
 * AI_CONTEXT:
 * Role: Data hook of the dedicated SY0-701 learning-unit module on Home — builds
 *       the 120 course definitions from the video catalog, runs the one-time
 *       legacy owner import, overlays the live legacy pointer (read-only) and
 *       ranks units with an explainable reason per row.
 * Used by: HomeView (Referenz-Kachel) und LearningUnitsView (eigener Screen).
 * Important: Purely additive to the Heute-Paket mechanic — it never writes the
 *            legacy pointer/progress and starts no executions (Phase-2 wiring).
 *            Evidence/readiness are honest Phase-1 defaults: without the
 *            AssessmentEvent ledger everything stays `insufficientEvidence`/
 *            `notReady` (§9/§10) — activity never implies mastery.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LocalVideoMeta } from '../../utils/localVideoManifest'
import {
  buildCourseUnits,
  buildLabUnits,
  buildReviewUnits,
  computeCourseStepState,
  formatReviewUnitId,
  objectiveIdOfDeckId,
  overlayLegacyCourseStates,
  COURSE_UNIT_COUNT,
  SY0701_OBJECTIVE_IDS,
  type LearningUnitDefinition,
  type LearningUnitState,
  type LearningPhase,
  type ObjectiveEvidenceStatus,
  type ReadinessStatus,
} from '../../utils/learningUnits'
import type { Card } from '../../types'
import { sortStudyCards } from '../../utils/studyCardOrdering'
import { SY0_701_OBJECTIVES, getSecurityObjectiveDeckId } from '../../utils/securityDeckHierarchy'
import {
  getCardSetSuccessRates,
  listCardIdsReviewedSince,
  listCardsByDeckIdsDirect,
  listCardsByIds,
} from '../../db/queries'
import { listAnswerStats } from '../../db/queries/answerStats'
import {
  computeDraftPacing,
  computeExamTimeline,
  computeLearningWorkload,
  rankLearningUnits,
  resolveLearningPhase,
  type LearningPacingResult,
  type RankedLearningUnit,
} from '../../utils/learningUnitRanking'
import type { DraftLearnerExamPlanRecord } from '../../db/learningUnitsDb'
import {
  SY0701_CONTENT_MANIFEST_VERSION,
  SY0701_CONTENT_MAP_BY_VIDEO_INDEX,
} from '../../data/sy0701ContentMap'
import {
  countReviewUnitAttemptsForDay,
  getExecution,
  getLearnerExamPlan,
  getOrCreateProfileLearningState,
  getVideoProgress,
  listLearningUnitStates,
  listRecentVideoRecallRuns,
  listVideoRecallRunsForProfile,
  runLegacyLabsImport,
  runLegacyLearningImport,
} from '../../db/queries/learningUnits'
import { LAB_SCENARIOS } from '../../data/labScenarios'
import { readCompletedLabs } from '../../utils/labProgress'
import {
  reconcileCourseUnitProgress,
  reconcileLegacyPointerCourseProgress,
} from '../../services/learningUnitRunner'
import { readTodayPackagePointer } from '../../utils/todayPackage'
import { readVideoProgress } from '../useMesserVideoProgress'
import { readRecallScores } from '../useVideoRecallScores'
import { useDayStartMs } from '../useDayStartMs'
import { REVIEW_UPDATED_EVENT } from '../../constants/appIdentity'
import { DAY_MS, resolveDueAtMs } from '../../utils/time'
import {
  buildLearningPlanContentMapping,
  buildLearningPlanSubDeckReadModels,
  collectLearningPlanCardIds,
  EMPTY_LEARNING_PLAN_CONTENT_MAPPING,
  type LearningPlanContentMapping,
  type LearningPlanSubDeckReadModel,
} from '../../utils/learningPlanMapping'

export interface ActiveUnitCardProgress {
  /** Karten der beim Start eingefrorenen Ausführung, seit ihrem Start bewertet. */
  reviewed: number
  /** Gesamte beim Start eingefrorene Kartenauswahl dieser Ausführung. */
  total: number
}

export interface ActiveCourseCriteriaProgress {
  videoDone: boolean
  recallDone: boolean
  confidenceDone: boolean
}

export interface LearningUnitsHomeData {
  loading: boolean
  /** false = Katalog unvollständig/ungültig (z. B. offline ohne Daten). */
  available: boolean
  phase: LearningPhase
  daysLeft: number | null
  /** Phase-1-Ehrlichkeit: ohne Server-Gates immer `notReady` (§9). */
  readiness: ReadinessStatus
  courseCompleted: number
  courseTotal: number
  /** Vollständige deterministische Rangliste (Kachel nimmt Platz 1, Liste ~5). */
  ranked: RankedLearningUnit[]
  stateByUnitId: ReadonlyMap<string, LearningUnitState>
  /** Laufender, ausführungsbezogener Kartenfortschritt — bewusst getrennt vom
   *  historischen „schon einmal bewertet“-Stand des Content-Mappings. */
  activeCardProgressByUnitId: ReadonlyMap<string, ActiveUnitCardProgress>
  /** Live-Kriterien einer laufenden Video-Unit für die erklärende Checkliste. */
  activeCourseCriteriaByUnitId: ReadonlyMap<string, ActiveCourseCriteriaProgress>
  objectiveEvidence: ReadonlyMap<string, ObjectiveEvidenceStatus>
  /** Formative Recall-Läufe der aktuellen Evidence-Epoch je Objective —
   *  Stichprobenanzeige, ausdrücklich keine Mastery-Evidenz (§8.2). */
  formativeRecallByObjective: ReadonlyMap<string, number>
  /** Draft-Lernplan des Profils (null = noch keiner angelegt). */
  plan: DraftLearnerExamPlanRecord | null
  /** Card-ID-basiertes Read-Model: Course-Unit → Objective-Deck → Karten. */
  contentMapping: LearningPlanContentMapping
  /** Nur abgeleiteter Lernplanstatus; verändert niemals Deck oder Scheduler. */
  subDecksByObjectiveId: ReadonlyMap<string, LearningPlanSubDeckReadModel>
  /** Effektiver Termin für Anzeige, Phase und Pacing. */
  effectiveExamDateIso: string | null
  /** Draft-Pacing aus Termin, Budget und Dauerschätzungen (§12). */
  pacing: LearningPacingResult
  reload: () => void
}

interface Options {
  /** Videokatalog aus useTodayPackage (eine Ladequelle für beide Module). */
  catalog: LocalVideoMeta[]
  catalogLoading: boolean
  /** null = Profil noch nicht hydratisiert → Import darf noch nicht laufen. */
  profileId: string | null
  /** Profilgesyncter Termin aus den Einstellungen. */
  examDateIso: string | null
  /** null = in dieser Settings-Generation noch nie explizit geändert. */
  examDateUpdatedAt: number | null
  nextDayStartsAt: number
  /** Learn-ahead-Fenster der Study-Eligibility (Review-Fälligkeit, §11). */
  learnAheadMinutes: number
}

const EMPTY_RESULT = {
  loading: true,
  available: false,
  phase: 'foundation' as LearningPhase,
  daysLeft: null,
  readiness: 'notReady' as ReadinessStatus,
  courseCompleted: 0,
  courseTotal: COURSE_UNIT_COUNT,
  ranked: [] as RankedLearningUnit[],
  stateByUnitId: new Map<string, LearningUnitState>(),
  activeCardProgressByUnitId: new Map<string, ActiveUnitCardProgress>(),
  activeCourseCriteriaByUnitId: new Map<string, ActiveCourseCriteriaProgress>(),
  formativeRecallByObjective: new Map<string, number>(),
  plan: null as DraftLearnerExamPlanRecord | null,
  contentMapping: EMPTY_LEARNING_PLAN_CONTENT_MAPPING,
  subDecksByObjectiveId: new Map<string, LearningPlanSubDeckReadModel>(),
  effectiveExamDateIso: null as string | null,
  pacing: computeDraftPacing({ daysLeft: null }),
}

// Eine `lab`-Einheit je Registry-Szenario (§13); statisch, da rein aus der
// Szenario-Registry abgeleitet. Nicht parsebare Objective-Labels fallen heraus.
const LAB_DEFINITIONS = buildLabUnits({
  scenarios: LAB_SCENARIOS,
  definitionVersion: SY0701_CONTENT_MANIFEST_VERSION,
}).units

/** Lokales Lerntagsdatum (YYYY-MM-DD) des Tagesanfangs — nie UTC. */
function formatLocalLearningDay(dayStartMs: number): string {
  const date = new Date(dayStartMs)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Der profilgescopte Plan ist autoritativ. Settings dient ausschließlich als
 * Legacy-Fallback, solange für das Profil noch kein Plan-Datensatz existiert. */
export function resolveEffectiveLearningPlanExamDate(input: {
  settingsExamDateIso: string | null
  settingsExamDateUpdatedAt: number | null
  draftExamDateIso: string | null | undefined
}): string | null {
  if (input.draftExamDateIso !== undefined) return input.draftExamDateIso
  return input.settingsExamDateIso
}

export function useLearningUnits({
  catalog,
  catalogLoading,
  profileId,
  examDateIso,
  examDateUpdatedAt,
  nextDayStartsAt,
  learnAheadMinutes,
}: Options): LearningUnitsHomeData {
  const [data, setData] = useState<Omit<LearningUnitsHomeData, 'objectiveEvidence' | 'reload'>>(EMPTY_RESULT)
  const computeVersionRef = useRef(0)
  const todayStartMs = useDayStartMs(nextDayStartsAt)

  // Ohne AssessmentEvent-Ledger gibt es keine belastbare Evidenz — alle 28
  // Objectives bleiben sichtbar `insufficientEvidence` statt still „grün“.
  const objectiveEvidence = useMemo(() => {
    const map = new Map<string, ObjectiveEvidenceStatus>()
    for (const objectiveId of SY0701_OBJECTIVE_IDS) map.set(objectiveId, 'insufficientEvidence')
    return map
  }, [])

  const compute = useCallback(async () => {
    const version = computeVersionRef.current + 1
    computeVersionRef.current = version

    if (profileId === null || catalogLoading) return
    if (catalog.length === 0) {
      setData(prev => ({ ...prev, loading: false, available: false }))
      return
    }

    try {
      let definitions: LearningUnitDefinition[]
      try {
        definitions = buildCourseUnits({
          videos: catalog,
          contentMapByVideoIndex: SY0701_CONTENT_MAP_BY_VIDEO_INDEX,
          definitionVersion: SY0701_CONTENT_MANIFEST_VERSION,
        })
      } catch (error) {
        // Unvollständiger Katalog (z. B. offline mit Teil-Downloads): Modul
        // ausblenden statt eine falsche, verkürzte Kursliste zu zeigen.
        console.warn('[useLearningUnits] Kursmanifest unvollständig', error)
        if (computeVersionRef.current === version) {
          setData(prev => ({ ...prev, loading: false, available: false }))
        }
        return
      }

      const now = Date.now()

      // Einmaliger Legacy-Owner-Import (§16.2): markergeschützt idempotent.
      const videoIndexesByObjective = new Map<string, number[]>()
      const objectiveByVideoIndex = new Map<number, string>()
      for (const definition of definitions) {
        if (definition.videoIndex === undefined) continue
        objectiveByVideoIndex.set(definition.videoIndex, definition.objectiveIds[0])
        const list = videoIndexesByObjective.get(definition.objectiveIds[0]) ?? []
        list.push(definition.videoIndex)
        videoIndexesByObjective.set(definition.objectiveIds[0], list)
      }
      const legacyPointer = readTodayPackagePointer()
      try {
        await runLegacyLearningImport({
          activeProfileId: profileId,
          legacy: {
            pointer: legacyPointer,
            videoProgressByObjective: readVideoProgress(),
            recallScoresByVideoKey: readRecallScores(),
            examDateIso,
          },
          videoIndexesByObjective,
          objectiveByVideoIndex,
          now,
        })
      } catch (error) {
        // Ein fehlgeschlagener Import darf die Liste nicht verhindern; der
        // Marker bleibt ungesetzt und der nächste Lauf versucht es erneut.
        console.error('[useLearningUnits] Legacy-Import fehlgeschlagen', error)
      }

      const localLearningDay = formatLocalLearningDay(todayStartMs)

      // Der alte Heute-Paket-Pointer konnte nur im Read-Model ein synthetisches
      // inProgress erzeugen. Vor dem normalen Reconcile daraus bei vorhandenen
      // sichtbaren Signalen einen echten, dauerhaften Abschluss machen.
      try {
        await reconcileLegacyPointerCourseProgress(profileId, legacyPointer)
      } catch (error) {
        console.error('[useLearningUnits] Legacy-Pointer-Reconcile fehlgeschlagen', error)
      }

      // Laufende Ausführungen mit den echten Signalen abgleichen (Schrittstand
      // nachziehen, vollständig erledigte Units abschließen), bevor gelistet wird.
      try {
        await reconcileCourseUnitProgress(profileId, { localLearningDay })
      } catch (error) {
        console.error('[useLearningUnits] Reconcile fehlgeschlagen', error)
      }

      // Einmaliger Legacy-Labs-Import (§13.2): „geschafft“-Set → historische
      // Abschlüsse des v1-Owners; markergeschützt idempotent.
      try {
        await runLegacyLabsImport({ completedScenarioIds: [...readCompletedLabs()], now })
      } catch (error) {
        console.error('[useLearningUnits] Legacy-Labs-Import fehlgeschlagen', error)
      }

      const objectiveDeckIds = SY0_701_OBJECTIVES.map(objective => getSecurityObjectiveDeckId(objective.code))
      const mappedCardIds = collectLearningPlanCardIds({
        courseDefinitions: definitions,
        contentMapByVideoIndex: SY0701_CONTENT_MAP_BY_VIDEO_INDEX,
      })
      const [profileState, states, plan, recallRuns, objectiveCards, mappedCards, attemptsToday] = await Promise.all([
        getOrCreateProfileLearningState(profileId, now),
        listLearningUnitStates(profileId),
        getLearnerExamPlan(profileId),
        listVideoRecallRunsForProfile(profileId),
        listCardsByDeckIdsDirect(objectiveDeckIds),
        // Explizite Card-ID-Abfrage: physische Deckposition ist kein
        // Fortschrittsschlüssel und darf gemappte Karten nicht verschwinden lassen.
        listCardsByIds(mappedCardIds),
        countReviewUnitAttemptsForDay(profileId, localLearningDay),
      ])
      const contentMapping = buildLearningPlanContentMapping({
        courseDefinitions: definitions,
        contentMapByVideoIndex: SY0701_CONTENT_MAP_BY_VIDEO_INDEX,
        cards: mappedCards,
      })
      const [objectiveStats, successRateByDeckId] = await Promise.all([
        listAnswerStats({
          groupBy: 'objective',
          itemIds: objectiveCards.map(card => card.id),
        }),
        getCardSetSuccessRates(Object.fromEntries(
          [...contentMapping.byDeckId.values()]
            .map(deck => [deck.deckId, deck.installedCardIds] as const),
        )),
      ])
      const subDecksByObjectiveId = buildLearningPlanSubDeckReadModels({
        contentMapping,
        successRateByDeckId,
      })
      if (import.meta.env.DEV) {
        const diagnostics = {
          duplicateCardIds: contentMapping.duplicateCardIds,
          objectiveMismatchUnitIds: contentMapping.objectiveMismatchUnitIds,
          missingCardIds: [...contentMapping.byDeckId.values()].flatMap(deck => deck.missingCardIds),
          missingAcronymCardIds: contentMapping.missingAcronymCardIds,
          invalidAcronymObjectiveCardIds: contentMapping.invalidAcronymObjectiveCardIds,
        }
        if (Object.values(diagnostics).some(values => values.length > 0)) {
          console.warn('[learning-plan-mapping]', diagnostics)
        }
      }
      if (computeVersionRef.current !== version) return

      // Review-Fälligkeit je Objective: dieselbe Eligibility wie die
      // Study-Sortierung (ohne neue Karten) plus ungelöste Fehler (§11).
      const cardsByObjective = new Map<string, Card[]>()
      for (const card of objectiveCards) {
        const objectiveId = objectiveIdOfDeckId(card.deckId)
        if (!objectiveId) continue
        const list = cardsByObjective.get(objectiveId) ?? []
        list.push(card)
        cardsByObjective.set(objectiveId, list)
      }
      const reviewDueUnitIds = new Set<string>()
      const dueReviewCardIds = new Set<string>()
      for (const [objectiveId, cards] of cardsByObjective) {
        const due = sortStudyCards(cards, { maxNewCards: 0, nextDayStartsAt, learnAheadMinutes, nowMs: now })
        if (due.length > 0) {
          reviewDueUnitIds.add(formatReviewUnitId(objectiveId))
          due.forEach(card => dueReviewCardIds.add(card.id))
        }
      }
      const unresolvedErrorCardIds = new Set<string>()
      for (const stat of objectiveStats) {
        if (stat.unresolvedErrorItemIds.length > 0) {
          reviewDueUnitIds.add(formatReviewUnitId(stat.scopeId))
          stat.unresolvedErrorItemIds.forEach(cardId => unresolvedErrorCardIds.add(cardId))
        }
      }
      const reviewDefinitions = buildReviewUnits({
        objectives: SY0_701_OBJECTIVES.map(objective => ({ objectiveId: objective.code, title: objective.title })),
        definitionVersion: SY0701_CONTENT_MANIFEST_VERSION,
      })

      const formativeRecallByObjective = new Map<string, number>()
      for (const run of recallRuns) {
        const objectiveId = objectiveByVideoIndex.get(run.videoIndex)
        if (!objectiveId) continue
        formativeRecallByObjective.set(objectiveId, (formativeRecallByObjective.get(objectiveId) ?? 0) + 1)
      }

      const stateByUnitId = overlayLegacyCourseStates({
        states,
        pointer: legacyPointer,
        profileId,
        evidenceEpoch: profileState.evidenceEpoch,
        now,
      })
      type ActiveProgressEntry = {
        unitId: string
        cardProgress?: ActiveUnitCardProgress
        courseCriteria?: ActiveCourseCriteriaProgress
      }
      const activeProgressEntries: Array<ActiveProgressEntry | null> = await Promise.all(
        [...stateByUnitId.values()]
          .filter(state => state.activityStatus === 'inProgress' && state.activeExecutionId)
          .map(async (state): Promise<ActiveProgressEntry | null> => {
            const execution = await getExecution(state.activeExecutionId!)
            if (!execution || execution.profileId !== profileId) return null
            if (execution.type === 'review') {
              const reviewedCardIds = await listCardIdsReviewedSince(execution.cardIds, execution.createdAt)
              return {
                unitId: state.unitId,
                cardProgress: { reviewed: reviewedCardIds.length, total: execution.cardIds.length },
              }
            }
            if (execution.type === 'course') {
              const match = /^unit:course:(\d{3})$/.exec(execution.unitId)
              const videoIndex = match ? Number(match[1]) : -1
              const [videoProgress, recallRuns] = await Promise.all([
                getVideoProgress(profileId, videoIndex),
                listRecentVideoRecallRuns(profileId, videoIndex, undefined, 100),
              ])
              const snapshot = computeCourseStepState({
                execution,
                videoProgress,
                recallRuns,
                reviewedCardIdsSinceStart: new Set(),
              })
              return {
                unitId: state.unitId,
                courseCriteria: {
                  videoDone: snapshot.videoDone,
                  recallDone: snapshot.recallDone,
                  confidenceDone: snapshot.confidenceDone,
                },
              }
            }
            return null
          }),
      )
      if (computeVersionRef.current !== version) return
      const activeCardProgressByUnitId = new Map(
        activeProgressEntries
          .filter((entry): entry is ActiveProgressEntry => entry?.cardProgress !== undefined)
          .map(entry => [entry.unitId, entry.cardProgress!] as const),
      )
      const activeCourseCriteriaByUnitId = new Map(
        activeProgressEntries
          .filter((entry): entry is ActiveProgressEntry => entry?.courseCriteria !== undefined)
          .map(entry => [entry.unitId, entry.courseCriteria!] as const),
      )

      const courseCompleted = definitions.filter(
        definition => stateByUnitId.get(definition.unitId)?.activityStatus === 'completed',
      ).length

      // Der profilgescopte Plan gewinnt einschließlich einer expliziten
      // Löschung. Settings wird nur für Altinstallationen ohne Plan gelesen.
      const effectiveExamDateIso = resolveEffectiveLearningPlanExamDate({
        settingsExamDateIso: examDateIso,
        settingsExamDateUpdatedAt: examDateUpdatedAt,
        draftExamDateIso: plan?.examDateIso,
      })
      const timeline = computeExamTimeline({ examDateIso: effectiveExamDateIso, now })
      const phase = resolveLearningPhase({
        daysLeft: timeline.daysLeft,
        courseProgressRatio: courseCompleted / COURSE_UNIT_COUNT,
      })
      const pendingReviewCardIds = new Set([...dueReviewCardIds, ...unresolvedErrorCardIds])
      const scheduledReviewCardIds = new Set(pendingReviewCardIds)
      if (timeline.daysLeft !== null && timeline.daysLeft >= 0) {
        const horizonEnd = now + (timeline.daysLeft + 1) * DAY_MS
        for (const card of objectiveCards) {
          if (card.type !== 'new' && resolveDueAtMs(card) < horizonEnd) scheduledReviewCardIds.add(card.id)
        }
      }
      const unintroducedCardCount = mappedCards.filter(card => card.type === 'new' || card.reps === 0).length
      const workload = computeLearningWorkload({
        remainingCourseUnits: definitions
          .filter(definition => stateByUnitId.get(definition.unitId)?.activityStatus !== 'completed')
          .map(definition => ({ unitId: definition.unitId, estimatedMinutes: definition.estimatedMinutes })),
        // Bis B3 eine Pflichtlab-Auswahl festlegt, werden transparent alle
        // offenen Labs als eigener Messwert geführt; nichts wird versteckt.
        remainingLabUnits: LAB_DEFINITIONS
          .filter(definition => stateByUnitId.get(definition.unitId)?.activityStatus !== 'completed')
          .map(definition => ({ unitId: definition.unitId, estimatedMinutes: definition.estimatedMinutes })),
        dueReviewCardCount: dueReviewCardIds.size,
        unresolvedErrorCardCount: unresolvedErrorCardIds.size,
        pendingReviewCardCount: pendingReviewCardIds.size,
        scheduledReviewCardCount: scheduledReviewCardIds.size,
        unintroducedCardCount,
        timedReviewSampleCount: objectiveStats.reduce((sum, stat) => sum + stat.timedAnswerCount, 0),
        observedReviewTimeMs: objectiveStats.reduce((sum, stat) => sum + stat.timedAnswerTimeMs, 0),
      })
      const pacing = computeDraftPacing({
        daysLeft: timeline.daysLeft,
        plan: plan ?? null,
        workload,
      })
      const ranked = rankLearningUnits({
        // Kurs-, Review- und Lab-Units; Exam-Units folgen mit Phase 5.
        definitions: [...definitions, ...reviewDefinitions, ...LAB_DEFINITIONS],
        stateByUnitId,
        phase,
        localLearningDay,
        reviewCompletedToday: attemptsToday > 0,
        reviewDueUnitIds,
        objectiveEvidence,
        readiness: 'notReady',
        daysLeft: timeline.daysLeft,
        pacing,
      })

      setData({
        loading: false,
        available: true,
        phase,
        daysLeft: timeline.daysLeft,
        readiness: 'notReady',
        courseCompleted,
        courseTotal: COURSE_UNIT_COUNT,
        ranked,
        stateByUnitId,
        activeCardProgressByUnitId,
        activeCourseCriteriaByUnitId,
        formativeRecallByObjective,
        plan: plan ?? null,
        contentMapping,
        subDecksByObjectiveId,
        effectiveExamDateIso,
        pacing,
      })
    } catch (error) {
      console.error('[useLearningUnits]', error)
      if (computeVersionRef.current !== version) return
      setData(prev => ({ ...prev, loading: false, available: false }))
    }
  }, [catalog, catalogLoading, profileId, examDateIso, examDateUpdatedAt, todayStartMs, objectiveEvidence])

  useEffect(() => {
    void compute()

    const onReviewUpdated = () => void compute()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void compute()
    }
    window.addEventListener(REVIEW_UPDATED_EVENT, onReviewUpdated)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener(REVIEW_UPDATED_EVENT, onReviewUpdated)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [compute])

  const reload = useCallback(() => void compute(), [compute])

  return { ...data, objectiveEvidence, reload }
}
