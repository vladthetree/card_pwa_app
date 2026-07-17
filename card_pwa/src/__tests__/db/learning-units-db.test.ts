import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LearningUnitsDB } from '../../db/learningUnitsDb'
import type { LearningUnitExecution } from '../../utils/learningUnits'
import {
  abortUnitExecution,
  completeUnitExecution,
  getActiveExecution,
  getLearnerExamPlan,
  getLearningUnitState,
  getOrCreateProfileLearningState,
  listRecentVideoRecallRuns,
  listReservedCardIds,
  markVideoOpened,
  markVideoWatched,
  recordVideoRecallRun,
  runLegacyLearningImport,
  startUnitExecution,
  type LegacyLearningSnapshot,
} from '../../db/queries/learningUnits'

let db: LearningUnitsDB

beforeEach(async () => {
  await Dexie.delete('card-pwa-learning-units')
  db = new LearningUnitsDB()
})

afterEach(() => {
  db.close()
})

const NOW = 1_784_000_000_000

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

function recallRun(overrides: Partial<Parameters<typeof recordVideoRecallRun>[0]> = {}) {
  return {
    runId: 'run-1',
    profileId: 'profil-a',
    evidenceEpoch: 1,
    videoIndex: 2,
    executionId: 'exec-1' as string | null,
    sourceSnapshotId: 'snap',
    contentManifestVersion: 'manifest',
    questionIds: ['M1-001'],
    questionVersionById: { 'M1-001': 'v1' },
    correct: 1,
    total: 1,
    verdict: 'understood' as const,
    completedAt: NOW + 1000,
    ...overrides,
  }
}

describe('Unit-Lebenszyklus', () => {
  it('startet atomar: Execution + State inProgress mit Schritt video', async () => {
    const state = await startUnitExecution(courseExecution(), NOW, db)
    expect(state.activityStatus).toBe('inProgress')
    expect(state.currentStep).toBe('video')
    expect(state.activeExecutionId).toBe('exec-1')
    expect((await getActiveExecution('profil-a', 'unit:course:002', db))?.executionId).toBe('exec-1')
  })

  it('lehnt einen zweiten Start derselben Unit ab (Resume statt Neustart)', async () => {
    await startUnitExecution(courseExecution(), NOW, db)
    await expect(startUnitExecution(courseExecution({ executionId: 'exec-2' }), NOW + 1, db)).rejects.toThrow(/bereits die aktive/)
    await expect(startUnitExecution(courseExecution(), NOW + 2, db)).rejects.toThrow(/existiert bereits/)
  })

  it('completeUnitExecution schließt ab und löst die Reservierung', async () => {
    await startUnitExecution(courseExecution(), NOW, db)
    const done = await completeUnitExecution('profil-a', 'exec-1', NOW + 5000, db)
    expect(done.activityStatus).toBe('completed')
    expect(done.activeExecutionId).toBeUndefined()
    expect(done.lastCompletedAt).toBe(NOW + 5000)
    expect(await getActiveExecution('profil-a', 'unit:course:002', db)).toBeUndefined()
    await expect(completeUnitExecution('profil-b', 'exec-1', NOW, db)).rejects.toThrow(/gehört nicht zu Profil/)
  })

  it('abortUnitExecution behält die Historie und fällt auf den letzten Status zurück', async () => {
    await startUnitExecution(courseExecution(), NOW, db)
    await abortUnitExecution('profil-a', 'exec-1', NOW + 1, db)
    expect((await getLearningUnitState('profil-a', 'unit:course:002', db))?.activityStatus).toBe('notStarted')
    expect(await db.unitExecutions.get('exec-1')).toBeDefined()

    // nach früherem Abschluss fällt ein Abbruch auf completed zurück
    await startUnitExecution(courseExecution({ executionId: 'exec-2' }), NOW + 2, db)
    await completeUnitExecution('profil-a', 'exec-2', NOW + 3, db)
    await startUnitExecution(courseExecution({ executionId: 'exec-3', createdAt: NOW + 4 }), NOW + 4, db)
    await abortUnitExecution('profil-a', 'exec-3', NOW + 5, db)
    expect((await getLearningUnitState('profil-a', 'unit:course:002', db))?.activityStatus).toBe('completed')
  })

  it('trennt Profile vollständig: gleiche Unit, unabhängiger Zustand und Reservierung', async () => {
    await startUnitExecution(courseExecution(), NOW, db)
    await startUnitExecution(courseExecution({ executionId: 'exec-b', profileId: 'profil-b', cardIds: ['x1'] }), NOW, db)
    expect((await getLearningUnitState('profil-b', 'unit:course:002', db))?.activeExecutionId).toBe('exec-b')
    await completeUnitExecution('profil-a', 'exec-1', NOW + 1, db)
    expect((await getLearningUnitState('profil-b', 'unit:course:002', db))?.activityStatus).toBe('inProgress')
    expect(await listReservedCardIds('profil-a', db)).toEqual(new Set())
    expect(await listReservedCardIds('profil-b', db)).toEqual(new Set(['x1']))
  })
})

