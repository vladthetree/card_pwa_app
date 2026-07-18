/**
 * AI_CONTEXT:
 * Role: Pure core of the dedicated SY0-701 learning-unit system (Phase 1): unit builders, frozen executions, step state, and leaf coverage.
 * Used by: learning-unit tests and (later phases) the dedicated Lerneinheiten UI/persistence — nothing in the existing app imports this yet.
 * Important: Everything here is pure and deterministic (seeded); contracts live in docs/lerneinheiten-sy0-701-umsetzungsplan.md §7/§8/§23.2. Do not add I/O.
 */
import type { Card } from '../types'
import type { LocalVideoMeta } from './localVideoManifest'
import { buildTodayPackageSelection } from '../services/studyCardOrdering'

// ── Statische Typen (Detailplan §5.1, §7, §9) ───────────────────────────────

export type LearningUnitType = 'course' | 'review' | 'lab' | 'exam'
export type ActivityStatus = 'notStarted' | 'inProgress' | 'completed'
export type ObjectiveEvidenceStatus = 'insufficientEvidence' | 'learning' | 'mastered'
export type ReadinessStatus = 'notReady' | 'approaching' | 'examReady'
export type CoverageStatus = 'covered' | 'content-missing' | 'assessment-missing' | 'mapping-review'
export type LearningPhase = 'foundation' | 'deepening' | 'exam' | 'final' | 'pastExam'

export interface ValidationResult {
  ok: boolean
  errors: Array<{ code: string; message: string; contentId?: string }>
  warnings: Array<{ code: string; message: string; contentId?: string }>
}

export interface ExamLaunchDescriptor {
  descriptorId: string
  descriptorVersion: string
  purpose: 'diagnostic' | 'practice' | 'readiness'
  mode: 'drill' | 'full'
  blueprintId: string
  blueprintVersion: string
  sourceSnapshotId: string
  contentManifestVersion: string
  scoringRegistryVersion: string
  languagePolicy: { kind: 'fixed'; language: string } | { kind: 'confirmed-exam-language' }
  itemCount: number
  durationSec: number
  eligiblePhaseIds: LearningPhase[]
  earliestStartAt?: number
}

export interface LearningUnitDefinition {
  unitId: string
  type: LearningUnitType
  title: string
  objectiveIds: string[]
  requirementIds: string[]
  order: number
  estimatedMinutes?: number
  videoIndex?: number
  labScenarioId?: string
  examLaunch?: ExamLaunchDescriptor
  definitionVersion: string
}

export interface LearningUnitState {
  profileId: string
  evidenceEpoch: number
  unitId: string
  activityStatus: ActivityStatus
  currentStep: 'video' | 'recall' | 'cards' | 'lab' | 'exam' | 'done'
  activeExecutionId?: string
  startedAt?: number
  completedAt?: number
  lastCompletedAt?: number
  lastActivityAt: number
  updatedAt: number
}

export type LearningUnitExecution =
  | {
      executionId: string
      unitId: string
      profileId: string
      evidenceEpoch: number
      type: 'course'
      createdAt: number
      cardIds: string[]
      recallQuestionIds: string[]
      recallQuestionVersions: Record<string, string>
      recallCardIds: string[]
      recallSeed: string
      sourceSnapshotId: string
      contentManifestVersion: string
      contentVersions: Record<string, string>
    }
  | {
      executionId: string
      unitId: string
      profileId: string
      evidenceEpoch: number
      type: 'review'
      createdAt: number
      cardIds: string[]
      reasonByCardId: Record<string, 'due' | 'unresolved-error'>
      sourceSnapshotId: string
      contentManifestVersion: string
      contentVersions: Record<string, string>
    }
  | {
      executionId: string
      unitId: string
      profileId: string
      evidenceEpoch: number
      type: 'lab'
      createdAt: number
      labAttemptId: string
      scenarioVersion: string
    }
  | {
      executionId: string
      unitId: string
      profileId: string
      evidenceEpoch: number
      type: 'exam'
      createdAt: number
      examAttemptId: string
      formVersion: string
    }

