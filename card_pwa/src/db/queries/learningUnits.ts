/**
 * AI_CONTEXT:
 * Role: Profile-scoped persistence layer of the dedicated SY0-701 learning-unit system (Phase 2): unit lifecycle, frozen executions, video/recall progress, draft exam plan, one-time legacy owner import.
 * Used by: LearningUnitsView, VideosView, SettingsContext, useLearningUnits, learningUnitRunner, syncPull, dbBackup, and tests.
 * Important: Every function takes an explicit `profileId` and never re-derives scope after an `await` (Detailplan §16). Writes are atomic Dexie transactions; the legacy import runs exactly once via `migrationMeta['legacy-learning-v1']`.
 */
import {
  learningUnitsDb as defaultDb,
  type DraftLearnerExamPlanRecord,
  type LabAttemptRecord,
  type LearningUnitsDB,
  type LegacyAssessmentHintRecord,
  type MigrationMetaRecord,
  type ProfileLearningStateRecord,
  type ReviewUnitAttemptRecord,
} from '../learningUnitsDb'
import type {
  LearningUnitExecution,
  LearningUnitState,
  VideoProgressRecord,
  VideoRecallRun,
} from '../../utils/learningUnits'
import {
  COURSE_FIRST_INDEX,
  COURSE_LAST_INDEX,
  computeRecallRunVerdict,
  formatCourseUnitId,
  formatLabUnitId,
} from '../../utils/learningUnits'

const LEGACY_LEARNING_MARKER = 'legacy-learning-v1'

/** Testbarkeit: alle Funktionen akzeptieren optional eine eigene DB-Instanz. */
type Db = Pick<
  LearningUnitsDB,
  | 'profileLearningState'
  | 'learningUnitState'
  | 'unitExecutions'
  | 'reviewUnitAttempts'
  | 'videoProgressByProfile'
  | 'videoRecallRuns'
  | 'learnerExamPlans'
  | 'legacyAssessmentHints'
  | 'migrationMeta'
  | 'labAttempts'
  | 'transaction'
>

// ── Profil-Lernzustand ──────────────────────────────────────────────────────

export async function getOrCreateProfileLearningState(
  profileId: string,
  now: number,
  db: Db = defaultDb,
): Promise<ProfileLearningStateRecord> {
  return db.transaction('rw', db.profileLearningState, async () => {
    const existing = await db.profileLearningState.get(profileId)
    if (existing) return existing
    const created: ProfileLearningStateRecord = { profileId, evidenceEpoch: 1, revision: 0, updatedAt: now }
    await db.profileLearningState.put(created)
    return created
  })
}

// ── Unit-Lebenszyklus ───────────────────────────────────────────────────────

export async function getLearningUnitState(
  profileId: string,
  unitId: string,
  db: Db = defaultDb,
): Promise<LearningUnitState | undefined> {
  return db.learningUnitState.get([profileId, unitId])
}

export async function listLearningUnitStates(profileId: string, db: Db = defaultDb): Promise<LearningUnitState[]> {
  return db.learningUnitState.where('profileId').equals(profileId).toArray()
}

export async function getExecution(
  executionId: string,
  db: Db = defaultDb,
): Promise<LearningUnitExecution | undefined> {
  return db.unitExecutions.get(executionId)
}

export async function getActiveExecution(
  profileId: string,
  unitId: string,
  db: Db = defaultDb,
): Promise<LearningUnitExecution | undefined> {
  const state = await db.learningUnitState.get([profileId, unitId])
  if (!state?.activeExecutionId) return undefined
  const execution = await db.unitExecutions.get(state.activeExecutionId)
  return execution?.profileId === profileId ? execution : undefined
}

/** Startet eine Unit mit einer bereits (pur) gebauten, eingefrorenen Execution.
 *  Atomar: Execution + Unit-State in einer Transaktion; eine bereits aktive
 *  andere Execution derselben Unit lehnt den Start ab (Resume statt Neustart). */
export async function startUnitExecution(
  execution: LearningUnitExecution,
  now: number,
  db: Db = defaultDb,
): Promise<LearningUnitState> {
  return db.transaction('rw', [db.learningUnitState, db.unitExecutions, db.profileLearningState], async () => {
    const key: [string, string] = [execution.profileId, execution.unitId]
    const existing = await db.learningUnitState.get(key)
    if (existing?.activityStatus === 'inProgress' && existing.activeExecutionId && existing.activeExecutionId !== execution.executionId) {
      throw new Error(
        `startUnitExecution: Unit ${execution.unitId} hat bereits die aktive Ausführung ${existing.activeExecutionId}`,
      )
    }
    if (await db.unitExecutions.get(execution.executionId)) {
      throw new Error(`startUnitExecution: executionId ${execution.executionId} existiert bereits`)
    }
    const epochState = await db.profileLearningState.get(execution.profileId)
    const evidenceEpoch = epochState?.evidenceEpoch ?? 1
    if (!epochState) {
      await db.profileLearningState.put({ profileId: execution.profileId, evidenceEpoch, revision: 0, updatedAt: now })
    }

    await db.unitExecutions.put(execution)
    const firstStep = execution.type === 'course' ? 'video' : execution.type === 'review' ? 'cards' : execution.type
    const state: LearningUnitState = {
      profileId: execution.profileId,
      evidenceEpoch,
      unitId: execution.unitId,
      activityStatus: 'inProgress',
      currentStep: firstStep,
      activeExecutionId: execution.executionId,
      startedAt: existing?.startedAt ?? execution.createdAt,
      completedAt: undefined,
      lastCompletedAt: existing?.lastCompletedAt,
      lastActivityAt: now,
      updatedAt: now,
    }
    await db.learningUnitState.put(state)
    return state
  })
}

/** Aktualisiert nur den Schrittstand/die Aktivität einer laufenden Unit. */
export async function touchUnitActivity(
  profileId: string,
  unitId: string,
  currentStep: LearningUnitState['currentStep'],
  now: number,
  db: Db = defaultDb,
): Promise<void> {
  await db.transaction('rw', db.learningUnitState, async () => {
    const state = await db.learningUnitState.get([profileId, unitId])
    if (!state || state.activityStatus !== 'inProgress') return
    await db.learningUnitState.put({ ...state, currentStep, lastActivityAt: now, updatedAt: now })
  })
}

