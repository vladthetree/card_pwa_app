import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LearningUnitsDB } from '../../db/learningUnitsDb'
import type { LearningUnitExecution, LearningUnitState, VideoRecallRun } from '../../utils/learningUnits'
import {
  getActiveExecution,
  getLearningUnitState,
  listLearningUnitsBackup,
  restoreLearningUnitsBackup,
  runLegacyLearningImport,
  startUnitExecution,
} from '../../db/queries/learningUnits'

const NOW = 1_784_000_000_000

let source: LearningUnitsDB
let target: LearningUnitsDB

beforeEach(async () => {
  await Dexie.delete('lu-backup-source')
  await Dexie.delete('lu-backup-target')
  // Getrennte DB-Namen: Quelle (Export) und Ziel (Restore) simulieren zwei Geräte.
  source = new LearningUnitsDB('lu-backup-source')
  target = new LearningUnitsDB('lu-backup-target')
})

afterEach(() => {
  source.close()
  target.close()
})

function courseExecution(overrides: Partial<Extract<LearningUnitExecution, { type: 'course' }>> = {}): LearningUnitExecution {
  return {
    executionId: 'exec-1',
    unitId: 'unit:course:002',
    profileId: 'profil-a',
    evidenceEpoch: 1,
    type: 'course',
    createdAt: NOW,
    cardIds: ['c1', 'c2'],
    recallQuestionIds: ['M1-001'],
    recallQuestionVersions: { 'M1-001': 'v1' },
    recallCardIds: ['c1'],
    recallSeed: 'seed',
    sourceSnapshotId: 'snap',
    contentManifestVersion: 'manifest',
    contentVersions: {},
    ...overrides,
  }
}

function recallRun(overrides: Partial<VideoRecallRun> = {}): VideoRecallRun {
  return {
    runId: 'run-1',
    profileId: 'profil-a',
    evidenceEpoch: 1,
    videoIndex: 2,
    executionId: 'exec-1',
    sourceSnapshotId: 'snap',
    contentManifestVersion: 'manifest',
    questionIds: ['M1-001'],
    questionVersionById: { 'M1-001': 'v1' },
    correct: 1,
    total: 1,
    verdict: 'understood',
    completedAt: NOW + 1000,
    ...overrides,
  }
}