// ── Content-Map / Crosswalk (Detailplan §5.1, §8.1) ─────────────────────────

export interface VideoContentMapEntry {
  videoIndex: number
  objectiveId: string
  requirementIds: string[]
  courseCardIds: string[]
  recallQuestionIds: string[]
  recallCardIds: string[]
  /** ffprobe-Videodauer aus dem Source-Snapshot; fehlt → keine Schätzung. */
  durationSec?: number
  unmappedReason?: string
}

export interface VideoCardIndex {
  cardIdsByVideoIndex: ReadonlyMap<number, readonly string[]>
  unmappedCardIds: readonly string[]
  missingQuestionIds: readonly string[]
  duplicateVideoTitles: readonly string[]
  misplacedCardIds: readonly string[]
}

export type RequirementCriticality = 'standard' | 'critical'

export interface CriticalErrorDefinition {
  errorClassId: string
  definitionVersion: string
  requirementId: string
  severity: 'critical'
  description: string
  triggerRuleId: string
  resolutionRule: {
    minIndependentCorrectEvents: number
    minSpacingHours: number
    practicalRecheckRequired: boolean
  }
}

export interface ExamRequirement {
  requirementId: string
  examCode: 'SY0-701'
  sourceRevision: string
  domainId: string
  objectiveId: string
  sourcePath: string[]
  requirementSummary: string
  actionVerb: string
  acronymMeaningIds: string[]
  scenarioRequired: boolean
  criticality: RequirementCriticality
  criticalErrorClassIds: string[]
}

export interface ExamRequirementsManifest {
  sourceSnapshotId: string
  manifestVersion: string
  requirements: ExamRequirement[]
  criticalErrorDefinitions: CriticalErrorDefinition[]
}

export interface RequirementCoverage {
  requirementId: string
  learningAssetIds: string[]
  assessmentItemIds: string[]
  practicalItemIds: string[]
  qaStatus: CoverageStatus
  reviewer?: string
  reviewedAt?: number
  note?: string
}

export interface CoverageReport {
  sourceSnapshotId: string
  requirementCount: number
  coveredCount: number
  byRequirementId: Record<string, RequirementCoverage>
  blockingRequirementIds: string[]
  generatedAt: number
}

// ── Nutzerzustand Kursablauf (Detailplan §8.2) ──────────────────────────────

export interface VideoProgressRecord {
  profileId: string
  evidenceEpoch: number
  videoIndex: number
  objectiveId: string
  openedAt?: number
  watchedAt?: number
  watchedMethod?: 'ended' | 'manual'
  confidence?: 'gaps' | 'ok' | 'solid'
  confidenceAt?: number
  legacyHint?: { watched?: boolean; confidence?: string }
  updatedAt: number
}

export interface VideoRecallRun {
  runId: string
  profileId: string
  evidenceEpoch: number
  videoIndex: number
  executionId: string | null
  sourceSnapshotId: string
  contentManifestVersion: string
  questionIds: string[]
  questionVersionById: Record<string, string>
  correct: number
  total: number
  verdict: 'understood' | 'almost' | 'review'
  completedAt: number
}

/** Ratio-Regel für Recall-Verdicts (identisch für Legacy-Import und neue Läufe):
 *  „verstanden“ erfordert ≥ 80 % UND eine aussagekräftige Stichprobe (≥ 4). */
export function computeRecallRunVerdict(correct: number, total: number): VideoRecallRun['verdict'] {
  const ratio = total > 0 ? correct / total : 0
  if (ratio >= 0.8 && total >= 4) return 'understood'
  if (ratio >= 0.5) return 'almost'
  return 'review'
}

// ── Konstanten ──────────────────────────────────────────────────────────────

export const SY0701_OBJECTIVE_IDS: readonly string[] = [
  '1.1', '1.2', '1.3', '1.4',
  '2.1', '2.2', '2.3', '2.4', '2.5',
  '3.1', '3.2', '3.3', '3.4',
  '4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7', '4.8', '4.9',
  '5.1', '5.2', '5.3', '5.4', '5.5', '5.6',
]