export async function completeUnitExecution(
  profileId: string,
  executionId: string,
  now: number,
  db: Db = defaultDb,
): Promise<LearningUnitState> {
  return db.transaction('rw', [db.learningUnitState, db.unitExecutions], async () => {
    const execution = await db.unitExecutions.get(executionId)
    if (!execution || execution.profileId !== profileId) {
      throw new Error(`completeUnitExecution: Ausführung ${executionId} gehört nicht zu Profil ${profileId}`)
    }
    const state = await db.learningUnitState.get([profileId, execution.unitId])
    if (!state || state.activeExecutionId !== executionId) {
      throw new Error(`completeUnitExecution: ${executionId} ist nicht die aktive Ausführung von ${execution.unitId}`)
    }
    const completed: LearningUnitState = {
      ...state,
      activityStatus: 'completed',
      currentStep: 'done',
      activeExecutionId: undefined,
      completedAt: now,
      lastCompletedAt: now,
      lastActivityAt: now,
      updatedAt: now,
    }
    await db.learningUnitState.put(completed)
    return completed
  })
}

/** Persistiert den Abschluss einer rein synthetischen Legacy-Pointer-Unit, für
 *  die nie eine echte Execution angelegt wurde. Ausschließlich für die
 *  Migration bereits vorhandener Video-/Recall-Signale; moderne Ausführungen
 *  werden weiterhin nur über completeUnitExecution abgeschlossen. */
export async function completeLegacyPointerCourseUnit(
  input: { profileId: string; unitId: string; now: number },
  db: Db = defaultDb,
): Promise<LearningUnitState> {
  return db.transaction('rw', [db.learningUnitState, db.profileLearningState], async () => {
    const existing = await db.learningUnitState.get([input.profileId, input.unitId])
    const profileState = await db.profileLearningState.get(input.profileId)
    const completed: LearningUnitState = {
      profileId: input.profileId,
      evidenceEpoch: existing?.evidenceEpoch ?? profileState?.evidenceEpoch ?? 1,
      unitId: input.unitId,
      activityStatus: 'completed',
      currentStep: 'done',
      startedAt: existing?.startedAt,
      completedAt: input.now,
      lastCompletedAt: input.now,
      lastActivityAt: input.now,
      updatedAt: input.now,
    }
    await db.learningUnitState.put(completed)
    return completed
  })
}

/** Schließt einen Review-Zyklus samt Tagesprotokoll in derselben Learning-DB-
 * Transaktion ab. So kann ein Fehler zwischen Status und Tageskappe keinen
 * halb abgeschlossenen Zustand hinterlassen. */
export async function completeReviewUnitExecution(
  input: {
    profileId: string
    executionId: string
    attempt: ReviewUnitAttemptRecord
    now: number
  },
  db: Db = defaultDb,
): Promise<LearningUnitState> {
  return db.transaction(
    'rw',
    [db.learningUnitState, db.unitExecutions, db.reviewUnitAttempts],
    async () => {
      const execution = await db.unitExecutions.get(input.executionId)
      if (!execution || execution.profileId !== input.profileId || execution.type !== 'review') {
        throw new Error(`completeReviewUnitExecution: ungültige Review-Ausführung ${input.executionId}`)
      }
      const state = await db.learningUnitState.get([input.profileId, execution.unitId])
      if (!state || state.activeExecutionId !== input.executionId) {
        throw new Error(`completeReviewUnitExecution: ${input.executionId} ist nicht aktiv`)
      }
      if (
        input.attempt.profileId !== input.profileId ||
        input.attempt.executionId !== input.executionId ||
        input.attempt.unitId !== execution.unitId
      ) {
        throw new Error('completeReviewUnitExecution: Attempt gehört nicht zur Ausführung')
      }
      if (await db.reviewUnitAttempts.get(input.attempt.attemptId)) {
        throw new Error(`completeReviewUnitExecution: attemptId ${input.attempt.attemptId} existiert bereits`)
      }

      const completed: LearningUnitState = {
        ...state,
        activityStatus: 'completed',
        currentStep: 'done',
        activeExecutionId: undefined,
        completedAt: input.now,
        lastCompletedAt: input.now,
        lastActivityAt: input.now,
        updatedAt: input.now,
      }
      await db.reviewUnitAttempts.put(input.attempt)
      await db.learningUnitState.put(completed)
      return completed
    },
  )
}

/** Expliziter Abbruch: Reservierung lösen, Ausführung als Historie behalten. */
export async function abortUnitExecution(
  profileId: string,
  executionId: string,
  now: number,
  db: Db = defaultDb,
): Promise<void> {
  await db.transaction('rw', [db.learningUnitState, db.unitExecutions], async () => {
    const execution = await db.unitExecutions.get(executionId)
    if (!execution || execution.profileId !== profileId) return
    const state = await db.learningUnitState.get([profileId, execution.unitId])
    if (!state || state.activeExecutionId !== executionId) return
    await db.learningUnitState.put({
      ...state,
      activityStatus: state.lastCompletedAt ? 'completed' : 'notStarted',
      currentStep: state.lastCompletedAt ? 'done' : execution.type === 'course' ? 'video' : 'cards',
      activeExecutionId: undefined,
      lastActivityAt: now,
      updatedAt: now,
    })
  })
}

export interface ResetLearningEvidenceResult {
  evidenceEpoch: number
  abortedUnits: number
  resetEventId: string
}

/**
 * Expliziter Lernreset des dedizierten Systems (§16): erhöht atomar die
 * Evidence-Epoch und bricht offene Ausführungen ab. Executions, Recall-Läufe
 * und Video-Fortschritt bleiben als append-only Audit-Historie erhalten —
 * Zeilen alter Epochen zählen nur nicht mehr als Evidenz. Abgeschlossene
 * Units behalten ihren Aktivitätsstatus: Aktivität ist keine Evidenz.
 */
