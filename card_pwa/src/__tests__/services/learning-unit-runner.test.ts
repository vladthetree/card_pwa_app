import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Card } from '../../types'
import { learningUnitsDb } from '../../db/learningUnitsDb'
import {
  countReviewUnitAttemptsForDay,
  getActiveExecution,
  getLearningUnitState,
  markVideoWatched,
  setVideoConfidence,
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
  listReservedStudySessionCardIds: vi.fn(async (): Promise<Set<string>> => new Set()),
  listAnswerStats: vi.fn(async (): Promise<Array<{ scopeId: string; unresolvedErrorItemIds: string[] }>> => []),
}))
vi.mock('../../db/queries', () => ({
  listCardsByIds: mocks.listCardsByIds,
  listCardIdsReviewedSince: mocks.listCardIdsReviewedSince,
  clearActiveSession: mocks.clearActiveSession,
  listCardsByDeckIdsDirect: mocks.listCardsByDeckIdsDirect,
  listReservedStudySessionCardIds: mocks.listReservedStudySessionCardIds,
}))
vi.mock('../../db/queries/answerStats', () => ({
  listAnswerStats: mocks.listAnswerStats,
}))

import {
  abortReviewUnit,
  getActiveCourseExecutionForVideo,
  recordCourseRecallRun,
  recordLabCheck,
  reconcileCourseUnitProgress,
  reconcileLegacyPointerCourseProgress,
  startOrResumeCourseUnit,
  startOrResumeLabUnit,
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
  mocks.listReservedStudySessionCardIds.mockResolvedValue(new Set())
  mocks.listAnswerStats.mockResolvedValue([])
})

afterEach(() => {
  vi.useRealTimers()
})

async function startUnit() {
  return startOrResumeCourseUnit({ profileId: PROFILE, definition: DEFINITION })
}

describe('startOrResumeCourseUnit', () => {
  it('friert beim Erststart den Recall ein und hält Karten aus der Video-Unit heraus', async () => {
    const launch = await startUnit()
    expect(launch.step).toBe('video')
    expect(launch.state.activityStatus).toBe('inProgress')

    const execution = launch.execution
    expect(execution.cardIds).toEqual([])
    // Zielmenge ist IMMER alles auflösbare — hier sind nur 3 der Kandidaten-
    // Karten mit gültiger M-ID-Front gemockt.
    expect(execution.recallQuestionIds.length).toBe(3)
    for (const questionId of execution.recallQuestionIds) {
      expect(CONTENT.recallQuestionIds).toContain(questionId)
    }
    expect((await getActiveCourseExecutionForVideo(PROFILE, VIDEO_INDEX))?.executionId).toBe(execution.executionId)
  })

  it('setzt eine aktive Ausführung fort statt neu zu starten', async () => {
    const first = await startUnit()
    const second = await startUnit()
    expect(second.execution.executionId).toBe(first.execution.executionId)
    expect(second.execution.cardIds).toEqual(first.execution.cardIds)
  })

  it('friert fehlende M-Fragen nicht ein und verhindert damit einen unlösbaren Recall-Schritt', async () => {
    mocks.listCardsByIds.mockImplementation(async ids => ids.map(id => makeCard(id, `Frage ${id}`)))

    const launch = await startUnit()

    expect(launch.execution.recallQuestionIds).toEqual([])
    expect(launch.execution.recallCardIds).toEqual([])
  })

  it('meldet nach einem vollständigen Recall ohne zusätzliches Watched- oder Karten-Gate done', async () => {
    const { execution } = await startUnit()
    await recordCourseRecallRun({
      profileId: PROFILE,
      videoIndex: VIDEO_INDEX,
      objectiveId: '1.1',
      executionId: execution.executionId,
      questionIds: [...execution.recallQuestionIds],
      questionVersionById: { ...execution.recallQuestionVersions },
      missedQuestionIds: [],
      correct: 3,
      total: 3,
    })
    await setVideoConfidence({
      profileId: PROFILE,
      videoIndex: VIDEO_INDEX,
      objectiveId: '1.1',
      confidence: 'solid',
      now: Date.now(),
    })
    const resumed = await startUnit()
    expect(resumed.step).toBe('done')
  })
})