/** Erster/letzter prüfungsrelevanter Playlist-Index (Video 001 ist Intro). */
export const COURSE_FIRST_INDEX = 2
export const COURSE_LAST_INDEX = 121
export const COURSE_UNIT_COUNT = COURSE_LAST_INDEX - COURSE_FIRST_INDEX + 1

const OBJECTIVE_DECK_ID = /^sy0-701-objective-(\d)-(\d+)$/

/** Objective-Code eines System-Objective-Decks (`sy0-701-objective-D-O`), sonst null. */
export function objectiveIdOfDeckId(deckId: string | undefined): string | null {
  if (!deckId) return null
  const m = OBJECTIVE_DECK_ID.exec(deckId)
  return m ? `${m[1]}.${m[2]}` : null
}

export function formatCourseUnitId(videoIndex: number): string {
  return `unit:course:${String(videoIndex).padStart(3, '0')}`
}

export function formatReviewUnitId(objectiveId: string): string {
  return `unit:review:${objectiveId}`
}

// ── Review-Units (Phase 3, Detailplan §11) ─────────────────────────────────

/** Eine `review`-Einheit je Objective; Reihenfolge hinter den Course-Units.
 *  Ob eine Einheit empfohlen wird, entscheiden Fälligkeit/Fehler im Ranking. */
export function buildReviewUnits(input: {
  objectives: ReadonlyArray<{ objectiveId: string; title: string }>
  definitionVersion: string
}): LearningUnitDefinition[] {
  return input.objectives.map((objective, index) => ({
    unitId: formatReviewUnitId(objective.objectiveId),
    type: 'review' as const,
    title: `Wiederholung ${objective.objectiveId} · ${objective.title}`,
    objectiveIds: [objective.objectiveId],
    requirementIds: [],
    order: 1000 + index,
    definitionVersion: input.definitionVersion,
  }))
}

export interface ReviewSelection {
  cardIds: string[]
  reasonByCardId: Record<string, 'due' | 'unresolved-error'>
}

/**
 * Friert die Auswahl einer Review-Ausführung ein (§11): fällige Karten in
 * ihrer Eligibility-Reihenfolge zuerst, danach ungelöste Fehler als klar
 * bezeichneter Kontrollabruf nicht fälliger Karten. Reservierte Karten
 * anderer Ausführungen bleiben draußen; `limit` 0 = alle.
 */
export function buildReviewSelection(input: {
  dueCardIds: readonly string[]
  unresolvedErrorCardIds: readonly string[]
  reservedCardIds: ReadonlySet<string>
  limit: number
}): ReviewSelection {
  const limit = Number.isFinite(input.limit) && input.limit > 0 ? Math.floor(input.limit) : Number.POSITIVE_INFINITY
  const cardIds: string[] = []
  const reasonByCardId: Record<string, 'due' | 'unresolved-error'> = {}

  for (const cardId of input.dueCardIds) {
    if (cardIds.length >= limit) break
    if (input.reservedCardIds.has(cardId) || reasonByCardId[cardId]) continue
    cardIds.push(cardId)
    reasonByCardId[cardId] = 'due'
  }
  for (const cardId of [...input.unresolvedErrorCardIds].sort()) {
    if (cardIds.length >= limit) break
    if (input.reservedCardIds.has(cardId) || reasonByCardId[cardId]) continue
    cardIds.push(cardId)
    reasonByCardId[cardId] = 'unresolved-error'
  }
  return { cardIds, reasonByCardId }
}

// ── Deterministische Seeds (xmur3 + mulberry32, selbstenthalten) ───────────

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return (h ^= h >>> 16) >>> 0
  }
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const rand = mulberry32(xmur3(seed)())
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// ── Manifestvalidierung und Course-Builder (Vertrag §23.2) ──────────────────

/** Prüft den Videokatalog gegen die Kursinvarianten: Indizes 002–121 einmalig
 *  und vollständig, ausschließlich bekannte Objective-Codes. */