export async function resetProfileLearningEvidence(
  profileId: string,
  now: number,
  db: Db = defaultDb,
): Promise<ResetLearningEvidenceResult> {
  return db.transaction('rw', [db.profileLearningState, db.learningUnitState, db.unitExecutions, db.labAttempts], async () => {
    const existing = await db.profileLearningState.get(profileId)
    const resetEventId = crypto.randomUUID()
    const next: ProfileLearningStateRecord = {
      profileId,
      evidenceEpoch: (existing?.evidenceEpoch ?? 1) + 1,
      revision: (existing?.revision ?? 0) + 1,
      lastResetEventId: resetEventId,
      serverWatermark: existing?.serverWatermark,
      updatedAt: now,
    }
    await db.profileLearningState.put(next)

    const inProgress = await db.learningUnitState
      .where('[profileId+activityStatus]')
      .equals([profileId, 'inProgress'])
      .toArray()
    let abortedUnits = 0
    for (const state of inProgress) {
      const execution = state.activeExecutionId
        ? await db.unitExecutions.get(state.activeExecutionId)
        : undefined
      await db.learningUnitState.put({
        ...state,
        activityStatus: state.lastCompletedAt ? 'completed' : 'notStarted',
        currentStep: state.lastCompletedAt ? 'done' : execution?.type === 'course' ? 'video' : 'cards',
        activeExecutionId: undefined,
        lastActivityAt: now,
        updatedAt: now,
      })
      abortedUnits += 1
    }

    // Ein Labversuch ohne aktive Unit darf nach dem Epoch-Wechsel nicht später
    // wieder aufgenommen und als Abschluss der neuen Epoch eingereicht werden.
    const activeLabAttempts = await db.labAttempts
      .where('[profileId+status]')
      .equals([profileId, 'inProgress'])
      .toArray()
    for (const attempt of activeLabAttempts) {
      await db.labAttempts.put({
        ...attempt,
        status: 'abandoned',
        abandonedAt: now,
        revision: attempt.revision + 1,
        updatedAt: now,
      })
    }

    return { evidenceEpoch: next.evidenceEpoch, abortedUnits, resetEventId }
  })
}

/** IDs aller Karten, die aktive Ausführungen dieses Profils gerade reservieren
 *  (Ausschlussmenge für neue Auswahlen, §23.2). */
export async function listReservedCardIds(profileId: string, db: Db = defaultDb): Promise<Set<string>> {
  const states = await db.learningUnitState
    .where('[profileId+activityStatus]')
    .equals([profileId, 'inProgress'])
    .toArray()
  const reserved = new Set<string>()
  for (const state of states) {
    if (!state.activeExecutionId) continue
    const execution = await db.unitExecutions.get(state.activeExecutionId)
    if (execution && execution.profileId === profileId && (execution.type === 'course' || execution.type === 'review')) {
      for (const cardId of execution.cardIds) reserved.add(cardId)
    }
  }
  return reserved
}

// ── Review-Versuche (Phase 3, §11: Protokoll + Tageskappe) ─────────────────

/** Protokolliert einen abgeschlossenen Review-Durchlauf append-only. */
export async function recordReviewUnitAttempt(
  record: ReviewUnitAttemptRecord,
  db: Db = defaultDb,
): Promise<void> {
  await db.transaction('rw', db.reviewUnitAttempts, async () => {
    if (await db.reviewUnitAttempts.get(record.attemptId)) {
      throw new Error(`recordReviewUnitAttempt: attemptId ${record.attemptId} existiert bereits (append-only)`)
    }
    await db.reviewUnitAttempts.put(record)
  })
}

/** Abgeschlossene Review-Durchläufe eines Profils am lokalen Lerntag —
 *  Grundlage der Tageskappe (höchstens eine Empfehlung pro Lerntag).
 *  Abgebrochene Versuche zählen nicht: die Kappe hängt am Abschlussverlauf. */
export async function countReviewUnitAttemptsForDay(
  profileId: string,
  localLearningDay: string,
  db: Db = defaultDb,
): Promise<number> {
  return db.reviewUnitAttempts
    .where('[profileId+localLearningDay]')
    .equals([profileId, localLearningDay])
    .filter(attempt => attempt.status !== 'abandoned')
    .count()
}

// ── Video-Fortschritt (pro Profil UND Video, §8.2) ──────────────────────────

export async function markVideoOpened(
  input: { profileId: string; videoIndex: number; objectiveId: string; now: number },
  db: Db = defaultDb,
): Promise<void> {
  await db.transaction('rw', [db.videoProgressByProfile, db.profileLearningState], async () => {
    const key: [string, number] = [input.profileId, input.videoIndex]
    const existing = await db.videoProgressByProfile.get(key)
    const epoch = (await db.profileLearningState.get(input.profileId))?.evidenceEpoch ?? 1
    await db.videoProgressByProfile.put({
      profileId: input.profileId,
      evidenceEpoch: existing?.evidenceEpoch ?? epoch,
      videoIndex: input.videoIndex,
      objectiveId: input.objectiveId,
      ...existing,
      openedAt: existing?.openedAt ?? input.now,
      updatedAt: input.now,
    })
  })
}

/** `watchedAt` ausschließlich über Player-`ended` oder expliziten Befehl (§8.2). */
export async function markVideoWatched(
  input: { profileId: string; videoIndex: number; objectiveId: string; method: 'ended' | 'manual'; now: number },
  db: Db = defaultDb,
): Promise<VideoProgressRecord> {
  return db.transaction('rw', [db.videoProgressByProfile, db.profileLearningState], async () => {
    const key: [string, number] = [input.profileId, input.videoIndex]
    const existing = await db.videoProgressByProfile.get(key)
    const epoch = (await db.profileLearningState.get(input.profileId))?.evidenceEpoch ?? 1
    const record: VideoProgressRecord = {
      profileId: input.profileId,
      evidenceEpoch: existing?.evidenceEpoch ?? epoch,
      videoIndex: input.videoIndex,
      objectiveId: input.objectiveId,
      openedAt: existing?.openedAt,
      confidence: existing?.confidence,
      confidenceAt: existing?.confidenceAt,
      legacyHint: existing?.legacyHint,
      watchedAt: existing?.watchedAt ?? input.now,
      watchedMethod: existing?.watchedMethod ?? input.method,
      updatedAt: input.now,
    }
    await db.videoProgressByProfile.put(record)
    return record
  })
}

/** Entfernt den dedizierten, profil-/videobezogenen Gesehen- und Confidence-
 * Stand. Unit-Abschlusshistorie bleibt erhalten; ein bewusst gestarteter neuer
 * Course-Durchlauf muss das Video danach aber wieder ansehen. */
export async function clearVideoProgressForProfile(profileId: string, db: Db = defaultDb): Promise<number> {
  return db.transaction('rw', db.videoProgressByProfile, async () => {
    const rows = await db.videoProgressByProfile.where('profileId').equals(profileId).toArray()
    await db.videoProgressByProfile.bulkDelete(rows.map(row => [row.profileId, row.videoIndex]))
    return rows.length
  })
}

