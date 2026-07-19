/**
 * AI_CONTEXT:
 * Role: Orchestration layer of the dedicated SY0-701 learning-unit system —
 *       starts/resumes course units with frozen executions, reconciles step
 *       state from real signals (video watched, recall runs, card reviews),
 *       and records execution-bound recall runs.
 * Used by: HomeView (unit tap → exact resume), VideosView (recall wiring),
 *          hooks/home/useLearningUnits (reconcile before ranking).
 * Important: Selection is frozen at start (§7) and immutable afterwards; the
 *            cards step reuses the existing study eligibility. Completion is
 *            derived ONLY from computeCourseStepState signals — never from
 *            button clicks. Nothing here writes reviews, XP, or the scheduler.
 */
import {
  buildReviewSelection,
  computeCourseStepState,
  createCourseExecution,
  formatCourseUnitId,
  formatLabUnitId,
  selectCourseCardIds,
  selectRecallQuestionIds,
  computeRecallRunVerdict,
  type LearningUnitDefinition,
  type LearningUnitExecution,
  type LearningUnitState,
  type VideoRecallRun,
} from '../utils/learningUnits'
import { sortStudyCards } from './studyCardOrdering'
import { getSecurityObjectiveDeckId } from '../utils/securityDeckHierarchy'
import { listAnswerStats } from '../db/queries/answerStats'
import {
  SY0701_CONTENT_MAP_BY_VIDEO_INDEX,
  SY0701_CONTENT_MANIFEST_VERSION,
  SY0701_SOURCE_SNAPSHOT_ID,
} from '../data/sy0701ContentMap'
import {
  abortUnitExecution,
  completeUnitExecution,
  getActiveExecution,
  getActiveLabAttempt,
  getLearningUnitState,
  getOrCreateProfileLearningState,
  getVideoProgress,
  listLearningUnitStates,
  listRecentVideoRecallRuns,
  listReservedCardIds,
  recordReviewUnitAttempt,
  recordVideoRecallRun,
  startLabAttempt,
  startUnitExecution,
  submitLabAttempt,
  touchUnitActivity,
  updateLabAttempt,
} from '../db/queries/learningUnits'
import type { LabAttemptRecord } from '../db/learningUnitsDb'
import type { LabScenario } from '../data/labScenarios'
import {
  buildLabScenarioSnapshot,
  scoreLabAnswers,
  type LabScenarioSnapshot,
  type LabScoreResult,
} from '../utils/labSnapshot'
import { clearActiveSession, listCardsByDeckIdsDirect, listCardsByIds, listCardIdsReviewedSince } from '../db/queries'
import { readTodayPackagePointer } from '../utils/todayPackage'
import type { Algorithm } from '../contexts/SettingsContext'

type CourseExecution = Extract<LearningUnitExecution, { type: 'course' }>
type ReviewExecution = Extract<LearningUnitExecution, { type: 'review' }>
type LabExecution = Extract<LearningUnitExecution, { type: 'lab' }>

const M_ID_PREFIX = /^(M\d-\d{3}):/

export interface CourseUnitStartSettings {
  /** Dosis des Karten-Schritts (wie Heute-Paket); 0 = unbegrenzt. */
  packageCardLimit: number
  nextDayStartsAt: number
  learnAheadMinutes: number
  recallCheckSize: number
  algorithm: Algorithm
}

export interface CourseUnitLaunch {
  execution: CourseExecution
  state: LearningUnitState
  step: 'video' | 'recall' | 'cards' | 'done'
  /** Noch nicht bewertete Karten der eingefrorenen Auswahl (Session-Start). */
  remainingCardIds: string[]
}

function courseVideoIndexOf(execution: CourseExecution): number {
  const match = /^unit:course:(\d{3})$/.exec(execution.unitId)
  return match ? Number(match[1]) : -1
}

/** Schrittstand einer Ausführung aus den echten Signalen (read-only). */
async function computeStepSnapshot(execution: CourseExecution): Promise<{
  step: 'video' | 'recall' | 'cards' | 'done'
  remainingCardIds: string[]
}> {
  const videoIndex = courseVideoIndexOf(execution)
  const [videoProgress, recallRuns, reviewedIds] = await Promise.all([
    getVideoProgress(execution.profileId, videoIndex),
    // Alle relevanten Läufe seit Start, nicht nur die UI-üblichen letzten fünf.
    listRecentVideoRecallRuns(execution.profileId, videoIndex, undefined, 100),
    listCardIdsReviewedSince(execution.cardIds, execution.createdAt),
  ])
  const reviewedSet = new Set(reviewedIds)
  const stepState = computeCourseStepState({
    execution,
    videoProgress,
    recallRuns,
    reviewedCardIdsSinceStart: reviewedSet,
  })
  return {
    step: stepState.currentStep,
    remainingCardIds: execution.cardIds.filter(cardId => !reviewedSet.has(cardId)),
  }
}