export function validateCourseCatalog(videos: readonly LocalVideoMeta[]): ValidationResult {
  const errors: ValidationResult['errors'] = []
  const warnings: ValidationResult['warnings'] = []
  const known = new Set(SY0701_OBJECTIVE_IDS)
  const seen = new Map<number, number>()

  for (const video of videos) {
    seen.set(video.index, (seen.get(video.index) ?? 0) + 1)
    if (!known.has(video.objective)) {
      errors.push({
        code: 'unknown-objective',
        message: `Video ${video.index}: unbekanntes Objective ${video.objective}`,
        contentId: String(video.index),
      })
    }
  }
  for (const [index, count] of seen) {
    if (count > 1) {
      errors.push({ code: 'duplicate-index', message: `Videoindex ${index} ist ${count}× vorhanden`, contentId: String(index) })
    }
  }
  for (let index = COURSE_FIRST_INDEX; index <= COURSE_LAST_INDEX; index++) {
    if (!seen.has(index)) {
      errors.push({ code: 'missing-index', message: `Videoindex ${index} fehlt (erwartet 002–121)`, contentId: String(index) })
    }
  }
  for (const [index] of seen) {
    if (index !== 1 && (index < COURSE_FIRST_INDEX || index > COURSE_LAST_INDEX)) {
      warnings.push({ code: 'out-of-course-range', message: `Videoindex ${index} liegt außerhalb 002–121`, contentId: String(index) })
    }
  }
  return { ok: errors.length === 0, errors, warnings }
}

/** 1 Video = 1 Course-Unit (Indizes 002–121). Deterministisch, sortiert nach Index. */
export function buildCourseUnits(input: {
  videos: LocalVideoMeta[]
  contentMapByVideoIndex: ReadonlyMap<number, VideoContentMapEntry>
  definitionVersion: string
}): LearningUnitDefinition[] {
  const validation = validateCourseCatalog(input.videos)
  if (!validation.ok) {
    throw new Error(`Kursmanifest ungültig: ${validation.errors.map(e => e.message).join('; ')}`)
  }
  return input.videos
    .filter(video => video.index >= COURSE_FIRST_INDEX && video.index <= COURSE_LAST_INDEX)
    .sort((a, b) => a.index - b.index)
    .map(video => {
      const entry = input.contentMapByVideoIndex.get(video.index)
      return {
        unitId: formatCourseUnitId(video.index),
        type: 'course' as const,
        title: video.title,
        objectiveIds: [video.objective],
        requirementIds: entry ? [...entry.requirementIds] : [],
        order: video.index,
        videoIndex: video.index,
        ...(entry?.durationSec !== undefined
          ? { estimatedMinutes: computeCourseUnitEstimatedMinutes(entry.durationSec) }
          : {}),
        definitionVersion: input.definitionVersion,
      }
    })
}

/** Kalibrierbarer Draft-Aufschlag je Course-Unit für Abruf-Check + Karten-Dosis
 *  (Minuten); die Videodauer kommt exakt aus dem Source-Snapshot. */
export const COURSE_UNIT_PRACTICE_OVERHEAD_MINUTES = 10

export function computeCourseUnitEstimatedMinutes(durationSec: number): number {
  return Math.ceil(durationSec / 60) + COURSE_UNIT_PRACTICE_OVERHEAD_MINUTES
}

// ── Video↔Karten-Index (Vertrag §23.2, Regel §8.1) ─────────────────────────

const M_ID_PREFIX = /^(M\d-\d{3}):/