export async function setVideoConfidence(
  input: { profileId: string; videoIndex: number; objectiveId: string; confidence: 'gaps' | 'ok' | 'solid'; now: number },
  db: Db = defaultDb,
): Promise<void> {
  await db.transaction('rw', [db.videoProgressByProfile, db.profileLearningState], async () => {
    const key: [string, number] = [input.profileId, input.videoIndex]
    const existing = await db.videoProgressByProfile.get(key)
    const epoch = (await db.profileLearningState.get(input.profileId))?.evidenceEpoch ?? 1
    await db.videoProgressByProfile.put({
      profileId: input.profileId,
      evidenceEpoch: existing?.evidenceEpoch ?? epoch,
      videoIndex: input.videoIndex,
      objectiveId: input.objectiveId,
      ...existing,
      confidence: input.confidence,
      confidenceAt: input.now,
      updatedAt: input.now,
    })
  })
}

export async function getVideoProgress(
  profileId: string,
  videoIndex: number,
  db: Db = defaultDb,
): Promise<VideoProgressRecord | undefined> {
  return db.videoProgressByProfile.get([profileId, videoIndex])
}

// ── Recall-Läufe (append-only, §16.1) ───────────────────────────────────────

export async function recordVideoRecallRun(run: VideoRecallRun, db: Db = defaultDb): Promise<void> {
  await db.transaction('rw', [db.videoRecallRuns, db.unitExecutions], async () => {
    if (await db.videoRecallRuns.get(run.runId)) {
      throw new Error(`recordVideoRecallRun: runId ${run.runId} existiert bereits (append-only)`)
    }
    if (run.executionId !== null) {
      const execution = await db.unitExecutions.get(run.executionId)
      if (!execution || execution.profileId !== run.profileId) {
        throw new Error(`recordVideoRecallRun: Ausführung ${run.executionId} gehört nicht zu Profil ${run.profileId}`)
      }
      if (run.completedAt < execution.createdAt) {
        throw new Error('recordVideoRecallRun: Lauf liegt vor dem Start der Ausführung')
      }
    }
    await db.videoRecallRuns.put(run)
  })
}

/** Höchstens die letzten fünf Läufe pro Profil/Video für die UI (§16.1);
 *  das Append-only-Audit bleibt vollständig erhalten. */
export async function listRecentVideoRecallRuns(
  profileId: string,
  videoIndex: number,
  db: Db = defaultDb,
  limit = 5,
): Promise<VideoRecallRun[]> {
  const runs = await db.videoRecallRuns
    .where('[profileId+videoIndex]')
    .equals([profileId, videoIndex])
    .toArray()
  return runs.sort((a, b) => b.completedAt - a.completedAt).slice(0, limit)
}

/** Alle Recall-Läufe eines Profils in der aktuellen Evidence-Epoch — Basis der
 *  formativen Stichprobenanzeige. Läufe alter Epochen bleiben Audit, zählen
 *  aber nicht mehr. */
export async function listVideoRecallRunsForProfile(
  profileId: string,
  db: Db = defaultDb,
): Promise<VideoRecallRun[]> {
  const [state, runs] = await Promise.all([
    db.profileLearningState.get(profileId),
    db.videoRecallRuns.where('profileId').equals(profileId).toArray(),
  ])
  const epoch = state?.evidenceEpoch ?? 1
  return runs.filter(run => run.evidenceEpoch === epoch)
}

// ── Labversuche (Phase 4, §13.2) ────────────────────────────────────────────

export async function getActiveLabAttempt(
  profileId: string,
  scenarioId: string,
  db: Db = defaultDb,
): Promise<LabAttemptRecord | undefined> {
  const attempts = await db.labAttempts
    .where('[profileId+scenarioId]')
    .equals([profileId, scenarioId])
    .toArray()
  return attempts.find(attempt => attempt.status === 'inProgress')
}

/** Startet einen Labversuch mit vollständig eingefrorenem Szenario oder liefert
 *  den laufenden Versuch zurück (höchstens einer je Profil+Szenario). */
export async function startLabAttempt(
  input: {
    profileId: string
    scenarioId: string
    scenarioVersion: string
    language: string
    sourceSnapshotId: string
    contentManifestVersion: string
    scenarioSnapshot: unknown
    now: number
  },
  db: Db = defaultDb,
): Promise<LabAttemptRecord> {
  return db.transaction('rw', [db.labAttempts, db.profileLearningState], async () => {
    const attempts = await db.labAttempts
      .where('[profileId+scenarioId]')
      .equals([input.profileId, input.scenarioId])
      .toArray()
    const active = attempts.find(attempt => attempt.status === 'inProgress')
    if (active) return active

    const epochState = await db.profileLearningState.get(input.profileId)
    const record: LabAttemptRecord = {
      attemptId: crypto.randomUUID(),
      profileId: input.profileId,
      evidenceEpoch: epochState?.evidenceEpoch ?? 1,
      scenarioId: input.scenarioId,
      scenarioVersion: input.scenarioVersion,
      sourceSnapshotId: input.sourceSnapshotId,
      contentManifestVersion: input.contentManifestVersion,
      language: input.language,
      scenarioSnapshot: JSON.parse(JSON.stringify(input.scenarioSnapshot)),
      origin: 'attempt',
      startedAt: input.now,
      updatedAt: input.now,
      revision: 0,
      status: 'inProgress',
      answerByStepId: {},
      failedAttemptCount: 0,
      elapsedMs: 0,
    }
    await db.labAttempts.put(record)
    return record
  })
}

/** Resume-Update eines laufenden Versuchs; abgegebene sind unveränderlich. */
export async function updateLabAttempt(
  input: {
    profileId: string
    attemptId: string
    answerByStepId?: Record<string, unknown>
    failedAttemptCount?: number
    elapsedMs?: number
    now: number
  },
  db: Db = defaultDb,
): Promise<LabAttemptRecord> {
  return db.transaction('rw', db.labAttempts, async () => {
    const attempt = await db.labAttempts.get(input.attemptId)
    if (!attempt || attempt.profileId !== input.profileId) {
      throw new Error(`updateLabAttempt: Versuch ${input.attemptId} gehört nicht zu Profil ${input.profileId}`)
    }
    if (attempt.status !== 'inProgress') {
      throw new Error(`updateLabAttempt: Versuch ${input.attemptId} ist ${attempt.status} und unveränderlich`)
    }
    const updated: LabAttemptRecord = {
      ...attempt,
      answerByStepId: input.answerByStepId ?? attempt.answerByStepId,
      failedAttemptCount: input.failedAttemptCount ?? attempt.failedAttemptCount,
      elapsedMs: input.elapsedMs ?? attempt.elapsedMs,
      revision: attempt.revision + 1,
      updatedAt: input.now,
    }
    await db.labAttempts.put(updated)
    return updated
  })
}

