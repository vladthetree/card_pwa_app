import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Card } from '../../types'
import { learningUnitsDb } from '../../db/learningUnitsDb'
import {
  countReviewUnitAttemptsForDay,
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
  clearActiveSession: vi.fn(async () => {}),
  listCardsByDeckIdsDirect: vi.fn<(deckIds: string[]) => Promise<Card[]>>(),
  listAnswerStats: vi.fn(async (): Promise<Array<{ scopeId: string; unresolvedErrorItemIds: string[] }>> => []),
}))
vi.mock('../../db/queries', () => ({
  listCardsByIds: mocks.listCardsByIds,
  listCardIdsReviewedSince: mocks.listCardIdsReviewedSince,
  clearActiveSession: mocks.clearActiveSession,
  listCardsByDeckIdsDirect: mocks.listCardsByDeckIdsDirect,
}))
vi.mock('../../db/queries/answerStats', () => ({
  listAnswerStats: mocks.listAnswerStats,
}))

import {
  getActiveCourseExecutionForVideo,
  recordCourseRecallRun,
  reconcileCourseUnitProgress,
  startOrResumeCourseUnit,
  startOrResumeReviewUnit,
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
  mocks.listCardsByDeckIdsDirect.mockResolvedValue([])
  mocks.listAnswerStats.mockResolvedValue([])
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

describe('startOrResumeReviewUnit / Review-Abschluss', () => {
  const REVIEW_DEFINITION: LearningUnitDefinition = {
    unitId: 'unit:review:1.1',
    type: 'review',
    title: 'Wiederholung 1.1',
    objectiveIds: ['1.1'],
    requirementIds: [],
    order: 1000,
    definitionVersion: 'test',
  }
  const REVIEW_SETTINGS = { reviewCardLimit: 0, nextDayStartsAt: 0, learnAheadMinutes: 0 }

  function dueReviewCard(id: string): Card {
    return { ...makeCard(id, `Frage ${id}`), type: 'review', due: 0 }
  }

  async function startReview() {
    return startOrResumeReviewUnit({ profileId: PROFILE, definition: REVIEW_DEFINITION, settings: REVIEW_SETTINGS })
  }

  it('friert fällige Karten und ungelöste Fehler ein; neue Karten bleiben draußen', async () => {
    mocks.listCardsByDeckIdsDirect.mockResolvedValue([
      dueReviewCard('due-1'),
      makeCard('new-1', 'Neue Karte'), // type 'new' → nie Teil einer Wiederholung
      { ...makeCard('err-1', 'Fehlerkarte'), type: 'review', due: 999_999 }, // nicht fällig
    ])
    mocks.listAnswerStats.mockResolvedValue([{ scopeId: 'err-1', unresolvedErrorItemIds: ['err-1'] }])

    const launch = await startReview()
    expect(launch).not.toBeNull()
    expect(launch!.execution.cardIds).toEqual(['due-1', 'err-1'])
    expect(launch!.execution.reasonByCardId).toEqual({ 'due-1': 'due', 'err-1': 'unresolved-error' })
    expect(launch!.state.currentStep).toBe('cards')
  })

  it('liefert null, wenn weder Fälligkeit noch ungelöste Fehler vorliegen', async () => {
    mocks.listCardsByDeckIdsDirect.mockResolvedValue([makeCard('new-1', 'Neue Karte')])
    expect(await startReview()).toBeNull()
    expect(await getLearningUnitState(PROFILE, REVIEW_DEFINITION.unitId)).toBeUndefined()
  })

  it('setzt die aktive Ausführung fort; Abschluss protokolliert den Versuch am Lerntag', async () => {
    mocks.listCardsByDeckIdsDirect.mockResolvedValue([dueReviewCard('due-1'), dueReviewCard('due-2')])
    const first = await startReview()
    const second = await startReview()
    expect(second!.execution.executionId).toBe(first!.execution.executionId)

    mocks.listCardIdsReviewedSince.mockResolvedValue([...first!.execution.cardIds])
    const { completedUnitIds } = await reconcileCourseUnitProgress(PROFILE, { localLearningDay: '2026-07-18' })
    expect(completedUnitIds).toContain(REVIEW_DEFINITION.unitId)
    expect((await getLearningUnitState(PROFILE, REVIEW_DEFINITION.unitId))?.activityStatus).toBe('completed')
    expect(await countReviewUnitAttemptsForDay(PROFILE, '2026-07-18')).toBe(1)
    expect(await countReviewUnitAttemptsForDay(PROFILE, '2026-07-19')).toBe(0)
    expect(mocks.clearActiveSession).toHaveBeenCalledWith(`unit-exec:${first!.execution.executionId}`)
  })

  it('unvollständig bewertete Wiederholungen bleiben inProgress und reserviert', async () => {
    mocks.listCardsByDeckIdsDirect.mockResolvedValue([dueReviewCard('due-1'), dueReviewCard('due-2')])
    const launch = await startReview()
    mocks.listCardIdsReviewedSince.mockResolvedValue(['due-1'])
    const { completedUnitIds } = await reconcileCourseUnitProgress(PROFILE, { localLearningDay: '2026-07-18' })
    expect(completedUnitIds).toEqual([])
    expect((await getLearningUnitState(PROFILE, REVIEW_DEFINITION.unitId))?.activityStatus).toBe('inProgress')
    const resumed = await startReview()
    expect(resumed!.execution.executionId).toBe(launch!.execution.executionId)
    expect(resumed!.remainingCardIds).toEqual(['due-2'])
  })
})
