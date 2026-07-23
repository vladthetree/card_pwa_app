/**
 * AI_CONTEXT:
 * Role: Dedicated Dexie database of the integrated SY0-701 learning-unit system — profile-scoped unit state, frozen executions, video/recall progress, and learner plans.
 * Used by: db/queries/learningUnits.ts, learning-unit runtime, and tests.
 * Important: Deliberately a SEPARATE database (`card-pwa-learning-units`), not a version bump of CardPwaDB: the existing system stays untouched (Detailplan §16.1 sieht v22 in der Haupt-DB vor; diese dedizierte DB ist das additive Äquivalent). Every key starts with profileId.
 */
import Dexie, { type Table } from 'dexie'
import type {
  LearningUnitExecution,
  LearningUnitState,
  VideoProgressRecord,
  VideoRecallRun,
} from '../utils/learningUnits'

export interface ProfileLearningStateRecord {
  profileId: string
  evidenceEpoch: number
  revision: number
  lastResetEventId?: string
  pendingResetRequestId?: string
  serverWatermark?: string
  updatedAt: number
}

export interface ReviewUnitAttemptRecord {
  attemptId: string
  profileId: string
  unitId: string
  executionId: string
  localLearningDay: string
  completedAt: number
  /** Fehlt bei Altzeilen = 'completed'; 'abandoned' = expliziter Abbruch (§11). */
  status?: 'completed' | 'abandoned'
}

export interface DraftLearnerExamPlanRecord {
  profileId: string
  examCode: 'SY0-701'
  status: 'draft'
  planVersion: string
  examDateIso: string | null
  uiLanguage: string
  examLanguage?: string
  weeklyMinutesAvailable?: number
  learningDaysPerWeek?: number
  bufferDays?: number
  sourceSnapshotId?: string
  baselineDiagnosticAttemptId?: string
  updatedAt: number
}

export interface LegacyAssessmentHintRecord {
  hintId: string
  profileId: string
  itemId: string
  inferredCorrect: boolean
  importedAt: number
  source: 'legacy-review'
}

export interface MigrationMetaRecord {
  key: string
  ownerProfileId: string
  completedAt: number
}

/**
 * Labversuch (Phase 4, Detailplan §13.2 in additiver Ausbaustufe): UUID-basiert,
 * append-only; laufende Versuche sind aktualisierbar, abgegebene unveränderlich.
 * `scenarioSnapshot` friert das Szenario beim Start vollständig ein — Rendering,
 * Resume und Scoring lesen NIE die möglicherweise geänderte Registry.
 */
export interface LabAttemptRecord {
  attemptId: string
  profileId: string
  evidenceEpoch: number
  scenarioId: string
  /** Content-Hash des eingefrorenen Szenarios (Registry hat keine Versionsfelder). */
  scenarioVersion: string
  sourceSnapshotId: string
  contentManifestVersion: string
  language: string
  /** Eingefrorenes Szenario (tiefe Kopie der Registry beim Start); fehlt nur
   *  bei `origin: 'legacy-completed'`-Zeilen ohne rekonstruierbaren Stand. */
  scenarioSnapshot?: unknown
  /** 'legacy-completed' = historischer Abschluss ohne Antworten/Rubrik —
   *  Abschluss-, aber nie Score-/Mastery-Evidenz (§13.2). */
  origin: 'attempt' | 'legacy-completed'
  startedAt: number
  updatedAt: number
  revision: number
  submittedAt?: number
  abandonedAt?: number
  status: 'inProgress' | 'submitted' | 'abandoned'
  answerByStepId: Record<string, unknown>
  scoreEarned?: number
  scorePossible?: number
  failedAttemptCount: number
  elapsedMs: number
}

export class LearningUnitsDB extends Dexie {
  profileLearningState!: Table<ProfileLearningStateRecord, string>
  learningUnitState!: Table<LearningUnitState, [string, string]>
  unitExecutions!: Table<LearningUnitExecution, string>
  reviewUnitAttempts!: Table<ReviewUnitAttemptRecord, string>
  videoProgressByProfile!: Table<VideoProgressRecord, [string, number]>
  videoRecallRuns!: Table<VideoRecallRun, string>
  legacyAssessmentHints!: Table<LegacyAssessmentHintRecord, string>
  learnerExamPlans!: Table<DraftLearnerExamPlanRecord, [string, string]>
  migrationMeta!: Table<MigrationMetaRecord, string>
  labAttempts!: Table<LabAttemptRecord, string>

  /** `name` nur für Tests überschreibbar (z. B. Quelle/Ziel eines Restores). */
  constructor(name = 'card-pwa-learning-units') {
    super(name)
    // Indizes nach Detailplan §16.1 (Teilmenge ohne Server-Receipt-Stores;
    // assessment*/examAttempts folgen mit Phase 5).
    this.version(1).stores({
      profileLearningState: 'profileId, updatedAt',
      learningUnitState: '[profileId+unitId], profileId, [profileId+activityStatus], lastActivityAt, updatedAt',
      unitExecutions: 'executionId, [profileId+unitId], profileId, createdAt',
      reviewUnitAttempts: 'attemptId, [profileId+localLearningDay], [profileId+unitId], executionId, completedAt',
      videoProgressByProfile: '[profileId+videoIndex], profileId, objectiveId, updatedAt',
      videoRecallRuns: 'runId, [profileId+videoIndex], profileId, completedAt',
      legacyAssessmentHints: 'hintId, profileId, importedAt',
      learnerExamPlans: '[profileId+examCode], profileId, examDateIso, updatedAt',
      migrationMeta: 'key, completedAt',
    })
    // v2 (Phase 4): Labversuche — das additive Äquivalent des Detailplan-v23.
    this.version(2).stores({
      labAttempts: 'attemptId, [profileId+scenarioId], [profileId+status], profileId, startedAt',
    })
  }
}

export const learningUnitsDb = new LearningUnitsDB()