describe('Video-Fortschritt und Recall-Läufe', () => {
  it('Öffnen setzt nie watchedAt; Ansehen ist idempotent mit erster Methode', async () => {
    await markVideoOpened({ profileId: 'profil-a', videoIndex: 2, objectiveId: '1.1', now: NOW }, db)
    expect((await db.videoProgressByProfile.get(['profil-a', 2]))?.watchedAt).toBeUndefined()
    await markVideoWatched({ profileId: 'profil-a', videoIndex: 2, objectiveId: '1.1', method: 'ended', now: NOW + 1 }, db)
    await markVideoWatched({ profileId: 'profil-a', videoIndex: 2, objectiveId: '1.1', method: 'manual', now: NOW + 9 }, db)
    const record = await db.videoProgressByProfile.get(['profil-a', 2])
    expect(record?.watchedAt).toBe(NOW + 1)
    expect(record?.watchedMethod).toBe('ended')
    expect(record?.openedAt).toBe(NOW)
  })

  it('Recall-Läufe sind append-only und an existierende eigene Ausführungen gebunden', async () => {
    await startUnitExecution(courseExecution(), NOW, db)
    await recordVideoRecallRun(recallRun(), db)
    await expect(recordVideoRecallRun(recallRun(), db)).rejects.toThrow(/append-only/)
    await expect(recordVideoRecallRun(recallRun({ runId: 'r2', executionId: 'gibt-es-nicht' }), db)).rejects.toThrow(/gehört nicht zu Profil/)
    await expect(recordVideoRecallRun(recallRun({ runId: 'r3', profileId: 'profil-b' }), db)).rejects.toThrow(/gehört nicht zu Profil/)
    await expect(recordVideoRecallRun(recallRun({ runId: 'r4', completedAt: NOW - 1 }), db)).rejects.toThrow(/vor dem Start/)
    await recordVideoRecallRun(recallRun({ runId: 'r5', executionId: null, completedAt: 5 }), db)
  })

  it('liefert höchstens die letzten fünf Läufe, neueste zuerst', async () => {
    await startUnitExecution(courseExecution(), NOW, db)
    for (let i = 0; i < 7; i++) {
      await recordVideoRecallRun(recallRun({ runId: `run-${i}`, completedAt: NOW + i * 1000 }), db)
    }
    const recent = await listRecentVideoRecallRuns('profil-a', 2, db)
    expect(recent).toHaveLength(5)
    expect(recent[0].runId).toBe('run-6')
    expect(recent[4].runId).toBe('run-2')
  })
})