export function buildVideoCardIndex(input: {
  catalog: readonly LocalVideoMeta[]
  cards: readonly Card[]
  videoTitleByQuestionId: Readonly<Record<string, string>>
}): VideoCardIndex {
  const videoByTitle = new Map<string, LocalVideoMeta[]>()
  for (const video of input.catalog) {
    const list = videoByTitle.get(video.title) ?? []
    list.push(video)
    videoByTitle.set(video.title, list)
  }
  const duplicateVideoTitles = [...videoByTitle.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([title]) => title)

  const cardIdsByVideoIndex = new Map<number, string[]>()
  const unmappedCardIds: string[] = []
  const misplacedCardIds: string[] = []
  const seenQuestionIds = new Set<string>()

  for (const card of input.cards) {
    const deckObjective = objectiveIdOfDeckId(card.deckId)
    if (deckObjective === null) continue // nur Objective-Deck-Karten sind Kurskandidaten

    const mId = M_ID_PREFIX.exec(card.front)?.[1]
    const title = mId ? input.videoTitleByQuestionId[mId] : undefined
    const videos = title !== undefined ? (videoByTitle.get(title) ?? []) : []

    if (!mId || title === undefined || videos.length !== 1) {
      // Nicht eindeutig zuordenbar → bleibt im Practice-Pool des Objectives.
      unmappedCardIds.push(card.id)
      continue
    }
    seenQuestionIds.add(mId)
    const video = videos[0]
    const list = cardIdsByVideoIndex.get(video.index) ?? []
    list.push(card.id)
    cardIdsByVideoIndex.set(video.index, list)
    // Deckposition ist QA-Signal, verhindert die Videozuordnung aber nicht.
    if (deckObjective !== video.objective) misplacedCardIds.push(card.id)
  }

  const missingQuestionIds = Object.keys(input.videoTitleByQuestionId).filter(id => !seenQuestionIds.has(id))

  return {
    cardIdsByVideoIndex,
    unmappedCardIds,
    missingQuestionIds,
    duplicateVideoTitles,
    misplacedCardIds,
  }
}

// ── Recall-/Kartenauswahl (Vertrag §23.2, Regeln §8.2) ──────────────────────

export function normalizeRecallCheckSize(size: unknown): number {
  const parsed = Number(size)
  if (!Number.isFinite(parsed)) return 7
  return Math.max(3, Math.min(15, Math.round(parsed)))
}

/** Deterministische Recall-Stichprobe. Liefert die Card-IDs NUR der
 *  ausgewählten Recall-Fragen (Transkriptfragen haben keine Card-ID). */
export function selectRecallQuestionIds(input: {
  candidateQuestionIds: readonly string[]
  recallCardIdByQuestionId: ReadonlyMap<string, string>
  recallCheckSize: number
  selectionSeed: string
}): { selectedQuestionIds: string[]; selectedRecallCardIds: string[] } {
  const size = Math.min(normalizeRecallCheckSize(input.recallCheckSize), input.candidateQuestionIds.length)
  const selectedQuestionIds = seededShuffle(input.candidateQuestionIds, input.selectionSeed).slice(0, size)
  const selectedRecallCardIds = selectedQuestionIds
    .map(id => input.recallCardIdByQuestionId.get(id))
    .filter((id): id is string => typeof id === 'string')
  return { selectedQuestionIds, selectedRecallCardIds }
}

/** Kartenauswahl des Karten-Schritts. Nutzt exakt die Eligibility der
 *  bestehenden Paketauswahl (buildTodayPackageSelection) und schließt aktive
 *  fremde Ausführungen, Holdouts und die Recall-Karten derselben Sitzung aus.
 *  `cardLimit = 0` übernimmt alle verbleibenden Kandidaten. */
export function selectCourseCardIds(input: {
  candidateCards: readonly Card[]
  excludedCardIds: ReadonlySet<string>
  selectedRecallCardIds: ReadonlySet<string>
  cardLimit: number
  now: number
  nextDayStartsAt: number
  learnAheadMinutes: number
  algorithm: 'fsrs' | 'sm2'
  runSeed: string
}): string[] {
  const candidates = input.candidateCards.filter(
    card => !input.excludedCardIds.has(card.id) && !input.selectedRecallCardIds.has(card.id),
  )
  // `algorithm` dient der Vertragsparität mit der Study-Session; die
  // schedulerspezifische Fälligkeit steckt bereits in den Kartenfeldern,
  // die buildTodayPackageSelection/sortStudyCards auswerten.
  void input.algorithm
  return buildTodayPackageSelection(candidates as Card[], input.cardLimit, {
    nowMs: input.now,
    nextDayStartsAt: input.nextDayStartsAt,
    learnAheadMinutes: input.learnAheadMinutes,
    runSeed: input.runSeed,
  }).map(card => card.id)
}