describe('reconcileCourseUnitProgress', () => {
  it('schließt eine Unit erst ab, wenn JEDE Recall-Frage im Mastery-Modell bestanden ist — ein Fehler hält den Schritt offen, bis er an einem SPÄTEREN Tag getilgt wird', async () => {
    // Nur Date fälschen: fake-indexeddb löst Transaktionen intern über echte
    // Timer auf — mit vollständig gefakten Timern hängt jede DB-Operation.
    vi.useFakeTimers({ toFake: ['Date'] })
    const dayOneStart = new Date('2026-08-01T09:00:00Z').getTime()
    vi.setSystemTime(dayOneStart)

    const { execution } = await startUnit()
    const [q0, q1, q2] = execution.recallQuestionIds

    await reconcileCourseUnitProgress(PROFILE)
    expect((await getLearningUnitState(PROFILE, DEFINITION.unitId))?.activityStatus).toBe('inProgress')

    // Ein Fehler unter drei Fragen: der Schritt bleibt offen, auch nach Confidence.
    await recordCourseRecallRun({
      profileId: PROFILE,
      videoIndex: VIDEO_INDEX,
      objectiveId: '1.1',
      executionId: execution.executionId,
      questionIds: [q0, q1, q2],
      questionVersionById: { ...execution.recallQuestionVersions },
      missedQuestionIds: [q0],
      correct: 2,
      total: 3,
    })
    await setVideoConfidence({
      profileId: PROFILE,
      videoIndex: VIDEO_INDEX,
      objectiveId: '1.1',
      confidence: 'solid',
      now: Date.now(),
    })
    const afterFirstRun = await reconcileCourseUnitProgress(PROFILE)
    expect(afterFirstRun.completedUnitIds).toEqual([])
    expect((await getLearningUnitState(PROFILE, DEFINITION.unitId))?.currentStep).not.toBe('done')

    // Richtig am SELBEN Tag: reine Übung, tilgt den Fehler noch nicht (§ „kommende Tage“).
    await recordCourseRecallRun({
      profileId: PROFILE,
      videoIndex: VIDEO_INDEX,
      objectiveId: '1.1',
      executionId: execution.executionId,
      questionIds: [q0],
      questionVersionById: { [q0]: execution.recallQuestionVersions[q0] },
      missedQuestionIds: [],
      correct: 1,
      total: 1,
    })
    const sameDayReconcile = await reconcileCourseUnitProgress(PROFILE)
    expect(sameDayReconcile.completedUnitIds).toEqual([])

    // Richtig am FOLGETAG: tilgt den Fehler, alle drei Fragen liegen jetzt über 90 %.
    vi.setSystemTime(dayOneStart + 26 * 60 * 60 * 1000)
    await recordCourseRecallRun({
      profileId: PROFILE,
      videoIndex: VIDEO_INDEX,
      objectiveId: '1.1',
      executionId: execution.executionId,
      questionIds: [q0],
      questionVersionById: { [q0]: execution.recallQuestionVersions[q0] },
      missedQuestionIds: [],
      correct: 1,
      total: 1,
    })
    const { completedUnitIds } = await reconcileCourseUnitProgress(PROFILE)
    expect(completedUnitIds).toEqual([DEFINITION.unitId])
    const done = await getLearningUnitState(PROFILE, DEFINITION.unitId)
    expect(done?.activityStatus).toBe('completed')
    expect(await getActiveExecution(PROFILE, DEFINITION.unitId)).toBeUndefined()
  })

  it('zählt auch freie Recall-Läufe (executionId null) zur Mastery — gemessen wird Wissen pro Video, nicht ein einzelner Lauf', async () => {
    const { execution } = await startUnit()
    await markVideoWatched({ profileId: PROFILE, videoIndex: VIDEO_INDEX, objectiveId: '1.1', method: 'ended', now: Date.now() })
    await recordCourseRecallRun({
      profileId: PROFILE,
      videoIndex: VIDEO_INDEX,
      objectiveId: '1.1',
      executionId: null,
      questionIds: [...execution.recallQuestionIds],
      questionVersionById: { ...execution.recallQuestionVersions },
      missedQuestionIds: [],
      correct: 3,
      total: 3,
    })
    await setVideoConfidence({
      profileId: PROFILE,
      videoIndex: VIDEO_INDEX,
      objectiveId: '1.1',
      confidence: 'solid',
      now: Date.now(),
    })
    mocks.listCardIdsReviewedSince.mockResolvedValue([...execution.cardIds])
    const { completedUnitIds } = await reconcileCourseUnitProgress(PROFILE)
    expect(completedUnitIds).toEqual([DEFINITION.unitId])
  })

  it('schließt eine alte Pointer-Ausführung über die nach dem Check gesetzte Confidence ab', async () => {
    const now = Date.now()
    const executionId = `legacy:pointer:${VIDEO_INDEX}`
    await learningUnitsDb.unitExecutions.put({
      executionId,
      unitId: DEFINITION.unitId,
      profileId: PROFILE,
      evidenceEpoch: 1,
      type: 'course',
      createdAt: now - 1_000,
      cardIds: [...CONTENT.courseCardIds],
      recallQuestionIds: [],
      recallQuestionVersions: {},
      recallCardIds: [],
      recallSeed: 'legacy',
      sourceSnapshotId: 'legacy',
      contentManifestVersion: 'legacy',
      contentVersions: {},
    })
    await learningUnitsDb.learningUnitState.put({
      profileId: PROFILE,
      evidenceEpoch: 1,
      unitId: DEFINITION.unitId,
      activityStatus: 'inProgress',
      currentStep: 'video',
      activeExecutionId: executionId,
      startedAt: now - 1_000,
      lastActivityAt: now - 1_000,
      updatedAt: now - 1_000,
    })
    await setVideoConfidence({
      profileId: PROFILE,
      videoIndex: VIDEO_INDEX,
      objectiveId: '1.1',
      confidence: 'solid',
      now,
    })

    const result = await reconcileCourseUnitProgress(PROFILE)
    expect(result.completedUnitIds).toEqual([DEFINITION.unitId])
    expect((await getLearningUnitState(PROFILE, DEFINITION.unitId))?.activityStatus).toBe('completed')
  })
})

