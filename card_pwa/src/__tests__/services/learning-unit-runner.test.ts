import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Card } from '../../types'
import { learningUnitsDb } from '../../db/learningUnitsDb'
import {
  getActiveExecution,
  getLearningUnitState,
  markVideoWatched,
} from '../../db/queries/learningUnits'
import { SY0701_CONTENT_MAP_BY_VIDEO_INDEX } from '../../data/sy0701ContentMap'
import type { LearningUnitDefinition } from '../../utils/learningUnits'

// Haupt-DB-Zugriffe des Runners mocken: Karten kommen „aus der Karten-DB“,
// Review-Abdeckung ist pro Test steuerbar. Die dedizierte Lerneinheiten-DB
// läuft echt gegen fake-indexeddb.
const mocks = vi.hoisted(() => ({
  listCardsByIds: vi.fn<(ids: string[]) => Promise<Card[]>>(),
  listCardIdsReviewedSince: vi.fn<(cardIds: readonly string[], sinceMs: number) => Promise<string[]>>(),
}))
vi.mock('../../db/queries', () => ({
  listCardsByIds: mocks.listCardsByIds,
  listCardIdsReviewedSince: mocks.listCardIdsReviewedSince,
}))

import {
  getActiveCourseExecutionForVideo,
  recordCourseRecallRun,
  reconcileCourseUnitProgress,
  startOrResumeCourseUnit,
} from '../../services/learningUnitRunner'

const PROFILE = 'profil-a'
const VIDEO_INDEX = 2
const CONTENT = SY0701_CONTENT_MAP_BY_VIDEO_INDEX.get(VIDEO_INDEX)!

const DEFINITION: LearningUnitDefinition = {
  unitId: 'unit:course:002',
  type: 'course',
  title: 'Security Controls',
  objectiveIds: ['1.1'],
  requirementIds: [],
  order: VIDEO_INDEX,
  videoIndex: VIDEO_INDEX,
  definitionVersion: 'test',
}

const SETTINGS = {
  packageCardLimit: 5,
  nextDayStartsAt: 0,
  learnAheadMinutes: 0,
  recallCheckSize: 3,
  algorithm: 'fsrs' as const,
}

function makeCard(id: string, front: string): Card {
  return {
    id,
    noteId: `note-${id}`,
    deckId: 'sy0-701-objective-1-1',
    type: 'new',
    front,
    back: 'Antwort',
    extra: { acronym: '', examples: '', port: '', protocol: '' },
    tags: [],
    interval: 0,
    due: 0,
    reps: 0,
    lapses: 0,
    queue: 0,
  }
}

beforeEach(async () => {
  await Promise.all(learningUnitsDb.tables.map(table => table.clear()))
  // Karten zu exakt den angefragten IDs; die ersten drei tragen M-ID-Fronten,
  // damit die Recall-Karten-Zuordnung (M-ID → Card) etwas zu mappen hat.
  mocks.listCardsByIds.mockImplementation(async ids =>
    ids.map((id, index) =>
      makeCard(id, index < 3 ? `${CONTENT.recallQuestionIds[index]}: Frage ${id}` : `Frage ${id}`),
    ),
  )
  mocks.listCardIdsReviewedSince.mockResolvedValue([])
})

async function startUnit() {
  return startOrResumeCourseUnit({ profileId: PROFILE, definition: DEFINITION, settings: SETTINGS })
}