describe('listLearningUnitsBackup / restoreLearningUnitsBackup', () => {
  it('Roundtrip: alle Nutzerdaten wandern mit, der Migrationsmarker nicht', async () => {
    await startUnitExecution(courseExecution(), NOW, source)
    await source.videoRecallRuns.put(recallRun())
    await source.videoProgressByProfile.put({
      profileId: 'profil-a', evidenceEpoch: 1, videoIndex: 2, objectiveId: '1.1',
      openedAt: NOW, watchedAt: NOW + 1, watchedMethod: 'ended', updatedAt: NOW + 1,
    })
    await source.learnerExamPlans.put({
      profileId: 'profil-a', examCode: 'SY0-701', status: 'draft', planVersion: 'v1',
      examDateIso: '2026-09-01', uiLanguage: 'de', updatedAt: NOW,
    })
    await source.migrationMeta.put({ key: 'legacy-learning-v1', ownerProfileId: 'profil-a', completedAt: NOW })

    const backup = await listLearningUnitsBackup(source)
    expect('migrationMeta' in backup).toBe(false)

    const result = await restoreLearningUnitsBackup(backup, target)
    // profileLearningState, state, execution, run, videoProgress, plan —
    // startUnitExecution legt den Profil-Lernzustand (Epoch 1) mit an.
    expect(result.added).toBe(6)
    expect((await getLearningUnitState('profil-a', 'unit:course:002', target))?.activityStatus).toBe('inProgress')
    expect((await getActiveExecution('profil-a', 'unit:course:002', target))?.executionId).toBe('exec-1')
    expect((await target.videoRecallRuns.get('run-1'))?.verdict).toBe('understood')
    expect((await target.learnerExamPlans.get(['profil-a', 'SY0-701']))?.examDateIso).toBe('2026-09-01')
    expect(await target.migrationMeta.get('legacy-learning-v1')).toBeUndefined()
  })

  it('ist idempotent: zweiter Restore überschreibt nichts', async () => {
    await startUnitExecution(courseExecution(), NOW, source)
    const backup = await listLearningUnitsBackup(source)
    await restoreLearningUnitsBackup(backup, target)
    const second = await restoreLearningUnitsBackup(backup, target)
    expect(second.added).toBe(0)
    expect(second.updated).toBe(0)
    expect(second.skipped).toBeGreaterThan(0)
  })

  it('Zustände mergen per updatedAt-LWW; Ausführungen bleiben unveränderlich', async () => {
    await startUnitExecution(courseExecution(), NOW, target)
    const newerState: LearningUnitState = {
      profileId: 'profil-a', evidenceEpoch: 1, unitId: 'unit:course:002',
      activityStatus: 'completed', currentStep: 'done',
      completedAt: NOW + 9000, lastCompletedAt: NOW + 9000, lastActivityAt: NOW + 9000, updatedAt: NOW + 9000,
    }
    const manipulatedExecution = courseExecution({ cardIds: ['MANIPULIERT'] })
    const result = await restoreLearningUnitsBackup(
      { learningUnitState: [newerState], unitExecutions: [manipulatedExecution] },
      target,
    )
    expect(result.updated).toBe(1)
    expect(result.skipped).toBe(1)
    expect((await getLearningUnitState('profil-a', 'unit:course:002', target))?.activityStatus).toBe('completed')
    const execution = await target.unitExecutions.get('exec-1')
    expect(execution?.type === 'course' && execution.cardIds).toEqual(['c1', 'c2'])
  })

  it('lokale Profil-Epoch bleibt: eine Backup-Epoch wird nie autoritativ', async () => {
    await target.profileLearningState.put({ profileId: 'profil-a', evidenceEpoch: 3, revision: 7, updatedAt: NOW })
    await restoreLearningUnitsBackup(
      { profileLearningState: [{ profileId: 'profil-a', evidenceEpoch: 99, revision: 1, updatedAt: NOW + 1 }] },
      target,
    )
    expect((await target.profileLearningState.get('profil-a'))?.evidenceEpoch).toBe(3)
  })

  it('Video-Signale: erste watched-Evidenz bleibt, spätere Confidence gewinnt', async () => {
    await target.videoProgressByProfile.put({
      profileId: 'profil-a', evidenceEpoch: 1, videoIndex: 2, objectiveId: '1.1',
      watchedAt: NOW + 100, watchedMethod: 'manual', confidence: 'gaps', confidenceAt: NOW + 100, updatedAt: NOW + 100,
    })
    await restoreLearningUnitsBackup(
      {
        videoProgress: [{
          profileId: 'profil-a', evidenceEpoch: 1, videoIndex: 2, objectiveId: '1.1',
          openedAt: NOW - 50, watchedAt: NOW + 5, watchedMethod: 'ended',
          confidence: 'solid', confidenceAt: NOW + 500, updatedAt: NOW + 500,
        }],
      },
      target,
    )
    const merged = await target.videoProgressByProfile.get(['profil-a', 2])
    expect(merged?.watchedAt).toBe(NOW + 5)
    expect(merged?.watchedMethod).toBe('ended')
    expect(merged?.openedAt).toBe(NOW - 50)
    expect(merged?.confidence).toBe('solid')
    expect(merged?.updatedAt).toBe(NOW + 500)
  })

  it('Backups ohne learningUnits-Block sind ein No-op', async () => {
    const result = await restoreLearningUnitsBackup(undefined, target)
    expect(result).toEqual({ added: 0, updated: 0, skipped: 0 })
  })
})

describe('Legacy-Import nach Restore (§16.2 restore-fest)', () => {
  it('überschreibt wiederhergestellte Unit-States und Ausführungen nicht', async () => {
    // Restore brachte Unit 003 als aktiv laufende Ausführung mit.
    await startUnitExecution(
      courseExecution({ executionId: 'exec-restored', unitId: 'unit:course:003' }),
      NOW,
      target,
    )
    // Der Geräte-Legacy-Pointer behauptet: 002–005 abgeschlossen.
    const result = await runLegacyLearningImport(
      {
        activeProfileId: 'profil-a',
        legacy: {
          pointer: { lastCompletedIndex: 5, lastCompletedAt: NOW - 1, activeIndex: 6, activeStartedAt: NOW - 1, activeCardIds: null },
          videoProgressByObjective: {},
          recallScoresByVideoKey: {},
          examDateIso: null,
        },
        videoIndexesByObjective: new Map(),
        objectiveByVideoIndex: new Map(),
        now: NOW,
      },
      target,
    )
    // 003 blieb unangetastet (inProgress), nur 002/004/005 kamen als completed dazu.
    expect(result.completedUnits).toBe(3)
    const restored = await getLearningUnitState('profil-a', 'unit:course:003', target)
    expect(restored?.activityStatus).toBe('inProgress')
    expect(restored?.activeExecutionId).toBe('exec-restored')
    expect((await getLearningUnitState('profil-a', 'unit:course:002', target))?.activityStatus).toBe('completed')
  })
})