/** Abgabe: friert Antworten und Teilpunkte endgültig ein (§13.2). */
export async function submitLabAttempt(
  input: {
    profileId: string
    attemptId: string
    answerByStepId?: Record<string, unknown>
    scoreEarned: number
    scorePossible: number
    elapsedMs?: number
    now: number
  },
  db: Db = defaultDb,
): Promise<LabAttemptRecord> {
  return db.transaction('rw', db.labAttempts, async () => {
    const attempt = await db.labAttempts.get(input.attemptId)
    if (!attempt || attempt.profileId !== input.profileId) {
      throw new Error(`submitLabAttempt: Versuch ${input.attemptId} gehört nicht zu Profil ${input.profileId}`)
    }
    if (attempt.status !== 'inProgress') {
      throw new Error(`submitLabAttempt: Versuch ${input.attemptId} ist ${attempt.status} und unveränderlich`)
    }
    const submitted: LabAttemptRecord = {
      ...attempt,
      answerByStepId: input.answerByStepId ?? attempt.answerByStepId,
      scoreEarned: input.scoreEarned,
      scorePossible: input.scorePossible,
      elapsedMs: input.elapsedMs ?? attempt.elapsedMs,
      revision: attempt.revision + 1,
      status: 'submitted',
      submittedAt: input.now,
      updatedAt: input.now,
    }
    await db.labAttempts.put(submitted)
    return submitted
  })
}

/** Atomare Lab-Abgabe plus Unit-Abschluss. Der Versuch und der sichtbare
 * ActivityStatus können damit nicht mehr auseinanderlaufen. */
export async function submitLabAttemptAndCompleteUnit(
  input: {
    profileId: string
    attemptId: string
    executionId: string
    answerByStepId?: Record<string, unknown>
    scoreEarned: number
    scorePossible: number
    elapsedMs?: number
    now: number
  },
  db: Db = defaultDb,
): Promise<{ attempt: LabAttemptRecord; state: LearningUnitState }> {
  return db.transaction(
    'rw',
    [db.labAttempts, db.learningUnitState, db.unitExecutions],
    async () => {
      const attempt = await db.labAttempts.get(input.attemptId)
      if (!attempt || attempt.profileId !== input.profileId || attempt.status !== 'inProgress') {
        throw new Error(`submitLabAttemptAndCompleteUnit: Versuch ${input.attemptId} ist nicht aktiv`)
      }
      const execution = await db.unitExecutions.get(input.executionId)
      if (
        !execution ||
        execution.type !== 'lab' ||
        execution.profileId !== input.profileId ||
        execution.labAttemptId !== input.attemptId
      ) {
        throw new Error(`submitLabAttemptAndCompleteUnit: Ausführung ${input.executionId} passt nicht zum Versuch`)
      }
      const state = await db.learningUnitState.get([input.profileId, execution.unitId])
      if (!state || state.activeExecutionId !== execution.executionId) {
        throw new Error(`submitLabAttemptAndCompleteUnit: Ausführung ${input.executionId} ist nicht aktiv`)
      }
      if (attempt.evidenceEpoch !== execution.evidenceEpoch || state.evidenceEpoch !== execution.evidenceEpoch) {
        throw new Error('submitLabAttemptAndCompleteUnit: Evidence-Epoch stimmt nicht überein')
      }

      const submitted: LabAttemptRecord = {
        ...attempt,
        answerByStepId: input.answerByStepId ?? attempt.answerByStepId,
        scoreEarned: input.scoreEarned,
        scorePossible: input.scorePossible,
        elapsedMs: input.elapsedMs ?? attempt.elapsedMs,
        revision: attempt.revision + 1,
        status: 'submitted',
        submittedAt: input.now,
        updatedAt: input.now,
      }
      const completed: LearningUnitState = {
        ...state,
        activityStatus: 'completed',
        currentStep: 'done',
        activeExecutionId: undefined,
        completedAt: input.now,
        lastCompletedAt: input.now,
        lastActivityAt: input.now,
        updatedAt: input.now,
      }
      await db.labAttempts.put(submitted)
      await db.learningUnitState.put(completed)
      return { attempt: submitted, state: completed }
    },
  )
}

export async function abandonLabAttempt(
  input: { profileId: string; attemptId: string; now: number },
  db: Db = defaultDb,
): Promise<void> {
  await db.transaction('rw', db.labAttempts, async () => {
    const attempt = await db.labAttempts.get(input.attemptId)
    if (!attempt || attempt.profileId !== input.profileId || attempt.status !== 'inProgress') return
    await db.labAttempts.put({
      ...attempt,
      status: 'abandoned',
      abandonedAt: input.now,
      revision: attempt.revision + 1,
      updatedAt: input.now,
    })
  })
}

const LEGACY_LABS_MARKER = 'legacy-labs-v1'

/**
 * Einmaliger Import der Legacy-„geschafft“-Sets (§13.2): konservativ als
 * historische Abschlüsse in exakt das beim v1-Upgrade registrierte Ownerprofil.
 * Ohne Antworten/Rubrik liefern sie Abschluss-, aber nie Score-/Mastery-Evidenz.
 * Läuft erst, wenn der v1-Owner-Marker existiert; eigener v2-Marker.
 */