describe('startOrResumeCourseUnit', () => {
  it('friert beim Erststart Karten- und Recall-Auswahl regelkonform ein', async () => {
    const launch = await startUnit()
    expect(launch.step).toBe('video')
    expect(launch.state.activityStatus).toBe('inProgress')

    const execution = launch.execution
    expect(execution.cardIds.length).toBe(SETTINGS.packageCardLimit)
    for (const cardId of execution.cardIds) {
      expect(CONTENT.courseCardIds).toContain(cardId)
    }
    // normalizeRecallCheckSize klemmt auf mindestens 3
    expect(execution.recallQuestionIds.length).toBe(3)
    for (const questionId of execution.recallQuestionIds) {
      expect(CONTENT.recallQuestionIds).toContain(questionId)
    }
    // Recall-Karten derselben Sitzung sind aus dem Karten-Schritt ausgeschlossen
    for (const recallCardId of execution.recallCardIds) {
      expect(execution.cardIds).not.toContain(recallCardId)
    }
    expect(launch.remainingCardIds).toEqual(execution.cardIds)
    expect((await getActiveCourseExecutionForVideo(PROFILE, VIDEO_INDEX))?.executionId).toBe(execution.executionId)
  })

  it('setzt eine aktive Ausführung fort statt neu zu starten', async () => {
    const first = await startUnit()
    const second = await startUnit()
    expect(second.execution.executionId).toBe(first.execution.executionId)
    expect(second.execution.cardIds).toEqual(first.execution.cardIds)
  })

  it('meldet beim Resume den exakten Schrittstand samt Restkarten', async () => {
    const { execution } = await startUnit()
    await markVideoWatched({ profileId: PROFILE, videoIndex: VIDEO_INDEX, objectiveId: '1.1', method: 'ended', now: Date.now() })
    await recordCourseRecallRun({
      profileId: PROFILE,
      videoIndex: VIDEO_INDEX,
      objectiveId: '1.1',
      executionId: execution.executionId,
      questionIds: [...execution.recallQuestionIds],
      questionVersionById: { ...execution.recallQuestionVersions },
      correct: 3,
      total: 3,
    })
    mocks.listCardIdsReviewedSince.mockResolvedValue(execution.cardIds.slice(0, 2))

    const resumed = await startUnit()
    expect(resumed.step).toBe('cards')
    expect(resumed.remainingCardIds).toEqual(execution.cardIds.slice(2))
  })
})

describe('reconcileCourseUnitProgress', () => {
  it('schließt eine Unit nur ab, wenn Video, Recall und alle Karten belegt sind', async () => {
    const { execution } = await startUnit()

    await reconcileCourseUnitProgress(PROFILE)
    expect((await getLearningUnitState(PROFILE, DEFINITION.unitId))?.activityStatus).toBe('inProgress')

    await markVideoWatched({ profileId: PROFILE, videoIndex: VIDEO_INDEX, objectiveId: '1.1', method: 'ended', now: Date.now() })
    await recordCourseRecallRun({
      profileId: PROFILE,
      videoIndex: VIDEO_INDEX,
      objectiveId: '1.1',
      executionId: execution.executionId,
      questionIds: [...execution.recallQuestionIds],
      questionVersionById: { ...execution.recallQuestionVersions },
      correct: 2,
      total: 3,
    })
    await reconcileCourseUnitProgress(PROFILE)
    const midway = await getLearningUnitState(PROFILE, DEFINITION.unitId)
    expect(midway?.activityStatus).toBe('inProgress')
    expect(midway?.currentStep).toBe('cards')

    mocks.listCardIdsReviewedSince.mockResolvedValue([...execution.cardIds])
    const { completedUnitIds } = await reconcileCourseUnitProgress(PROFILE)
    expect(completedUnitIds).toEqual([DEFINITION.unitId])
    const done = await getLearningUnitState(PROFILE, DEFINITION.unitId)
    expect(done?.activityStatus).toBe('completed')
    expect(await getActiveExecution(PROFILE, DEFINITION.unitId)).toBeUndefined()
  })

  it('lässt freie Recall-Läufe (executionId null) den Schritt nicht erfüllen', async () => {
    const { execution } = await startUnit()
    await markVideoWatched({ profileId: PROFILE, videoIndex: VIDEO_INDEX, objectiveId: '1.1', method: 'ended', now: Date.now() })
    await recordCourseRecallRun({
      profileId: PROFILE,
      videoIndex: VIDEO_INDEX,
      objectiveId: '1.1',
      executionId: null,
      questionIds: [...execution.recallQuestionIds],
      questionVersionById: { ...execution.recallQuestionVersions },
      correct: 3,
      total: 3,
    })
    mocks.listCardIdsReviewedSince.mockResolvedValue([...execution.cardIds])
    const { completedUnitIds } = await reconcileCourseUnitProgress(PROFILE)
    expect(completedUnitIds).toEqual([])
    expect((await getLearningUnitState(PROFILE, DEFINITION.unitId))?.currentStep).toBe('recall')
  })
})