describe('runLegacyLearningImport (§16.2)', () => {
  const legacy: LegacyLearningSnapshot = {
    pointer: { lastCompletedIndex: 5, lastCompletedAt: NOW - 5000, activeIndex: 6, activeStartedAt: NOW - 1000, activeCardIds: ['l1', 'l2'] },
    videoProgressByObjective: { '1.1': { watched: true, confidence: 'solid', updatedAt: NOW - 9000 } },
    recallScoresByVideoKey: { '004': [{ known: 5, total: 6, at: NOW - 8000 }, { known: 2, total: 6, at: NOW - 7000 }] },
    examDateIso: '2026-09-01',
  }
  const videoIndexesByObjective = new Map([['1.1', [2, 3] as const]])
  const objectiveByVideoIndex = new Map([[2, '1.1'], [3, '1.1'], [4, '1.2'], [5, '1.2'], [6, '1.3']])

  const run = (profileId: string) =>
    runLegacyLearningImport({ activeProfileId: profileId, legacy, videoIndexesByObjective, objectiveByVideoIndex, now: NOW }, db)

  it('importiert genau einmal und nur für das beim Upgrade aktive Profil', async () => {
    const first = await run('profil-a')
    expect(first).toMatchObject({ imported: true, ownerProfileId: 'profil-a', completedUnits: 4, activeUnitId: 'unit:course:006', hintVideos: 2, recallRuns: 2, draftPlanCreated: true })
    const second = await run('profil-b')
    expect(second.imported).toBe(false)
    expect(second.ownerProfileId).toBe('profil-a')
    expect(await getLearningUnitState('profil-b', 'unit:course:002', db)).toBeUndefined()
  })

  it('überträgt den Pointer als stärkste Evidenz: 002–005 completed, 006 aktiv mit Legacy-Karten', async () => {
    await run('profil-a')
    expect((await getLearningUnitState('profil-a', 'unit:course:005', db))?.activityStatus).toBe('completed')
    const active = await getActiveExecution('profil-a', 'unit:course:006', db)
    expect(active?.type).toBe('course')
    if (active?.type !== 'course') throw new Error('erwartet course')
    expect(active.cardIds).toEqual(['l1', 'l2'])
    expect(active.recallQuestionIds).toEqual([]) // Legacy kennt keine eingefrorenen Recall-Fragen
    expect(active.createdAt).toBe(NOW - 1000) // activeStartedAt bleibt, keine Tagesanhebung
  })

  it('importiert Objective-Signale nur als legacyHint ohne watchedAt und ohne Abschluss', async () => {
    await run('profil-a')
    const video2 = await db.videoProgressByProfile.get(['profil-a', 2])
    expect(video2?.legacyHint).toEqual({ watched: true, confidence: 'solid' })
    expect(video2?.watchedAt).toBeUndefined()
    // Objective-Hint hat Unit 002 NICHT abgeschlossen (nur Pointer zählt — hier war 002 ohnehin completed via Pointer)
    expect((await getLearningUnitState('profil-a', 'unit:course:007', db))).toBeUndefined()
  })

  it('ordnet Recall-Historie dem Owner zu (executionId null → erfüllt keine Schritte)', async () => {
    await run('profil-a')
    const runs = await listRecentVideoRecallRuns('profil-a', 4, db)
    expect(runs).toHaveLength(2)
    expect(runs.every(r => r.executionId === null)).toBe(true)
    expect(runs[0].verdict).toBe('review') // 2/6
    expect(runs[1].verdict).toBe('understood') // 5/6
  })

  it('übernimmt examDateIso nur als Draft-Plan des Owners', async () => {
    await run('profil-a')
    const plan = await getLearnerExamPlan('profil-a', db)
    expect(plan?.status).toBe('draft')
    expect(plan?.examDateIso).toBe('2026-09-01')
    expect(await getLearnerExamPlan('profil-b', db)).toBeUndefined()
  })
})

describe('getOrCreateProfileLearningState', () => {
  it('legt Epoch 1 genau einmal an', async () => {
    const first = await getOrCreateProfileLearningState('profil-a', NOW, db)
    const second = await getOrCreateProfileLearningState('profil-a', NOW + 1, db)
    expect(first.evidenceEpoch).toBe(1)
    expect(second.updatedAt).toBe(NOW) // unverändert, kein Überschreiben
  })
})