export async function runLegacyLabsImport(
  input: { completedScenarioIds: readonly string[]; now: number },
  db: Db = defaultDb,
): Promise<{ imported: boolean; ownerProfileId: string | null; attempts: number }> {
  return db.transaction('rw', [db.migrationMeta, db.labAttempts, db.profileLearningState, db.learningUnitState], async () => {
    if (await db.migrationMeta.get(LEGACY_LABS_MARKER)) {
      const marker = await db.migrationMeta.get(LEGACY_LABS_MARKER)
      return { imported: false, ownerProfileId: marker?.ownerProfileId ?? null, attempts: 0 }
    }
    const ownerMarker = await db.migrationMeta.get(LEGACY_LEARNING_MARKER)
    if (!ownerMarker) return { imported: false, ownerProfileId: null, attempts: 0 }
    const owner = ownerMarker.ownerProfileId
    const epoch = (await db.profileLearningState.get(owner))?.evidenceEpoch ?? 1

    let attempts = 0
    for (const scenarioId of input.completedScenarioIds) {
      const existing = await db.labAttempts
        .where('[profileId+scenarioId]')
        .equals([owner, scenarioId])
        .count()
      if (existing > 0) continue
      await db.labAttempts.put({
        attemptId: crypto.randomUUID(),
        profileId: owner,
        evidenceEpoch: epoch,
        scenarioId,
        scenarioVersion: 'legacy',
        sourceSnapshotId: 'legacy',
        contentManifestVersion: 'legacy',
        language: 'de',
        origin: 'legacy-completed',
        startedAt: input.now,
        updatedAt: input.now,
        revision: 0,
        status: 'submitted',
        submittedAt: input.now,
        answerByStepId: {},
        failedAttemptCount: 0,
        elapsedMs: 0,
      })
      // Aktivitätsstatus der zugehörigen Lab-Unit: bearbeitet, nie Mastery.
      const unitId = formatLabUnitId(scenarioId)
      if (!(await db.learningUnitState.get([owner, unitId]))) {
        await db.learningUnitState.put({
          profileId: owner,
          evidenceEpoch: epoch,
          unitId,
          activityStatus: 'completed',
          currentStep: 'done',
          completedAt: input.now,
          lastCompletedAt: input.now,
          lastActivityAt: input.now,
          updatedAt: input.now,
        })
      }
      attempts += 1
    }
    await db.migrationMeta.put({ key: LEGACY_LABS_MARKER, ownerProfileId: owner, completedAt: input.now })
    return { imported: true, ownerProfileId: owner, attempts }
  })
}

// ── Draft-Lernplan (bestätigter Plan folgt mit Phase 5/Server) ─────────────

export async function getLearnerExamPlan(
  profileId: string,
  db: Db = defaultDb,
): Promise<DraftLearnerExamPlanRecord | undefined> {
  return db.learnerExamPlans.get([profileId, 'SY0-701'])
}

export async function saveDraftLearnerExamPlan(
  input: Partial<DraftLearnerExamPlanRecord> & { profileId: string; now: number },
  db: Db = defaultDb,
): Promise<DraftLearnerExamPlanRecord> {
  return db.transaction('rw', db.learnerExamPlans, async () => {
    const existing = await db.learnerExamPlans.get([input.profileId, 'SY0-701'])
    const { now, ...fields } = input
    const record: DraftLearnerExamPlanRecord = {
      examCode: 'SY0-701',
      status: 'draft',
      planVersion: 'v1',
      examDateIso: null,
      uiLanguage: 'de',
      ...existing,
      ...fields,
      updatedAt: now,
    }
    await db.learnerExamPlans.put(record)
    return record
  })
}

// ── Einmaliger Legacy-Owner-Import (§16.2) ──────────────────────────────────

export interface LegacyLearningSnapshot {
  /** `readTodayPackagePointer()`-Stand des Geräts. */
  pointer: {
    lastCompletedIndex: number
    lastCompletedAt: number
    activeIndex: number
    activeStartedAt: number
    activeCardIds: string[] | null
  } | null
  /** Objective-weite watched/confidence-Signale (`readVideoProgress()`). */
  videoProgressByObjective: Record<string, { watched?: boolean; confidence?: string | null; updatedAt?: number }>
  /** Recall-Historie je 3-stelligem Videoindex (`readRecallScores()`). */
  recallScoresByVideoKey: Record<string, Array<{ known: number; total: number; at: number }>>
  /** Globales `examDateIso` aus den Settings. */
  examDateIso: string | null
}

export interface LegacyImportResult {
  imported: boolean
  ownerProfileId: string
  completedUnits: number
  activeUnitId: string | null
  hintVideos: number
  recallRuns: number
  draftPlanCreated: boolean
}

/**
 * Ordnet die globalen Legacy-Signale genau einmal dem beim Upgrade aktiven
 * Profil zu. Der Marker `legacy-learning-v1` macht den Import idempotent;
 * weitere Profile starten leer und lesen nie die globalen Quellen (§16.2).
 * Objective-weite watched-Flags werden nur als `legacyHint` importiert und
 * schließen keine Unit ab; der Pointer ist die stärkere Kursevidenz.
 */