describe('reconcileLegacyPointerCourseProgress', () => {
  it('persistiert einen nur im Overlay sichtbaren Abschluss aus Recall plus Lernstatus', async () => {
    const startedAt = Date.now() - 10_000
    await recordCourseRecallRun({
      profileId: PROFILE,
      videoIndex: VIDEO_INDEX,
      objectiveId: '1.1',
      executionId: null,
      questionIds: ['M1-001', 'M1-002', 'M1-003'],
      questionVersionById: { 'M1-001': 'v1', 'M1-002': 'v1', 'M1-003': 'v1' },
      missedQuestionIds: [],
      correct: 3,
      total: 3,
    })
    await setVideoConfidence({
      profileId: PROFILE,
      videoIndex: VIDEO_INDEX,
      objectiveId: '1.1',
      confidence: 'solid',
      now: Date.now(),
    })

    const repaired = await reconcileLegacyPointerCourseProgress(PROFILE, {
      activeIndex: VIDEO_INDEX,
      activeStartedAt: startedAt,
    })

    expect(repaired).toBe(true)
    expect((await getLearningUnitState(PROFILE, DEFINITION.unitId))?.activityStatus).toBe('completed')
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

  async function startReadyReview() {
    const result = await startReview()
    expect(result.status).toBe('ready')
    if (result.status !== 'ready') throw new Error(`Review konnte nicht gestartet werden: ${result.reason}`)
    return result
  }

  it('friert fällige Karten und ungelöste Fehler ein; neue Karten bleiben draußen', async () => {
    mocks.listCardsByDeckIdsDirect.mockResolvedValue([
      dueReviewCard('due-1'),
      makeCard('new-1', 'Neue Karte'), // type 'new' → nie Teil einer Wiederholung
      { ...makeCard('err-1', 'Fehlerkarte'), type: 'review', due: 999_999 }, // nicht fällig
    ])
    mocks.listAnswerStats.mockResolvedValue([{ scopeId: 'err-1', unresolvedErrorItemIds: ['err-1'] }])

    const launch = await startReadyReview()
    expect(launch.execution.cardIds).toEqual(['due-1', 'err-1'])
    expect(launch.execution.reasonByCardId).toEqual({ 'due-1': 'due', 'err-1': 'unresolved-error' })
    expect(launch.state.currentStep).toBe('cards')
  })

  it('liefert einen eindeutigen Leergrund, wenn weder Fälligkeit noch ungelöste Fehler vorliegen', async () => {
    mocks.listCardsByDeckIdsDirect.mockResolvedValue([makeCard('new-1', 'Neue Karte')])
    await expect(startReview()).resolves.toEqual({ status: 'unavailable', reason: 'no-eligible-cards' })
    expect(await getLearningUnitState(PROFILE, REVIEW_DEFINITION.unitId)).toBeUndefined()
  })

  it('unterscheidet fällige, aber von einer laufenden Study-Session reservierte Karten', async () => {
    mocks.listCardsByDeckIdsDirect.mockResolvedValue([dueReviewCard('due-1')])
    mocks.listReservedStudySessionCardIds.mockResolvedValue(new Set(['due-1']))

    await expect(startReview()).resolves.toEqual({
      status: 'unavailable',
      reason: 'reserved-by-active-session',
    })
    expect(await getLearningUnitState(PROFILE, REVIEW_DEFINITION.unitId)).toBeUndefined()
  })

  it('setzt die aktive Ausführung fort; Abschluss protokolliert den Versuch am Lerntag', async () => {
    mocks.listCardsByDeckIdsDirect.mockResolvedValue([dueReviewCard('due-1'), dueReviewCard('due-2')])
    const first = await startReadyReview()
    const second = await startReadyReview()
    expect(second.execution.executionId).toBe(first.execution.executionId)

    mocks.listCardIdsReviewedSince.mockResolvedValue([...first.execution.cardIds])
    const { completedUnitIds } = await reconcileCourseUnitProgress(PROFILE, { localLearningDay: '2026-07-18' })
    expect(completedUnitIds).toContain(REVIEW_DEFINITION.unitId)
    expect((await getLearningUnitState(PROFILE, REVIEW_DEFINITION.unitId))?.activityStatus).toBe('completed')
    expect(await countReviewUnitAttemptsForDay(PROFILE, '2026-07-18')).toBe(1)
    expect(await countReviewUnitAttemptsForDay(PROFILE, '2026-07-19')).toBe(0)
    expect(mocks.clearActiveSession).toHaveBeenCalledWith(`unit-exec:${first.execution.executionId}`)
  })

  it('expliziter Abbruch: abandoned zählt nicht zur Tageskappe, Neustart friert frisch ein', async () => {
    mocks.listCardsByDeckIdsDirect.mockResolvedValue([dueReviewCard('due-1')])
    const launch = await startReadyReview()
    const aborted = await abortReviewUnit({
      profileId: PROFILE,
      unitId: REVIEW_DEFINITION.unitId,
      localLearningDay: '2026-07-19',
    })
    expect(aborted).toBe(true)
    expect((await getLearningUnitState(PROFILE, REVIEW_DEFINITION.unitId))?.activityStatus).toBe('notStarted')
    // Abgebrochene Versuche zählen nicht als Abschluss (§11 Tageskappe).
    expect(await countReviewUnitAttemptsForDay(PROFILE, '2026-07-19')).toBe(0)
    expect(mocks.clearActiveSession).toHaveBeenCalledWith(`unit-exec:${launch.execution.executionId}`)
    // Ausführung bleibt Audit-Historie; ein Neustart erzeugt eine frische Auswahl.
    expect(await learningUnitsDb.unitExecutions.get(launch.execution.executionId)).toBeDefined()
    const restart = await startReadyReview()
    expect(restart.execution.executionId).not.toBe(launch.execution.executionId)
  })

  it('unvollständig bewertete Wiederholungen bleiben inProgress und reserviert', async () => {
    mocks.listCardsByDeckIdsDirect.mockResolvedValue([dueReviewCard('due-1'), dueReviewCard('due-2')])
    const launch = await startReadyReview()
    mocks.listCardIdsReviewedSince.mockResolvedValue(['due-1'])
    const { completedUnitIds } = await reconcileCourseUnitProgress(PROFILE, { localLearningDay: '2026-07-18' })
    expect(completedUnitIds).toEqual([])
    expect((await getLearningUnitState(PROFILE, REVIEW_DEFINITION.unitId))?.activityStatus).toBe('inProgress')
    const resumed = await startReadyReview()
    expect(resumed.execution.executionId).toBe(launch.execution.executionId)
    expect(resumed.remainingCardIds).toEqual(['due-2'])
  })
})

describe('startOrResumeLabUnit / recordLabCheck', () => {
  const SCENARIO = {
    id: 'lab-42',
    categoryId: 'firewalls',
    title: 'ACL prüfen',
    objective: '4.5 Given a scenario …',
    difficulty: 'einsteiger' as const,
    minutes: 10,
    description: 'Regeln den richtigen Wirkungen zuordnen.',
    interaction: {
      type: 'matching' as const,
      items: [
        { left: 'deny tcp any any eq 23', right: 'Telnet blockieren' },
        { left: 'permit tcp any host 10.0.0.5 eq 443', right: 'HTTPS zum Webserver erlauben' },
      ],
      options: ['Telnet blockieren', 'HTTPS zum Webserver erlauben', 'DNS umleiten'],
    },
  }

  it('startet Versuch + Unit atomar mit §13.2-Snapshot und resumt statt neu zu starten', async () => {
    const first = await startOrResumeLabUnit({ profileId: PROFILE, scenario: SCENARIO, language: 'de' })
    expect(first.state.activityStatus).toBe('inProgress')
    expect(first.state.currentStep).toBe('lab')
    expect(first.execution.labAttemptId).toBe(first.attempt.attemptId)
    // Eingefroren ist der normalisierte Snapshot mit Schritt-IDs und Rubrik.
    const snapshot = first.attempt.scenarioSnapshot as { steps: Array<{ stepId: string }>; rubric: unknown[] }
    expect(snapshot.steps[0].stepId).toBe('step-1')
    expect(snapshot.rubric).toHaveLength(1)
    expect(first.attempt.scenarioVersion).toMatch(/^v-/)

    const second = await startOrResumeLabUnit({ profileId: PROFILE, scenario: SCENARIO, language: 'de' })
    expect(second.execution.executionId).toBe(first.execution.executionId)
    expect(second.attempt.attemptId).toBe(first.attempt.attemptId)
  })

  it('paralleler Doppelstart (StrictMode-Doppeleffekt) teilt sich Versuch und Ausführung statt zu werfen', async () => {
    const [a, b] = await Promise.all([
      startOrResumeLabUnit({ profileId: PROFILE, scenario: SCENARIO, language: 'de' }),
      startOrResumeLabUnit({ profileId: PROFILE, scenario: SCENARIO, language: 'de' }),
    ])
    expect(a.attempt.attemptId).toBe(b.attempt.attemptId)
    expect(a.execution.executionId).toBe(b.execution.executionId)
    const attempts = await learningUnitsDb.labAttempts
      .where('[profileId+scenarioId]').equals([PROFILE, SCENARIO.id]).toArray()
    expect(attempts.filter(attempt => attempt.status === 'inProgress')).toHaveLength(1)
  })

  it('Teilversuch wird gegen die eingefrorene Rubrik bewertet; volle Punktzahl gibt ab und schließt die Unit', async () => {
    const launch = await startOrResumeLabUnit({ profileId: PROFILE, scenario: SCENARIO, language: 'de' })

    const partial = await recordLabCheck({
      profileId: PROFILE, scenarioId: SCENARIO.id,
      answerByStepId: { 'step-1': { 'deny tcp any any eq 23': 'Telnet blockieren' } },
      score: 0.5,
    })
    expect(partial).toMatchObject({ earnedPoints: 1, possiblePoints: 2, solved: false })
    const afterFail = await learningUnitsDb.labAttempts.get(launch.attempt.attemptId)
    expect(afterFail?.status).toBe('inProgress')
    expect(afterFail?.failedAttemptCount).toBe(1)
    expect((await getLearningUnitState(PROFILE, 'unit:lab:lab-42'))?.activityStatus).toBe('inProgress')

    const full = await recordLabCheck({
      profileId: PROFILE, scenarioId: SCENARIO.id,
      answerByStepId: { 'step-1': {
        'deny tcp any any eq 23': 'Telnet blockieren',
        'permit tcp any host 10.0.0.5 eq 443': 'HTTPS zum Webserver erlauben',
      } },
      score: 1,
    })
    expect(full).toMatchObject({ earnedPoints: 2, possiblePoints: 2, solved: true })
    const submitted = await learningUnitsDb.labAttempts.get(launch.attempt.attemptId)
    expect(submitted?.status).toBe('submitted')
    expect(submitted?.scoreEarned).toBe(2)
    expect(submitted?.scorePossible).toBe(2)
    expect((await getLearningUnitState(PROFILE, 'unit:lab:lab-42'))?.activityStatus).toBe('completed')
    expect(await getActiveExecution(PROFILE, 'unit:lab:lab-42')).toBeUndefined()
  })

  it('ohne laufenden Versuch ist recordLabCheck ein No-op', async () => {
    expect(await recordLabCheck({ profileId: PROFILE, scenarioId: 'nie-gestartet', answerByStepId: {}, score: 1 })).toBeNull()
    expect(await learningUnitsDb.labAttempts.count()).toBe(0)
  })
})