/**
 * Startet eine Course-Unit mit frisch eingefrorener Auswahl oder setzt die
 * bereits aktive Ausführung exakt an ihrem Schrittstand fort (§7/§8.2).
 * Ausschlussmenge der Kartenauswahl: Reservierungen aller anderen aktiven
 * Ausführungen des Profils plus die feste Kartenmenge des Heute-Pakets,
 * sofern dieses gerade ein ANDERES Video bearbeitet (keine Doppelvergabe).
 */
export async function startOrResumeCourseUnit(input: {
  profileId: string
  definition: LearningUnitDefinition
  settings: CourseUnitStartSettings
}): Promise<CourseUnitLaunch> {
  const { profileId, definition, settings } = input
  if (definition.type !== 'course' || definition.videoIndex === undefined) {
    throw new Error(`startOrResumeCourseUnit: ${definition.unitId} ist keine Course-Definition`)
  }

  const active = await getActiveExecution(profileId, definition.unitId)
  if (active && active.type === 'course') {
    const snapshot = await computeStepSnapshot(active)
    const state = await getLearningUnitState(profileId, definition.unitId)
    if (!state) throw new Error(`startOrResumeCourseUnit: Unit-State zu ${definition.unitId} fehlt`)
    return { execution: active, state, step: snapshot.step, remainingCardIds: snapshot.remainingCardIds }
  }

  const content = SY0701_CONTENT_MAP_BY_VIDEO_INDEX.get(definition.videoIndex)
  if (!content) {
    throw new Error(`startOrResumeCourseUnit: keine Content-Map für Video ${definition.videoIndex}`)
  }

  const now = Date.now()
  const profileState = await getOrCreateProfileLearningState(profileId, now)
  const candidateCards = await listCardsByIds([...content.courseCardIds])

  const recallCardIdByQuestionId = new Map<string, string>()
  for (const card of candidateCards) {
    const questionId = M_ID_PREFIX.exec(card.front.trim())?.[1]
    if (questionId) recallCardIdByQuestionId.set(questionId, card.id)
  }

  const executionId = crypto.randomUUID()
  const recall = selectRecallQuestionIds({
    candidateQuestionIds: content.recallQuestionIds,
    recallCardIdByQuestionId,
    recallCheckSize: settings.recallCheckSize,
    selectionSeed: executionId,
  })

  const excludedCardIds = await listReservedCardIds(profileId)
  const pointer = readTodayPackagePointer()
  if (pointer.activeIndex !== definition.videoIndex && pointer.activeCardIds) {
    for (const cardId of pointer.activeCardIds) excludedCardIds.add(cardId)
  }

  const selectedCardIds = selectCourseCardIds({
    candidateCards,
    excludedCardIds,
    selectedRecallCardIds: new Set(recall.selectedRecallCardIds),
    cardLimit: settings.packageCardLimit,
    now,
    nextDayStartsAt: settings.nextDayStartsAt,
    learnAheadMinutes: settings.learnAheadMinutes,
    algorithm: settings.algorithm,
    runSeed: executionId,
  })

  const execution = createCourseExecution({
    executionId,
    profileId,
    evidenceEpoch: profileState.evidenceEpoch,
    definition,
    content,
    selectedCardIds,
    selectedRecallQuestionIds: recall.selectedQuestionIds,
    selectedRecallCardIds: recall.selectedRecallCardIds,
    recallSeed: executionId,
    recallQuestionVersionsById: new Map(),
    sourceSnapshotId: SY0701_SOURCE_SNAPSHOT_ID,
    contentManifestVersion: SY0701_CONTENT_MANIFEST_VERSION,
    contentVersionsByCardId: new Map(),
    now,
  }) as CourseExecution

  const state = await startUnitExecution(execution, now)
  const snapshot = await computeStepSnapshot(execution)
  if (snapshot.step !== state.currentStep && snapshot.step !== 'done') {
    await touchUnitActivity(profileId, definition.unitId, snapshot.step, now)
  }
  return { execution, state, step: snapshot.step, remainingCardIds: snapshot.remainingCardIds }
}