// ── Eingefrorene Kursausführung (Vertrag §23.2) ─────────────────────────────

export function createCourseExecution(input: {
  executionId: string
  profileId: string
  evidenceEpoch: number
  definition: LearningUnitDefinition
  content: VideoContentMapEntry
  selectedCardIds: string[]
  selectedRecallQuestionIds: string[]
  selectedRecallCardIds: string[]
  recallSeed: string
  recallQuestionVersionsById: ReadonlyMap<string, string>
  sourceSnapshotId: string
  contentManifestVersion: string
  contentVersionsByCardId: ReadonlyMap<string, string>
  now: number
}): LearningUnitExecution {
  if (input.definition.type !== 'course' || input.definition.videoIndex === undefined) {
    throw new Error(`createCourseExecution: ${input.definition.unitId} ist keine Course-Definition`)
  }
  if (input.definition.videoIndex !== input.content.videoIndex) {
    throw new Error(
      `createCourseExecution: Definition (Video ${input.definition.videoIndex}) und Content-Map (Video ${input.content.videoIndex}) passen nicht zusammen`,
    )
  }
  const allowedCards = new Set(input.content.courseCardIds)
  for (const cardId of input.selectedCardIds) {
    if (!allowedCards.has(cardId)) {
      throw new Error(`createCourseExecution: Karte ${cardId} ist nicht für Video ${input.content.videoIndex} gemappt`)
    }
  }
  const allowedQuestions = new Set(input.content.recallQuestionIds)
  for (const questionId of input.selectedRecallQuestionIds) {
    if (!allowedQuestions.has(questionId)) {
      throw new Error(`createCourseExecution: Recall-Frage ${questionId} gehört nicht zu Video ${input.content.videoIndex}`)
    }
  }

  const recallQuestionVersions: Record<string, string> = {}
  for (const questionId of input.selectedRecallQuestionIds) {
    recallQuestionVersions[questionId] = input.recallQuestionVersionsById.get(questionId) ?? 'v1'
  }
  const contentVersions: Record<string, string> = {}
  for (const cardId of input.selectedCardIds) {
    contentVersions[cardId] = input.contentVersionsByCardId.get(cardId) ?? 'v1'
  }

  return {
    executionId: input.executionId,
    unitId: input.definition.unitId,
    profileId: input.profileId,
    evidenceEpoch: input.evidenceEpoch,
    type: 'course',
    createdAt: input.now,
    cardIds: [...input.selectedCardIds],
    recallQuestionIds: [...input.selectedRecallQuestionIds],
    recallQuestionVersions,
    recallCardIds: [...input.selectedRecallCardIds],
    recallSeed: input.recallSeed,
    sourceSnapshotId: input.sourceSnapshotId,
    contentManifestVersion: input.contentManifestVersion,
    contentVersions,
  }
}

// ── Schrittstatus (Vertrag §23.2, Gating §8.2) ──────────────────────────────

function sameStringSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every(item => set.has(item))
}

/** Recall zählt nur von einem Run derselben Execution nach deren Start mit
 *  exakt den eingefrorenen Frage-IDs und -Versionen. Ein Tageswechsel ändert
 *  nichts: alle Vergleiche hängen an `execution.createdAt`, nie an einem
 *  Tagesanfang. Öffnen eines Videos allein zählt nicht als angesehen. */