export async function runLegacyLearningImport(
  input: {
    activeProfileId: string
    legacy: LegacyLearningSnapshot
    videoIndexesByObjective: ReadonlyMap<string, readonly number[]>
    objectiveByVideoIndex: ReadonlyMap<number, string>
    now: number
  },
  db: Db = defaultDb,
): Promise<LegacyImportResult> {
  return db.transaction(
    'rw',
    [
      db.migrationMeta,
      db.profileLearningState,
      db.learningUnitState,
      db.unitExecutions,
      db.videoProgressByProfile,
      db.videoRecallRuns,
      db.learnerExamPlans,
    ],
    async () => {
      const marker = await db.migrationMeta.get(LEGACY_LEARNING_MARKER)
      if (marker) {
        return {
          imported: false,
          ownerProfileId: marker.ownerProfileId,
          completedUnits: 0,
          activeUnitId: null,
          hintVideos: 0,
          recallRuns: 0,
          draftPlanCreated: false,
        }
      }

      const owner = input.activeProfileId
      const now = input.now
      if (!(await db.profileLearningState.get(owner))) {
        await db.profileLearningState.put({ profileId: owner, evidenceEpoch: 1, revision: 0, updatedAt: now })
      }
      const epoch = (await db.profileLearningState.get(owner))!.evidenceEpoch

      // (6) Pointer → Unit-States/Ausführung: stärkste Legacy-Kursevidenz.
      // Restore-fest: bereits vorhandene Unit-States (z. B. aus einem Backup
      // wiederhergestellt) werden nie überschrieben — Legacy ist die
      // schwächste Quelle.
      let completedUnits = 0
      let activeUnitId: string | null = null
      const pointer = input.legacy.pointer
      if (pointer) {
        const lastCompleted = Math.min(Math.max(pointer.lastCompletedIndex, 0), COURSE_LAST_INDEX)
        for (let index = COURSE_FIRST_INDEX; index <= lastCompleted; index++) {
          const unitId = formatCourseUnitId(index)
          if (await db.learningUnitState.get([owner, unitId])) continue
          const completedAt = pointer.lastCompletedAt > 0 ? pointer.lastCompletedAt : now
          await db.learningUnitState.put({
            profileId: owner,
            evidenceEpoch: epoch,
            unitId,
            activityStatus: 'completed',
            currentStep: 'done',
            completedAt,
            lastCompletedAt: completedAt,
            lastActivityAt: completedAt,
            updatedAt: now,
          })
          completedUnits += 1
        }
        if (
          pointer.activeIndex >= COURSE_FIRST_INDEX &&
          pointer.activeIndex <= COURSE_LAST_INDEX &&
          pointer.activeStartedAt > 0 &&
          pointer.activeIndex > lastCompleted &&
          !(await db.learningUnitState.get([owner, formatCourseUnitId(pointer.activeIndex)])) &&
          !(await db.unitExecutions.get(`legacy:pointer:${pointer.activeIndex}`))
        ) {
          const unitId = formatCourseUnitId(pointer.activeIndex)
          const executionId = `legacy:pointer:${pointer.activeIndex}`
          await db.unitExecutions.put({
            executionId,
            unitId,
            profileId: owner,
            evidenceEpoch: epoch,
            type: 'course',
            createdAt: pointer.activeStartedAt,
            cardIds: pointer.activeCardIds ?? [],
            recallQuestionIds: [],
            recallQuestionVersions: {},
            recallCardIds: [],
            recallSeed: 'legacy',
            sourceSnapshotId: 'legacy',
            contentManifestVersion: 'legacy',
            contentVersions: {},
          })
          await db.learningUnitState.put({
            profileId: owner,
            evidenceEpoch: epoch,
            unitId,
            activityStatus: 'inProgress',
            currentStep: 'video',
            activeExecutionId: executionId,
            startedAt: pointer.activeStartedAt,
            lastActivityAt: pointer.activeStartedAt,
            updatedAt: now,
          })
          activeUnitId = unitId
        }
      }

      // (8) Objective-weite Signale nur als legacyHint — nie als Abschluss.
      let hintVideos = 0
      for (const [objective, hint] of Object.entries(input.legacy.videoProgressByObjective)) {
        if (!hint.watched && !hint.confidence) continue
        for (const videoIndex of input.videoIndexesByObjective.get(objective) ?? []) {
          const existing = await db.videoProgressByProfile.get([owner, videoIndex])
          await db.videoProgressByProfile.put({
            profileId: owner,
            evidenceEpoch: epoch,
            videoIndex,
            objectiveId: objective,
            ...existing,
            legacyHint: { watched: hint.watched, confidence: hint.confidence ?? undefined },
            updatedAt: existing?.updatedAt ?? hint.updatedAt ?? now,
          })
          hintVideos += 1
        }
      }

      // (7) Recall-Historie: Videoindex ist eindeutig → dem Owner zuordnen.
      let recallRuns = 0
      for (const [videoKey, runs] of Object.entries(input.legacy.recallScoresByVideoKey)) {
        const videoIndex = Number(videoKey)
        if (!Number.isInteger(videoIndex)) continue
        const objectiveId = input.objectiveByVideoIndex.get(videoIndex)
        if (!objectiveId) continue
        for (let i = 0; i < runs.length; i++) {
          const run = runs[i]
          await db.videoRecallRuns.put({
            runId: `legacy:recall:${videoKey}:${i}`,
            profileId: owner,
            evidenceEpoch: epoch,
            videoIndex,
            executionId: null, // Legacy-Läufe erfüllen nie Schritte neuer Units (§8.2)
            sourceSnapshotId: 'legacy',
            contentManifestVersion: 'legacy',
            questionIds: [],
            questionVersionById: {},
            correct: run.known,
            total: run.total,
            verdict: computeRecallRunVerdict(run.known, run.total),
            completedAt: run.at,
          })
          recallRuns += 1
        }
      }

      // (10) examDateIso nur als Draft; alles Weitere braucht explizite Bestätigung.
      let draftPlanCreated = false
      if (input.legacy.examDateIso && !(await db.learnerExamPlans.get([owner, 'SY0-701']))) {
        await db.learnerExamPlans.put({
          profileId: owner,
          examCode: 'SY0-701',
          status: 'draft',
          planVersion: 'v1',
          examDateIso: input.legacy.examDateIso,
          uiLanguage: 'de',
          updatedAt: now,
        })
        draftPlanCreated = true
      }

      // (11) Marker atomar mit den Daten — Fehler rollt die Gesamttransaktion zurück.
      const markerRecord: MigrationMetaRecord = { key: LEGACY_LEARNING_MARKER, ownerProfileId: owner, completedAt: now }
      await db.migrationMeta.put(markerRecord)

      return { imported: true, ownerProfileId: owner, completedUnits, activeUnitId, hintVideos, recallRuns, draftPlanCreated }
    },
  )
}

// ── Backup/Restore (§16.3): alle Nutzerdaten, keine internen Marker ─────────

export interface LearningUnitsBackupData {
  profileLearningState: ProfileLearningStateRecord[]
  learningUnitState: LearningUnitState[]
  unitExecutions: LearningUnitExecution[]
  reviewUnitAttempts: ReviewUnitAttemptRecord[]
  videoProgress: VideoProgressRecord[]
  videoRecallRuns: VideoRecallRun[]
  learnerExamPlans: DraftLearnerExamPlanRecord[]
  legacyAssessmentHints: LegacyAssessmentHintRecord[]
  /** Ab DB v2 (Phase 4); fehlt in älteren Backups. */
  labAttempts?: LabAttemptRecord[]
}

export interface RestoreLearningUnitsResult {
  added: number
  updated: number
  skipped: number
}

/** Exportinhalt des dedizierten Lerneinheiten-Systems. `migrationMeta` bleibt
 *  bewusst draußen: Der Gerätemarker gehört zum Gerät, nicht zum Backup —
 *  der Legacy-Import ist seinerseits restore-fest (überschreibt nie). */
export async function listLearningUnitsBackup(db: Db = defaultDb): Promise<LearningUnitsBackupData> {
  const [
    profileLearningState,
    learningUnitState,
    unitExecutions,
    reviewUnitAttempts,
    videoProgress,
    videoRecallRuns,
    learnerExamPlans,
    legacyAssessmentHints,
    labAttempts,
  ] = await Promise.all([
    db.profileLearningState.toArray(),
    db.learningUnitState.toArray(),
    db.unitExecutions.toArray(),
    db.reviewUnitAttempts.toArray(),
    db.videoProgressByProfile.toArray(),
    db.videoRecallRuns.toArray(),
    db.learnerExamPlans.toArray(),
    db.legacyAssessmentHints.toArray(),
    db.labAttempts.toArray(),
  ])
  return {
    profileLearningState,
    learningUnitState,
    unitExecutions,
    reviewUnitAttempts,
    videoProgress,
    videoRecallRuns,
    learnerExamPlans,
    legacyAssessmentHints,
    labAttempts,
  }
}

