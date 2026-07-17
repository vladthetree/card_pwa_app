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
  computeCourseStepState,
  createCourseExecution,
  formatCourseUnitId,
  selectCourseCardIds,
  selectRecallQuestionIds,
  computeRecallRunVerdict,
  type LearningUnitDefinition,
  type LearningUnitExecution,
  type LearningUnitState,
  type VideoRecallRun,
} from '../utils/learningUnits'
import {
  SY0701_CONTENT_MAP_BY_VIDEO_INDEX,
  SY0701_CONTENT_MANIFEST_VERSION,
  SY0701_SOURCE_SNAPSHOT_ID,
} from '../data/sy0701ContentMap'
import {
  completeUnitExecution,
  getActiveExecution,
  getLearningUnitState,
  getOrCreateProfileLearningState,
  getVideoProgress,
  listLearningUnitStates,
  listRecentVideoRecallRuns,
  listReservedCardIds,
  recordVideoRecallRun,
  startUnitExecution,
  touchUnitActivity,
} from '../db/queries/learningUnits'
import { listCardsByIds, listCardIdsReviewedSince } from '../db/queries'
import { readTodayPackagePointer } from '../utils/todayPackage'
import type { Algorithm } from '../contexts/SettingsContext'

type CourseExecution = Extract<LearningUnitExecution, { type: 'course' }>

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

/**
 * Gleicht alle laufenden Course-Ausführungen mit den echten Signalen ab:
 * Schrittstand nachziehen und vollständig erledigte Units abschließen.
 * Der Abschluss vergibt kein XP und schreibt keine Reviews (§15).
 */
export async function reconcileCourseUnitProgress(profileId: string): Promise<{ completedUnitIds: string[] }> {
  const completedUnitIds: string[] = []
  const states = await listLearningUnitStates(profileId)
  for (const state of states) {
    if (state.activityStatus !== 'inProgress' || !state.activeExecutionId) continue
    const execution = await getActiveExecution(profileId, state.unitId)
    if (!execution || execution.type !== 'course') continue
    const snapshot = await computeStepSnapshot(execution)
    if (snapshot.step === 'done') {
      await completeUnitExecution(profileId, execution.executionId, Date.now())
      completedUnitIds.push(state.unitId)
    } else if (snapshot.step !== state.currentStep) {
      await touchUnitActivity(profileId, state.unitId, snapshot.step, Date.now())
    }
  }
  return { completedUnitIds }
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