export function computeCourseStepState(input: {
  execution: LearningUnitExecution
  videoProgress?: VideoProgressRecord
  recallRuns: VideoRecallRun[]
  reviewedCardIdsSinceStart: ReadonlySet<string>
}): {
  videoDone: boolean
  recallDone: boolean
  cardsDone: boolean
  currentStep: 'video' | 'recall' | 'cards' | 'done'
} {
  const execution = input.execution
  if (execution.type !== 'course') {
    throw new Error(`computeCourseStepState: Execution ${execution.executionId} ist kein Course`)
  }

  const videoDone =
    input.videoProgress?.watchedAt !== undefined &&
    (input.videoProgress.watchedMethod === 'ended' || input.videoProgress.watchedMethod === 'manual')

  const hasRecallStep = execution.recallQuestionIds.length > 0
  const recallDone =
    !hasRecallStep ||
    input.recallRuns.some(run => {
      if (run.executionId !== execution.executionId) return false
      if (run.profileId !== execution.profileId) return false
      if (run.completedAt < execution.createdAt) return false
      if (run.contentManifestVersion !== execution.contentManifestVersion) return false
      if (run.sourceSnapshotId !== execution.sourceSnapshotId) return false
      if (!sameStringSet(run.questionIds, execution.recallQuestionIds)) return false
      return execution.recallQuestionIds.every(
        id => run.questionVersionById[id] === execution.recallQuestionVersions[id],
      )
    })

  const hasCardsStep = execution.cardIds.length > 0
  const cardsDone = !hasCardsStep || execution.cardIds.every(id => input.reviewedCardIdsSinceStart.has(id))

  const currentStep = !videoDone ? 'video' : !recallDone ? 'recall' : !cardsDone ? 'cards' : 'done'
  return { videoDone, recallDone, cardsDone, currentStep }
}

// ── Legacy-Pointer-Overlay (Übergang bis Phase-2-Verkabelung) ───────────────

export interface LegacyCoursePointerSnapshot {
  /** Playlist-Index des zuletzt abgeschlossenen Videos (0 = noch keins). */
  lastCompletedIndex: number
  lastCompletedAt: number
  /** Playlist-Index des aktuell angebotenen Pakets (0 = keins aktiv). */
  activeIndex: number
  activeStartedAt: number
}

/**
 * Read-only-Anzeige-Overlay: Solange die Heute-Paket-Mechanik der live
 * fortschreitende Kurspfad ist, spiegeln die dedizierten Unit-States nur den
 * einmaligen Legacy-Import wider. Diese Funktion legt den aktuellen Pointer
 * über die persistierten States, damit Liste/Sheet nicht hinter der Kachel
 * zurückbleiben. Sie schreibt nichts und wertet nur auf: fehlende/`notStarted`
 * Course-States werden zu `completed` bzw. `inProgress`; persistierte
 * `inProgress`-/`completed`-States bleiben unangetastet. Die synthetische
 * `activeExecutionId` (`legacy:pointer:*`) markiert einen Legacy-Lauf und
 * referenziert keine gespeicherte Ausführung.
 */
export function overlayLegacyCourseStates(input: {
  states: readonly LearningUnitState[]
  pointer: LegacyCoursePointerSnapshot | null
  profileId: string
  evidenceEpoch: number
  now: number
}): Map<string, LearningUnitState> {
  const byUnitId = new Map(input.states.map(state => [state.unitId, state]))
  const pointer = input.pointer
  if (!pointer) return byUnitId

  const lastCompleted = Math.min(Math.max(pointer.lastCompletedIndex, 0), COURSE_LAST_INDEX)
  for (let index = COURSE_FIRST_INDEX; index <= lastCompleted; index++) {
    const unitId = formatCourseUnitId(index)
    const existing = byUnitId.get(unitId)
    if (existing && existing.activityStatus !== 'notStarted') continue
    const completedAt = pointer.lastCompletedAt > 0 ? pointer.lastCompletedAt : input.now
    byUnitId.set(unitId, {
      profileId: input.profileId,
      evidenceEpoch: input.evidenceEpoch,
      unitId,
      activityStatus: 'completed',
      currentStep: 'done',
      completedAt,
      lastCompletedAt: completedAt,
      lastActivityAt: completedAt,
      updatedAt: input.now,
    })
  }

  if (
    pointer.activeIndex >= COURSE_FIRST_INDEX &&
    pointer.activeIndex <= COURSE_LAST_INDEX &&
    pointer.activeIndex > lastCompleted &&
    pointer.activeStartedAt > 0
  ) {
    const unitId = formatCourseUnitId(pointer.activeIndex)
    const existing = byUnitId.get(unitId)
    if (!existing || existing.activityStatus === 'notStarted') {
      byUnitId.set(unitId, {
        profileId: input.profileId,
        evidenceEpoch: input.evidenceEpoch,
        unitId,
        activityStatus: 'inProgress',
        currentStep: 'video',
        activeExecutionId: `legacy:pointer:${pointer.activeIndex}`,
        startedAt: pointer.activeStartedAt,
        lastActivityAt: pointer.activeStartedAt,
        updatedAt: input.now,
      })
    }
  }

  return byUnitId
}