/** Lokales Lerntagsdatum (YYYY-MM-DD) als Fallback, wenn der Aufrufer keins liefert. */
function formatFallbackLearningDay(nowMs: number): string {
  const date = new Date(nowMs)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Gleicht alle laufenden Course- und Review-Ausführungen mit den echten
 * Signalen ab: Schrittstand nachziehen und vollständig erledigte Units
 * abschließen. Review-Abschlüsse werden als Versuch protokolliert (§11,
 * Tageskappe). Der Abschluss vergibt kein XP und schreibt keine Reviews (§15).
 */
export async function reconcileCourseUnitProgress(
  profileId: string,
  options: { localLearningDay?: string } = {},
): Promise<{ completedUnitIds: string[] }> {
  const completedUnitIds: string[] = []
  const states = await listLearningUnitStates(profileId)
  for (const state of states) {
    if (state.activityStatus !== 'inProgress' || !state.activeExecutionId) continue
    const execution = await getActiveExecution(profileId, state.unitId)
    if (execution?.type === 'course') {
      const snapshot = await computeStepSnapshot(execution)
      if (snapshot.step === 'done') {
        await completeUnitExecution(profileId, execution.executionId, Date.now())
        // Persistierte Karten-Session der Ausführung ist mit dem Abschluss obsolet.
        await clearActiveSession(`unit-exec:${execution.executionId}`)
        completedUnitIds.push(state.unitId)
      } else if (snapshot.step !== state.currentStep) {
        await touchUnitActivity(profileId, state.unitId, snapshot.step, Date.now())
      }
    } else if (execution?.type === 'review') {
      const reviewedIds = new Set(await listCardIdsReviewedSince(execution.cardIds, execution.createdAt))
      if (execution.cardIds.every(cardId => reviewedIds.has(cardId))) {
        const now = Date.now()
        await completeUnitExecution(profileId, execution.executionId, now)
        await recordReviewUnitAttempt({
          attemptId: crypto.randomUUID(),
          profileId,
          unitId: state.unitId,
          executionId: execution.executionId,
          localLearningDay: options.localLearningDay ?? formatFallbackLearningDay(now),
          completedAt: now,
          status: 'completed',
        })
        await clearActiveSession(`unit-exec:${execution.executionId}`)
        completedUnitIds.push(state.unitId)
      }
    }
  }
  return { completedUnitIds }
}

export interface ReviewUnitStartSettings {
  /** Obergrenze der eingefrorenen Auswahl; 0 = alle fälligen. */
  reviewCardLimit: number
  nextDayStartsAt: number
  learnAheadMinutes: number
}

export interface ReviewUnitLaunch {
  execution: ReviewExecution
  state: LearningUnitState
  /** Noch nicht bewertete Karten der eingefrorenen Auswahl. */
  remainingCardIds: string[]
}

/**
 * Startet eine Review-Unit mit eingefrorener Auswahl aus fälligen Karten
 * (dieselbe Eligibility wie die Study-Sortierung, direkte Deckquery, keine
 * neuen Karten) plus ungelösten Fehlern aus `listAnswerStats` — oder setzt
 * die aktive Ausführung fort. Liefert null, wenn nichts zu wiederholen ist.
 */
export async function startOrResumeReviewUnit(input: {
  profileId: string
  definition: LearningUnitDefinition
  settings: ReviewUnitStartSettings
}): Promise<ReviewUnitLaunch | null> {
  const { profileId, definition, settings } = input
  if (definition.type !== 'review') {
    throw new Error(`startOrResumeReviewUnit: ${definition.unitId} ist keine Review-Definition`)
  }

  const active = await getActiveExecution(profileId, definition.unitId)
  if (active && active.type === 'review') {
    const reviewedIds = new Set(await listCardIdsReviewedSince(active.cardIds, active.createdAt))
    const state = await getLearningUnitState(profileId, definition.unitId)
    if (!state) throw new Error(`startOrResumeReviewUnit: Unit-State zu ${definition.unitId} fehlt`)
    return {
      execution: active,
      state,
      remainingCardIds: active.cardIds.filter(cardId => !reviewedIds.has(cardId)),
    }
  }

  const objectiveId = definition.objectiveIds[0]
  const cards = await listCardsByDeckIdsDirect([getSecurityObjectiveDeckId(objectiveId)])
  const executionId = crypto.randomUUID()

  // Fälligkeit über dieselbe pure Eligibility-Logik wie die Study-Sortierung;
  // maxNewCards 0: eine Wiederholung führt nie neue Karten ein (§11).
  const dueCards = sortStudyCards(cards, {
    maxNewCards: 0,
    nextDayStartsAt: settings.nextDayStartsAt,
    learnAheadMinutes: settings.learnAheadMinutes,
    runSeed: executionId,
  })
  const stats = await listAnswerStats({ groupBy: 'item', itemIds: cards.map(card => card.id) })
  const unresolvedErrorCardIds = stats
    .filter(stat => stat.unresolvedErrorItemIds.length > 0)
    .map(stat => stat.scopeId)

  const reserved = await listReservedCardIds(profileId)
  for (const cardId of readTodayPackagePointer().activeCardIds ?? []) reserved.add(cardId)

  const selection = buildReviewSelection({
    dueCardIds: dueCards.map(card => card.id),
    unresolvedErrorCardIds,
    reservedCardIds: reserved,
    limit: settings.reviewCardLimit,
  })
  if (selection.cardIds.length === 0) return null

  const now = Date.now()
  const profileState = await getOrCreateProfileLearningState(profileId, now)
  const execution: ReviewExecution = {
    executionId,
    unitId: definition.unitId,
    profileId,
    evidenceEpoch: profileState.evidenceEpoch,
    type: 'review',
    createdAt: now,
    cardIds: selection.cardIds,
    reasonByCardId: selection.reasonByCardId,
    sourceSnapshotId: SY0701_SOURCE_SNAPSHOT_ID,
    contentManifestVersion: SY0701_CONTENT_MANIFEST_VERSION,
    contentVersions: {},
  }
  const state = await startUnitExecution(execution, now)
  return { execution, state, remainingCardIds: [...selection.cardIds] }
}

export interface LabUnitLaunch {
  execution: LabExecution
  attempt: LabAttemptRecord
  state: LearningUnitState
}

/**
 * Startet eine Lab-Unit mit vollständig eingefrorenem, §13.2-normalisiertem
 * Szenario-Snapshot (stabile Schritt-IDs + Teilpunkt-Rubrik) oder setzt den
 * laufenden Versuch fort. Während des Versuchs werden keine Kartenreviews und
 * kein XP geschrieben (§15).
 */
export async function startOrResumeLabUnit(input: {
  profileId: string
  scenario: LabScenario
  language: string
}): Promise<LabUnitLaunch> {
  const { profileId, scenario } = input
  const unitId = formatLabUnitId(scenario.id)
  const now = Date.now()

  const active = await getActiveExecution(profileId, unitId)
  if (active && active.type === 'lab') {
    const attempt = await getActiveLabAttempt(profileId, scenario.id)
    if (attempt && attempt.attemptId === active.labAttemptId) {
      const state = await getLearningUnitState(profileId, unitId)
      if (!state) throw new Error(`startOrResumeLabUnit: Unit-State zu ${unitId} fehlt`)
      return { execution: active, attempt, state }
    }
    // Inkonsistenter Rest (z. B. Versuch anderweitig beendet): Ausführung lösen.
    await abortUnitExecution(profileId, active.executionId, now)
  }

  const profileState = await getOrCreateProfileLearningState(profileId, now)
  const snapshot = buildLabScenarioSnapshot(scenario)
  const attempt = await startLabAttempt({
    profileId,
    scenarioId: scenario.id,
    scenarioVersion: snapshot.scenarioVersion,
    language: input.language,
    sourceSnapshotId: SY0701_SOURCE_SNAPSHOT_ID,
    contentManifestVersion: SY0701_CONTENT_MANIFEST_VERSION,
    scenarioSnapshot: snapshot,
    now,
  })
  const execution: LabExecution = {
    executionId: crypto.randomUUID(),
    unitId,
    profileId,
    evidenceEpoch: profileState.evidenceEpoch,
    type: 'lab',
    createdAt: now,
    labAttemptId: attempt.attemptId,
    scenarioVersion: attempt.scenarioVersion,
  }
  const state = await startUnitExecution(execution, now)
  return { execution, attempt, state }
}

/**
 * Persistiert das Ergebnis eines Lösungsversuchs im Lab und bewertet dabei
 * ausschließlich gegen die EINGEFRORENE Rubrik des Versuchs (§13.2):
 * Fehl-/Teilversuche als Resume-Update mit Fehlversuchszähler, die volle
 * Punktzahl als endgültige Abgabe mit Teilpunkten — die schließt zugleich die
 * Lab-Unit ab. Liefert das Rubrik-Ergebnis fürs (verspätete) Feedback; ohne
 * laufenden Versuch ist der Aufruf ein No-op (null).
 */
export async function recordLabCheck(input: {
  profileId: string
  scenarioId: string
  answerByStepId: Record<string, unknown>
  /** Anteil korrekt (0..1) aus der Alt-Bewertung — nur Fallback für Versuche,
   *  deren Snapshot noch keine Rubrik trägt. */
  score: number
}): Promise<LabScoreResult | null> {
  const attempt = await getActiveLabAttempt(input.profileId, input.scenarioId)
  if (!attempt) return null
  const now = Date.now()
  const elapsedMs = Math.max(0, now - attempt.startedAt)

  const snapshot = attempt.scenarioSnapshot as Partial<LabScenarioSnapshot> | undefined
  const result: LabScoreResult = Array.isArray(snapshot?.rubric)
    ? scoreLabAnswers({ rubric: snapshot.rubric }, input.answerByStepId)
    : {
        earnedPoints: input.score,
        possiblePoints: 1,
        solved: input.score >= 1,
        byCriterionId: {},
      }

  if (!result.solved) {
    await updateLabAttempt({
      profileId: input.profileId,
      attemptId: attempt.attemptId,
      answerByStepId: input.answerByStepId,
      failedAttemptCount: attempt.failedAttemptCount + 1,
      elapsedMs,
      now,
    })
    return result
  }
  await submitLabAttempt({
    profileId: input.profileId,
    attemptId: attempt.attemptId,
    answerByStepId: input.answerByStepId,
    scoreEarned: result.earnedPoints,
    scorePossible: result.possiblePoints,
    elapsedMs,
    now,
  })
  const unitId = formatLabUnitId(input.scenarioId)
  const execution = await getActiveExecution(input.profileId, unitId)
  if (execution?.type === 'lab' && execution.labAttemptId === attempt.attemptId) {
    await completeUnitExecution(input.profileId, execution.executionId, now)
  }
  return result
}

/**
 * Expliziter Review-Abbruch (§11): protokolliert einen `abandoned`-Versuch
 * (zählt NICHT für die Tageskappe), löst die Kartenreservierung, behält die
 * Ausführung als Historie und räumt die persistierte Session auf. Unbewertete
 * Karten bleiben über die Scheduler-Fälligkeit weiter `reviewDue`.
 */
export async function abortReviewUnit(input: {
  profileId: string
  unitId: string
  localLearningDay?: string
}): Promise<boolean> {
  const execution = await getActiveExecution(input.profileId, input.unitId)
  if (!execution || execution.type !== 'review') return false
  const now = Date.now()
  await abortUnitExecution(input.profileId, execution.executionId, now)
  await recordReviewUnitAttempt({
    attemptId: crypto.randomUUID(),
    profileId: input.profileId,
    unitId: input.unitId,
    executionId: execution.executionId,
    localLearningDay: input.localLearningDay ?? formatFallbackLearningDay(now),
    completedAt: now,
    status: 'abandoned',
  })
  await clearActiveSession(`unit-exec:${execution.executionId}`)
  return true
}

/** Aktive Course-Ausführung zum Video dieses Profils (null = keine). */
export async function getActiveCourseExecutionForVideo(
  profileId: string,
  videoIndex: number,
): Promise<CourseExecution | null> {
  const execution = await getActiveExecution(profileId, formatCourseUnitId(videoIndex))
  return execution?.type === 'course' ? execution : null
}

/**
 * Persistiert einen Abruf-Lauf im dedizierten System (append-only). Läufe mit
 * `executionId` zählen nur dann als Schritt-Abschluss, wenn ihre Frage-IDs und
 * -Versionen exakt der eingefrorenen Auswahl entsprechen — das prüft
 * computeCourseStepState, nicht dieser Writer.
 */
export async function recordCourseRecallRun(input: {
  profileId: string
  videoIndex: number
  objectiveId: string
  executionId: string | null
  questionIds: string[]
  questionVersionById: Record<string, string>
  correct: number
  total: number
}): Promise<void> {
  const now = Date.now()
  const profileState = await getOrCreateProfileLearningState(input.profileId, now)
  const run: VideoRecallRun = {
    runId: crypto.randomUUID(),
    profileId: input.profileId,
    evidenceEpoch: profileState.evidenceEpoch,
    videoIndex: input.videoIndex,
    executionId: input.executionId,
    sourceSnapshotId: SY0701_SOURCE_SNAPSHOT_ID,
    contentManifestVersion: SY0701_CONTENT_MANIFEST_VERSION,
    questionIds: [...input.questionIds],
    questionVersionById: { ...input.questionVersionById },
    correct: input.correct,
    total: input.total,
    verdict: computeRecallRunVerdict(input.correct, input.total),
    completedAt: now,
  }
  await recordVideoRecallRun(run)
}