function isRow(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function rowsOf(data: unknown, key: keyof LearningUnitsBackupData): Record<string, unknown>[] {
  if (!isRow(data)) return []
  const rows = (data as Record<string, unknown>)[key]
  return Array.isArray(rows) ? rows.filter(isRow) : []
}

/** Frühester definierter Zeitstempel — erste Evidenz gewinnt. */
function minDefined(a: number | undefined, b: number | undefined): number | undefined {
  if (a === undefined) return b
  if (b === undefined) return a
  return Math.min(a, b)
}

/**
 * Stellt die Lerneinheiten-Stores aus einem Backup idempotent wieder her:
 * Ausführungen, Läufe und Versuche sind append-only (nie überschreiben),
 * Zustände mergen per updatedAt-LWW, Video-Signale konservativ (erste
 * watched-/opened-Evidenz bleibt). Eine Backup-Epoch wird nie autoritativ:
 * existiert lokaler Profil-Lernzustand, bleibt er unangetastet (§16.3).
 */
export async function restoreLearningUnitsBackup(
  data: unknown,
  db: Db = defaultDb,
): Promise<RestoreLearningUnitsResult> {
  const result: RestoreLearningUnitsResult = { added: 0, updated: 0, skipped: 0 }

  return db.transaction(
    'rw',
    [
      db.profileLearningState,
      db.learningUnitState,
      db.unitExecutions,
      db.reviewUnitAttempts,
      db.videoProgressByProfile,
      db.videoRecallRuns,
      db.learnerExamPlans,
      db.legacyAssessmentHints,
      db.labAttempts,
    ],
    async () => {
      for (const row of rowsOf(data, 'profileLearningState')) {
        if (typeof row.profileId !== 'string' || !row.profileId) { result.skipped += 1; continue }
        if (await db.profileLearningState.get(row.profileId)) { result.skipped += 1; continue }
        await db.profileLearningState.put(row as unknown as ProfileLearningStateRecord)
        result.added += 1
      }

      for (const row of rowsOf(data, 'learningUnitState')) {
        if (typeof row.profileId !== 'string' || typeof row.unitId !== 'string') { result.skipped += 1; continue }
        const incoming = row as unknown as LearningUnitState
        const existing = await db.learningUnitState.get([incoming.profileId, incoming.unitId])
        if (!existing) {
          await db.learningUnitState.put(incoming)
          result.added += 1
        } else if ((incoming.updatedAt ?? 0) > (existing.updatedAt ?? 0)) {
          await db.learningUnitState.put(incoming)
          result.updated += 1
        } else {
          result.skipped += 1
        }
      }

      for (const row of rowsOf(data, 'unitExecutions')) {
        if (typeof row.executionId !== 'string' || !row.executionId) { result.skipped += 1; continue }
        if (await db.unitExecutions.get(row.executionId)) { result.skipped += 1; continue }
        await db.unitExecutions.put(row as unknown as LearningUnitExecution)
        result.added += 1
      }

      for (const row of rowsOf(data, 'reviewUnitAttempts')) {
        if (typeof row.attemptId !== 'string' || !row.attemptId) { result.skipped += 1; continue }
        if (await db.reviewUnitAttempts.get(row.attemptId)) { result.skipped += 1; continue }
        await db.reviewUnitAttempts.put(row as unknown as ReviewUnitAttemptRecord)
        result.added += 1
      }

      for (const row of rowsOf(data, 'videoProgress')) {
        if (typeof row.profileId !== 'string' || typeof row.videoIndex !== 'number') { result.skipped += 1; continue }
        const incoming = row as unknown as VideoProgressRecord
        const existing = await db.videoProgressByProfile.get([incoming.profileId, incoming.videoIndex])
        if (!existing) {
          await db.videoProgressByProfile.put(incoming)
          result.added += 1
          continue
        }
        const earliestWatched = minDefined(existing.watchedAt, incoming.watchedAt)
        const laterConfidence =
          (incoming.confidenceAt ?? 0) > (existing.confidenceAt ?? 0) ? incoming : existing
        await db.videoProgressByProfile.put({
          ...existing,
          openedAt: minDefined(existing.openedAt, incoming.openedAt),
          watchedAt: earliestWatched,
          watchedMethod: earliestWatched === existing.watchedAt ? existing.watchedMethod : incoming.watchedMethod,
          confidence: laterConfidence.confidence,
          confidenceAt: laterConfidence.confidenceAt,
          legacyHint: existing.legacyHint ?? incoming.legacyHint,
          updatedAt: Math.max(existing.updatedAt ?? 0, incoming.updatedAt ?? 0),
        })
        result.updated += 1
      }

      for (const row of rowsOf(data, 'videoRecallRuns')) {
        if (typeof row.runId !== 'string' || !row.runId) { result.skipped += 1; continue }
        if (await db.videoRecallRuns.get(row.runId)) { result.skipped += 1; continue }
        await db.videoRecallRuns.put(row as unknown as VideoRecallRun)
        result.added += 1
      }

      for (const row of rowsOf(data, 'learnerExamPlans')) {
        if (typeof row.profileId !== 'string' || typeof row.examCode !== 'string') { result.skipped += 1; continue }
        const incoming = row as unknown as DraftLearnerExamPlanRecord
        const existing = await db.learnerExamPlans.get([incoming.profileId, incoming.examCode])
        if (!existing) {
          await db.learnerExamPlans.put(incoming)
          result.added += 1
        } else if ((incoming.updatedAt ?? 0) > (existing.updatedAt ?? 0)) {
          await db.learnerExamPlans.put(incoming)
          result.updated += 1
        } else {
          result.skipped += 1
        }
      }

      for (const row of rowsOf(data, 'legacyAssessmentHints')) {
        if (typeof row.hintId !== 'string' || !row.hintId) { result.skipped += 1; continue }
        if (await db.legacyAssessmentHints.get(row.hintId)) { result.skipped += 1; continue }
        await db.legacyAssessmentHints.put(row as unknown as LegacyAssessmentHintRecord)
        result.added += 1
      }

      // Labversuche sind append-only per UUID; abgegebene bleiben unveränderlich,
      // deshalb wird nie gemergt oder überschrieben.
      for (const row of rowsOf(data, 'labAttempts')) {
        if (typeof row.attemptId !== 'string' || !row.attemptId) { result.skipped += 1; continue }
        if (await db.labAttempts.get(row.attemptId)) { result.skipped += 1; continue }
        await db.labAttempts.put(row as unknown as LabAttemptRecord)
        result.added += 1
      }

      return result
    },
  )
}