// ── Leaf-Coverage (Vertrag §23.2, Abnahme §5.1) ─────────────────────────────

/** Coverage prüft Leaf-Pfade, nicht Ressourcensummen: `covered` erfordert je
 *  Requirement ein fachlich freigegebenes Lernasset UND ein bewertbares Item;
 *  bei Szenariozielen zusätzlich einen praktischen Pfad. */
export function buildRequirementCoverage(input: {
  sourceSnapshotId: string
  requirements: ExamRequirement[]
  criticalErrorDefinitions: CriticalErrorDefinition[]
  coverage: RequirementCoverage[]
  now: number
}): CoverageReport {
  const definitionsById = new Map(input.criticalErrorDefinitions.map(d => [d.errorClassId, d]))
  const byRequirementId: Record<string, RequirementCoverage> = {}
  for (const entry of input.coverage) byRequirementId[entry.requirementId] = entry

  const blockingRequirementIds: string[] = []
  let coveredCount = 0
  for (const requirement of input.requirements) {
    const entry = byRequirementId[requirement.requirementId]
    const hasEntry = entry !== undefined
    const meetsBase =
      hasEntry &&
      entry.qaStatus === 'covered' &&
      entry.learningAssetIds.length > 0 &&
      entry.assessmentItemIds.length > 0 &&
      (!requirement.scenarioRequired || entry.practicalItemIds.length > 0) &&
      entry.reviewer !== undefined
    const criticalOk =
      requirement.criticality !== 'critical' ||
      (requirement.criticalErrorClassIds.length > 0 &&
        requirement.criticalErrorClassIds.every(id => definitionsById.has(id)))
    if (meetsBase && criticalOk) {
      coveredCount += 1
    } else {
      blockingRequirementIds.push(requirement.requirementId)
      if (!hasEntry) {
        byRequirementId[requirement.requirementId] = {
          requirementId: requirement.requirementId,
          learningAssetIds: [],
          assessmentItemIds: [],
          practicalItemIds: [],
          qaStatus: 'content-missing',
        }
      }
    }
  }

  return {
    sourceSnapshotId: input.sourceSnapshotId,
    requirementCount: input.requirements.length,
    coveredCount,
    byRequirementId,
    blockingRequirementIds,
    generatedAt: input.now,
  }
}

export interface ObjectiveLeafCoverage {
  totalLeafs: number
  coveredLeafs: number
}

/** Leaf-Abdeckung je Objective aus dem Coverage-Report — sichtbare Gaps pro
 *  kleinstem prüfbarem Pfad, keine Ressourcensummen (§5.1). */
export function summarizeLeafCoverageByObjective(input: {
  requirements: ExamRequirement[]
  report: CoverageReport
}): Map<string, ObjectiveLeafCoverage> {
  const blocking = new Set(input.report.blockingRequirementIds)
  const byObjective = new Map<string, ObjectiveLeafCoverage>()
  for (const requirement of input.requirements) {
    const entry = byObjective.get(requirement.objectiveId) ?? { totalLeafs: 0, coveredLeafs: 0 }
    entry.totalLeafs += 1
    if (!blocking.has(requirement.requirementId)) entry.coveredLeafs += 1
    byObjective.set(requirement.objectiveId, entry)
  }
  return byObjective
}
