import { describe, it, expect } from 'vitest'
import type { Card } from '../../types'
import type { LocalVideoMeta } from '../../utils/localVideoManifest'
import {
  COURSE_UNIT_COUNT,
  COURSE_UNIT_RECALL_OVERHEAD_MINUTES,
  SY0701_OBJECTIVE_IDS,
  buildCourseUnits,
  buildRequirementCoverage,
  buildVideoCardIndex,
  computeCourseStepState,
  createCourseExecution,
  formatCourseUnitId,
  normalizeRecallCheckSize,
  objectiveIdOfDeckId,
  buildLabUnits,
  buildReviewUnits,
  buildReviewSelection,
  formatReviewUnitId,
  selectRecallQuestionIds,
  summarizeLeafCoverageByObjective,
  validateCourseCatalog,
  type LearningUnitExecution,
  type RequirementCoverage,
  type VideoContentMapEntry,
  type VideoRecallRun,
} from '../../utils/learningUnits'
import { SY0701_CONTENT_MAP, SY0701_CONTENT_MAP_BY_VIDEO_INDEX } from '../../data/sy0701ContentMap'
import { SY0701_REQUIREMENTS_MANIFEST } from '../../data/sy0701Requirements'
import { SY0701_COVERAGE_SUMMARY } from '../../data/sy0701Coverage'
import contentQaReport from '../../../content/sy0-701/generated/content-qa-report.json'

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeCard(id: string, overrides: Partial<Card> = {}): Card {
  return {
    id,
    noteId: `note-${id}`,
    deckId: 'sy0-701-objective-1-1',
    type: 'new',
    front: `Frage ${id}`,
    back: 'Antwort',
    extra: { acronym: '', examples: '', port: '', protocol: '' },
    tags: [],
    interval: 0,
    due: 0,
    reps: 0,
    lapses: 0,
    queue: 0,
    ...overrides,
  }
}

function makeVideo(index: number, objective: string, title?: string): LocalVideoMeta {
  return {
    index,
    objective,
    domain: Number(objective.split('.')[0]),
    title: title ?? `Video ${index}`,
    file: `${String(index).padStart(3, '0')} - ${objective} - Video ${index}.mp4`,
  }
}

/** Vollständiger synthetischer Kurskatalog 002–121 aus der echten Content-Map. */
const realCatalog: LocalVideoMeta[] = SY0701_CONTENT_MAP.map(entry =>
  makeVideo(entry.videoIndex, entry.objectiveId),
)

const contentEntry: VideoContentMapEntry = {
  videoIndex: 2,
  objectiveId: '1.1',
  primarySubDeckId: 'sy0-701-objective-1-1',
  sourceSubDeckIds: ['sy0-701-objective-1-1'],
  requirementIds: [],
  courseCardIds: ['c1', 'c2', 'c3'],
  recallQuestionIds: ['M1-001', 'M1-002', 'M1-003', 'T002-01'],
  recallCardIds: ['c1', 'c2', 'c3'],
}

function makeExecution(overrides: Partial<Extract<LearningUnitExecution, { type: 'course' }>> = {}): LearningUnitExecution {
  return {
    executionId: 'exec-1',
    unitId: 'unit:course:002',
    profileId: 'profil-a',
    evidenceEpoch: 1,
    type: 'course',
    createdAt: 1_000_000,
    cardIds: ['c1', 'c2'],
    recallQuestionIds: ['M1-001', 'T002-01'],
    recallQuestionVersions: { 'M1-001': 'v1', 'T002-01': 'v1' },
    recallCardIds: ['c1'],
    recallSeed: 'seed',
    sourceSnapshotId: 'snap-1',
    contentManifestVersion: 'manifest-1',
    contentVersions: { c1: 'v1', c2: 'v1' },
    ...overrides,
  }
}

function makeRun(execution: Extract<LearningUnitExecution, { type: 'course' }>, overrides: Partial<VideoRecallRun> = {}): VideoRecallRun {
  return {
    runId: 'run-1',
    profileId: execution.profileId,
    evidenceEpoch: execution.evidenceEpoch,
    videoIndex: 2,
    executionId: execution.executionId,
    sourceSnapshotId: execution.sourceSnapshotId,
    contentManifestVersion: execution.contentManifestVersion,
    questionIds: [...execution.recallQuestionIds],
    questionVersionById: { ...execution.recallQuestionVersions },
    correct: 2,
    total: 2,
    verdict: 'understood',
    completedAt: execution.createdAt + 60_000,
    ...overrides,
  }
}

// ── Generierte Datenmodule: echte Bestandsinvarianten ───────────────────────

describe('generierte SY0701-Datenmodule', () => {
  it('deckt exakt die Kursindizes 002–121 mit bekannten Objectives ab', () => {
    expect(SY0701_CONTENT_MAP).toHaveLength(COURSE_UNIT_COUNT)
    const known = new Set(SY0701_OBJECTIVE_IDS)
    for (const entry of SY0701_CONTENT_MAP) {
      expect(entry.videoIndex).toBeGreaterThanOrEqual(2)
      expect(entry.videoIndex).toBeLessThanOrEqual(121)
      expect(known.has(entry.objectiveId)).toBe(true)
    }
  })

  it('mappt alle 412 Objective-Subdeck-Karten exakt und lässt kein Video ohne Recall-Fragen', () => {
    const mapped = SY0701_CONTENT_MAP.reduce((n, e) => n + e.courseCardIds.length, 0)
    expect(mapped).toBe(412)
    expect(new Set(SY0701_CONTENT_MAP.flatMap(entry => entry.courseCardIds)).size).toBe(412)
    expect(new Set(SY0701_CONTENT_MAP.map(entry => entry.primarySubDeckId)).size).toBe(28)
    // SOAR liegt physisch weiterhin im 4.7-Subdeck, gehört laut Messer-
    // Transkript aber exakt zur Video-Unit 107 unter dem primären 5.1-Subdeck.
    const securityProcedures = SY0701_CONTENT_MAP_BY_VIDEO_INDEX.get(107)!
    expect(securityProcedures.primarySubDeckId).toBe('sy0-701-objective-5-1')
    expect(securityProcedures.sourceSubDeckIds).toContain('sy0-701-objective-4-7')
    expect(securityProcedures.courseCardIds).toContain('1779669260172')
    for (const entry of SY0701_CONTENT_MAP) {
      expect(entry.recallQuestionIds.length).toBeGreaterThan(0)
    }
  })

  it('führt 655 Requirements mit eindeutigen IDs über alle 28 Objectives', () => {
    const reqs = SY0701_REQUIREMENTS_MANIFEST.requirements
    expect(reqs).toHaveLength(655)
    expect(new Set(reqs.map(r => r.requirementId)).size).toBe(655)
    expect(new Set(reqs.map(r => r.objectiveId)).size).toBe(28)
    // Kritische Requirements ohne Definition wären ein Gate-Fehler.
    for (const r of reqs.filter(r => r.criticality === 'critical')) {
      expect(r.criticalErrorClassIds.length).toBeGreaterThan(0)
    }
  })
})

// ── Manifestvalidierung + Builder ───────────────────────────────────────────

describe('validateCourseCatalog / buildCourseUnits', () => {
  it('akzeptiert den echten Katalog und liefert genau 120 stabile Course-Units', () => {
    expect(validateCourseCatalog(realCatalog).ok).toBe(true)
    const units = buildCourseUnits({
      videos: realCatalog,
      contentMapByVideoIndex: SY0701_CONTENT_MAP_BY_VIDEO_INDEX,
      definitionVersion: 'def-1',
    })
    expect(units).toHaveLength(120)
    expect(units[0].unitId).toBe('unit:course:002')
    expect(units[119].unitId).toBe('unit:course:121')
    expect(new Set(units.map(u => u.unitId)).size).toBe(120)
    for (const unit of units) {
      expect(unit.type).toBe('course')
      expect(unit.videoIndex).toBe(unit.order)
      // Dauerschätzung = ffprobe-Videodauer + Draft-Overhead (Pacing-Grundlage).
      expect(unit.estimatedMinutes).toBeGreaterThan(COURSE_UNIT_RECALL_OVERHEAD_MINUTES)
      expect(unit.labScenarioId).toBeUndefined()
      expect(unit.examLaunch).toBeUndefined()
    }
  })

  it('meldet doppelte, fehlende und unbekannte Indizes/Objectives', () => {
    const broken = [makeVideo(2, '1.1'), makeVideo(2, '1.2'), makeVideo(4, '9.9')]
    const result = validateCourseCatalog(broken)
    expect(result.ok).toBe(false)
    const codes = result.errors.map(e => e.code)
    expect(codes).toContain('duplicate-index')
    expect(codes).toContain('unknown-objective')
    expect(codes).toContain('missing-index')
    expect(() =>
      buildCourseUnits({ videos: broken, contentMapByVideoIndex: new Map(), definitionVersion: 'v' }),
    ).toThrow(/ungültig/)
  })
})

// ── Video↔Karten-Index ──────────────────────────────────────────────────────

describe('buildVideoCardIndex', () => {
  const catalog = [makeVideo(2, '1.1', 'Security Controls'), makeVideo(3, '3.1', 'Cloud Infrastructures')]
  const titleByQuestion = { 'M1-001': 'Security Controls', 'M3-005': 'Cloud Infrastructures', 'M9-999': 'Gibt Es Nicht' }

  it('mappt M-Karten aufs Video, lässt Unmapped im Practice-Pool und markiert Fehlplatzierungen', () => {
    const cards = [
      makeCard('a', { front: 'M1-001: Frage?' }),
      // deckt 1.2, gehört laut M-ID aber zu Video 3 (Objective 3.1) → misplaced, trotzdem gemappt
      makeCard('b', { front: 'M3-005: Frage?', deckId: 'sy0-701-objective-1-2' }),
      makeCard('c', { front: 'Ohne M-ID' }),
      makeCard('d', { front: 'M9-999: Titel existiert nicht' }),
      makeCard('e', { front: 'M1-001: Root-Deck zählt nicht', deckId: 'root-deck-01' }),
    ]
    const index = buildVideoCardIndex({ catalog, cards, videoTitleByQuestionId: titleByQuestion })
    expect(index.cardIdsByVideoIndex.get(2)).toEqual(['a'])
    expect(index.cardIdsByVideoIndex.get(3)).toEqual(['b'])
    expect(index.misplacedCardIds).toEqual(['b'])
    expect(index.unmappedCardIds).toEqual(['c', 'd'])
    expect(index.missingQuestionIds).toEqual(['M9-999'])
    expect(index.duplicateVideoTitles).toEqual([])
  })

  it('löst Karten mit mehrdeutigem Videotitel nicht willkürlich auf', () => {
    const dupCatalog = [...catalog, makeVideo(4, '1.1', 'Security Controls')]
    const index = buildVideoCardIndex({
      catalog: dupCatalog,
      cards: [makeCard('a', { front: 'M1-001: Frage?' })],
      videoTitleByQuestionId: titleByQuestion,
    })
    expect(index.duplicateVideoTitles).toEqual(['Security Controls'])
    expect(index.unmappedCardIds).toEqual(['a'])
  })
})

// ── Recall-/Kartenauswahl ───────────────────────────────────────────────────

describe('selectRecallQuestionIds', () => {
  const candidates = Array.from({ length: 20 }, (_, i) => `Q-${String(i + 1).padStart(2, '0')}`)
  const cardByQuestion = new Map(candidates.slice(0, 10).map(id => [id, `card-${id}`]))

  it('ist deterministisch unter demselben Seed und normalisiert die Größe auf 3–15', () => {
    const a = selectRecallQuestionIds({ candidateQuestionIds: candidates, recallCardIdByQuestionId: cardByQuestion, recallCheckSize: 7, selectionSeed: 's1' })
    const b = selectRecallQuestionIds({ candidateQuestionIds: candidates, recallCardIdByQuestionId: cardByQuestion, recallCheckSize: 7, selectionSeed: 's1' })
    expect(a).toEqual(b)
    expect(a.selectedQuestionIds).toHaveLength(7)
    expect(selectRecallQuestionIds({ candidateQuestionIds: candidates, recallCardIdByQuestionId: cardByQuestion, recallCheckSize: 99, selectionSeed: 's' }).selectedQuestionIds).toHaveLength(15)
    expect(selectRecallQuestionIds({ candidateQuestionIds: candidates, recallCardIdByQuestionId: cardByQuestion, recallCheckSize: 0, selectionSeed: 's' }).selectedQuestionIds).toHaveLength(3)
    expect(normalizeRecallCheckSize(undefined)).toBe(7)
  })

  it('kappt auf die Kandidatenzahl und liefert Card-IDs nur der ausgewählten Fragen', () => {
    const small = candidates.slice(0, 2)
    const result = selectRecallQuestionIds({ candidateQuestionIds: small, recallCardIdByQuestionId: cardByQuestion, recallCheckSize: 7, selectionSeed: 's' })
    expect(result.selectedQuestionIds).toHaveLength(2)
    for (const cardId of result.selectedRecallCardIds) {
      const questionId = cardId.replace('card-', '')
      expect(result.selectedQuestionIds).toContain(questionId)
    }
  })
})

// ── Eingefrorene Ausführung ─────────────────────────────────────────────────

describe('createCourseExecution', () => {
  const definition = {
    unitId: formatCourseUnitId(2),
    type: 'course' as const,
    title: 'Security Controls',
    objectiveIds: ['1.1'],
    requirementIds: [],
    order: 2,
    videoIndex: 2,
    definitionVersion: 'def-1',
  }
  const baseInput = {
    executionId: 'exec-uuid',
    profileId: 'profil-a',
    evidenceEpoch: 1,
    definition,
    content: contentEntry,
    selectedCardIds: ['c1', 'c2'],
    selectedRecallQuestionIds: ['M1-001', 'T002-01'],
    selectedRecallCardIds: ['c1'],
    recallSeed: 'rs',
    recallQuestionVersionsById: new Map([['M1-001', 'v2']]),
    sourceSnapshotId: 'snap-1',
    contentManifestVersion: 'manifest-1',
    contentVersionsByCardId: new Map([['c1', 'v3']]),
    now: 1_000_000,
  }

  it('friert nur ausgewählte IDs samt Versionen ein und kopiert die Arrays', () => {
    const selected = ['c1', 'c2']
    const execution = createCourseExecution({ ...baseInput, selectedCardIds: selected })
    if (execution.type !== 'course') throw new Error('erwartet course')
    expect(execution.cardIds).toEqual(['c1', 'c2'])
    expect(execution.recallQuestionVersions).toEqual({ 'M1-001': 'v2', 'T002-01': 'v1' })
    expect(execution.contentVersions).toEqual({ c1: 'v3', c2: 'v1' })
    selected.push('c3') // Mutation nach Erstellung darf nichts ändern
    expect(execution.cardIds).toEqual(['c1', 'c2'])
  })

  it('lehnt Karten/Fragen ab, die nicht zum Video gemappt sind', () => {
    expect(() => createCourseExecution({ ...baseInput, selectedCardIds: ['fremd'] })).toThrow(/nicht für Video/)
    expect(() => createCourseExecution({ ...baseInput, selectedRecallQuestionIds: ['M9-999'] })).toThrow(/gehört nicht zu Video/)
  })
})

// ── Schrittstatus + Tageswechsel ────────────────────────────────────────────

describe('computeCourseStepState', () => {
  const execution = makeExecution() as Extract<LearningUnitExecution, { type: 'course' }>
  const watched = {
    profileId: 'profil-a', evidenceEpoch: 1, videoIndex: 2, objectiveId: '1.1',
    watchedAt: 900_000, watchedMethod: 'ended' as const, updatedAt: 900_000,
  }
  const watchedWithConfidence = {
    ...watched,
    confidence: 'solid' as const,
    confidenceAt: 950_000,
  }

  it('zählt Öffnen nicht als angesehen; nur ended/manual setzen videoDone', () => {
    const opened = { ...watched, watchedAt: undefined, watchedMethod: undefined, openedAt: 950_000 }
    expect(computeCourseStepState({ execution, videoProgress: opened, recallRuns: [], reviewedCardIdsSinceStart: new Set() }).videoDone).toBe(false)
    expect(computeCourseStepState({ execution, videoProgress: watched, recallRuns: [], reviewedCardIdsSinceStart: new Set() }).videoDone).toBe(true)
  })

  it('akzeptiert nur den vollständigen eingefrorenen Recall derselben Execution', () => {
    const run = makeRun(execution)
    const state = (runs: VideoRecallRun[]) =>
      computeCourseStepState({ execution, recallRuns: runs, reviewedCardIdsSinceStart: new Set() })
    expect(state([run]).recallDone).toBe(true)
    expect(state([run]).videoDone).toBe(true)
    expect(state([run]).confidenceDone).toBe(false)
    expect(state([run]).currentStep).toBe('recall')
    expect(computeCourseStepState({
      execution,
      videoProgress: watchedWithConfidence,
      recallRuns: [run],
      reviewedCardIdsSinceStart: new Set(),
    }).currentStep).toBe('done')
    expect(state([makeRun(execution, { executionId: null })]).recallDone).toBe(false)
    expect(state([makeRun(execution, { executionId: 'andere-exec' })]).recallDone).toBe(false)
    expect(state([makeRun(execution, { completedAt: execution.createdAt - 1 })]).recallDone).toBe(false)
    expect(state([makeRun(execution, { questionIds: ['M1-001'], total: 1 })]).recallDone).toBe(false)
    expect(state([makeRun(execution, { questionIds: [...execution.recallQuestionIds].reverse() })]).recallDone).toBe(false)
    expect(state([makeRun(execution, { questionVersionById: { 'M1-001': 'v9', 'T002-01': 'v1' } })]).recallDone).toBe(false)
    expect(state([makeRun(execution, { total: 1 })]).recallDone).toBe(false)
    expect(state([makeRun(execution, { contentManifestVersion: 'anderes-manifest' })]).recallDone).toBe(true)
  })

  it('überlebt den Tageswechsel: Vergleiche hängen an createdAt, nie am Tagesanfang', () => {
    const twoDaysLater = execution.createdAt + 2 * 86_400_000
    const run = makeRun(execution, { completedAt: twoDaysLater })
    const result = computeCourseStepState({
      execution,
      videoProgress: watchedWithConfidence,
      recallRuns: [run],
      reviewedCardIdsSinceStart: new Set(['c1', 'c2']),
    })
    expect(result).toEqual({
      videoDone: true,
      recallDone: true,
      confidenceDone: true,
      cardsDone: true,
      currentStep: 'done',
    })
  })

  it('führt alte Course-Karten nur diagnostisch und blockiert damit den Videoabschluss nicht', () => {
    const partial = computeCourseStepState({ execution, videoProgress: watchedWithConfidence, recallRuns: [makeRun(execution)], reviewedCardIdsSinceStart: new Set(['c1', 'fremde-karte']) })
    expect(partial.cardsDone).toBe(false)
    expect(partial.currentStep).toBe('done')
    const empty = makeExecution({ cardIds: [], recallQuestionIds: [], recallQuestionVersions: {}, recallCardIds: [] }) as Extract<LearningUnitExecution, { type: 'course' }>
    const skipped = computeCourseStepState({ execution: empty, videoProgress: watchedWithConfidence, recallRuns: [], reviewedCardIdsSinceStart: new Set() })
    expect(skipped).toEqual({
      videoDone: true,
      recallDone: true,
      confidenceDone: true,
      cardsDone: true,
      currentStep: 'done',
    })
  })

  it('repariert eine alte Pointer-Ausführung anhand des vorhandenen Recall-/Confidence-Signals', () => {
    const legacy = makeExecution({
      executionId: 'legacy:pointer:2',
      recallQuestionIds: [],
      recallQuestionVersions: {},
      recallCardIds: [],
      sourceSnapshotId: 'legacy',
      contentManifestVersion: 'legacy',
    }) as Extract<LearningUnitExecution, { type: 'course' }>
    const legacyRun = makeRun(legacy, {
      executionId: null,
      sourceSnapshotId: 'legacy',
      contentManifestVersion: 'legacy',
      questionIds: [],
      questionVersionById: {},
      total: 3,
    })

    const fromRecall = computeCourseStepState({
      execution: legacy,
      recallRuns: [legacyRun],
      reviewedCardIdsSinceStart: new Set(),
    })
    expect(fromRecall.recallDone).toBe(true)
    expect(fromRecall.confidenceDone).toBe(false)
    expect(fromRecall.currentStep).toBe('recall')

    const fromConfidence = computeCourseStepState({
      execution: legacy,
      videoProgress: {
        profileId: legacy.profileId,
        evidenceEpoch: legacy.evidenceEpoch,
        videoIndex: 2,
        objectiveId: '1.1',
        confidence: 'solid',
        confidenceAt: legacy.createdAt + 1,
        updatedAt: legacy.createdAt + 1,
      },
      recallRuns: [],
      reviewedCardIdsSinceStart: new Set(),
    })
    expect(fromConfidence.currentStep).toBe('done')
  })
})

// ── Leaf-Coverage ───────────────────────────────────────────────────────────

describe('buildRequirementCoverage', () => {
  const reqs = SY0701_REQUIREMENTS_MANIFEST.requirements

  it('blockiert alle 655 echten Requirements ohne freigegebene Coverage-Einträge', () => {
    const report = buildRequirementCoverage({ sourceSnapshotId: 'snap', requirements: reqs, criticalErrorDefinitions: [], coverage: [], now: 1 })
    expect(report.requirementCount).toBe(655)
    expect(report.coveredCount).toBe(0)
    expect(report.blockingRequirementIds).toHaveLength(655)
  })

  it('zählt covered nur mit Asset, Assessment, Review und (bei Szenariozielen) Praxis', () => {
    const scenarioReq = reqs.find(r => r.scenarioRequired)!
    const plainReq = reqs.find(r => !r.scenarioRequired)!
    const entry = (requirementId: string, extras: Partial<RequirementCoverage> = {}): RequirementCoverage => ({
      requirementId,
      learningAssetIds: ['video:2'],
      assessmentItemIds: ['M1-001'],
      practicalItemIds: [],
      qaStatus: 'covered',
      reviewer: 'vlad',
      ...extras,
    })
    const report = buildRequirementCoverage({
      sourceSnapshotId: 'snap',
      requirements: [scenarioReq, plainReq],
      criticalErrorDefinitions: [],
      coverage: [entry(scenarioReq.requirementId), entry(plainReq.requirementId)],
      now: 1,
    })
    // Szenarioziel ohne praktischen Pfad bleibt blockierend, das einfache Ziel nicht.
    expect(report.coveredCount).toBe(1)
    expect(report.blockingRequirementIds).toEqual([scenarioReq.requirementId])
    expect(report.byRequirementId[scenarioReq.requirementId].qaStatus).toBe('practice-missing')
    expect(report.byRequirementId[plainReq.requirementId].qaStatus).toBe('covered')
    const withPractical = buildRequirementCoverage({
      sourceSnapshotId: 'snap',
      requirements: [scenarioReq],
      criticalErrorDefinitions: [],
      coverage: [entry(scenarioReq.requirementId, { practicalItemIds: ['lab:x'] })],
      now: 1,
    })
    expect(withPractical.coveredCount).toBe(1)
  })

  it('blockiert kritische Requirements ohne existierende Fehlerdefinition', () => {
    const critical = { ...reqs[0], criticality: 'critical' as const, criticalErrorClassIds: ['err-1'] }
    const coverage: RequirementCoverage[] = [{
      requirementId: critical.requirementId,
      learningAssetIds: ['video:2'],
      assessmentItemIds: ['M1-001'],
      practicalItemIds: [],
      qaStatus: 'covered',
      reviewer: 'vlad',
    }]
    const missing = buildRequirementCoverage({ sourceSnapshotId: 's', requirements: [critical], criticalErrorDefinitions: [], coverage, now: 1 })
    expect(missing.coveredCount).toBe(0)
    const definition = {
      errorClassId: 'err-1', definitionVersion: 'v1', requirementId: critical.requirementId,
      severity: 'critical' as const, description: 'Verwechslung', triggerRuleId: 'rule-1',
      resolutionRule: { minIndependentCorrectEvents: 2, minSpacingHours: 24, practicalRecheckRequired: false },
    }
    const present = buildRequirementCoverage({ sourceSnapshotId: 's', requirements: [critical], criticalErrorDefinitions: [definition], coverage, now: 1 })
    expect(present.coveredCount).toBe(1)
  })

  it('liefert Generator und Runtime-UI dieselben ehrlichen Coverage-Zahlen', () => {
    expect(SY0701_COVERAGE_SUMMARY.sourceSnapshotId).toBe(contentQaReport.sourceSnapshotId)
    expect(SY0701_COVERAGE_SUMMARY.requirementCount).toBe(contentQaReport.requirementCount)
    expect(SY0701_COVERAGE_SUMMARY.coveredCount).toBe(contentQaReport.coveredCount)
    expect(SY0701_COVERAGE_SUMMARY.blockingRequirementIds).toEqual(contentQaReport.blockingRequirementIds)
    expect(SY0701_COVERAGE_SUMMARY.missingPracticalRequirementIds).toEqual(contentQaReport.missingPracticalRequirementIds)
    expect(contentQaReport.statusCounts).toMatchObject({ covered: 655, 'practice-missing': 0 })
  })
})

describe('summarizeLeafCoverageByObjective', () => {
  const reqs = SY0701_REQUIREMENTS_MANIFEST.requirements

  it('verteilt alle 655 Leafs auf die 28 Objectives; ohne Einträge ist nichts nachgewiesen', () => {
    const report = buildRequirementCoverage({ sourceSnapshotId: 'snap', requirements: reqs, criticalErrorDefinitions: [], coverage: [], now: 1 })
    const summary = summarizeLeafCoverageByObjective({ requirements: reqs, report })
    expect(summary.size).toBe(28)
    let total = 0
    for (const entry of summary.values()) {
      total += entry.totalLeafs
      expect(entry.coveredLeafs).toBe(0)
    }
    expect(total).toBe(655)
  })

  it('zählt covered Leafs je Objective, nicht objektivübergreifend', () => {
    const plain = reqs.filter(r => !r.scenarioRequired && r.criticality !== 'critical')
    const covered = plain[0]
    const coverage: RequirementCoverage[] = [{
      requirementId: covered.requirementId,
      learningAssetIds: ['video:2'],
      assessmentItemIds: ['M1-001'],
      practicalItemIds: [],
      qaStatus: 'covered',
      reviewer: 'vlad',
    }]
    const report = buildRequirementCoverage({ sourceSnapshotId: 'snap', requirements: reqs, criticalErrorDefinitions: [], coverage, now: 1 })
    const summary = summarizeLeafCoverageByObjective({ requirements: reqs, report })
    expect(summary.get(covered.objectiveId)?.coveredLeafs).toBe(1)
    for (const [objectiveId, entry] of summary) {
      if (objectiveId !== covered.objectiveId) expect(entry.coveredLeafs).toBe(0)
    }
  })
})

describe('buildReviewUnits / buildReviewSelection', () => {
  it('erzeugt genau eine Review-Unit je Objective mit stabiler ID hinter dem Kurs', () => {
    const units = buildReviewUnits({
      objectives: [
        { objectiveId: '1.1', title: 'Security Controls' },
        { objectiveId: '2.4', title: 'Indicators' },
      ],
      definitionVersion: 'v-test',
    })
    expect(units.map(unit => unit.unitId)).toEqual(['unit:review:1.1', 'unit:review:2.4'])
    expect(units.every(unit => unit.type === 'review')).toBe(true)
    expect(units[0].order).toBeGreaterThan(121) // hinter allen Course-Units
    expect(formatReviewUnitId('5.6')).toBe('unit:review:5.6')
  })

  it('friert fällige Karten zuerst ein, hängt Fehler an und respektiert Reservierung/Limit', () => {
    const selection = buildReviewSelection({
      dueCardIds: ['due-b', 'due-a', 'reserved-1'],
      unresolvedErrorCardIds: ['err-z', 'err-a', 'due-a'],
      reservedCardIds: new Set(['reserved-1']),
      limit: 0,
    })
    // Eligibility-Reihenfolge der fälligen Karten bleibt erhalten; Fehler
    // deterministisch sortiert; Duplikate (due-a) und Reservierte fallen weg.
    expect(selection.cardIds).toEqual(['due-b', 'due-a', 'err-a', 'err-z'])
    expect(selection.reasonByCardId).toEqual({
      'due-b': 'due', 'due-a': 'due', 'err-a': 'unresolved-error', 'err-z': 'unresolved-error',
    })

    const limited = buildReviewSelection({
      dueCardIds: ['due-1', 'due-2', 'due-3'],
      unresolvedErrorCardIds: ['err-1'],
      reservedCardIds: new Set(),
      limit: 2,
    })
    expect(limited.cardIds).toEqual(['due-1', 'due-2'])
  })
})

describe('buildLabUnits', () => {
  it('erzeugt je Szenario eine Unit mit Objective aus dem Label; Unparsebares fällt sichtbar heraus', () => {
    const { units, skippedScenarioIds } = buildLabUnits({
      scenarios: [
        { id: 'fw-1', title: 'ACL-Regeln', objective: '4.5 Modify enterprise capabilities', minutes: 12 },
        { id: 'ir-2', title: 'Incident-Ablauf', objective: '4.8 Incident response' },
        { id: 'kaputt', title: 'Ohne Code', objective: 'Allgemein' },
      ],
      definitionVersion: 'v-test',
    })
    expect(units.map(unit => unit.unitId)).toEqual(['unit:lab:fw-1', 'unit:lab:ir-2'])
    expect(units[0]).toMatchObject({
      type: 'lab', objectiveIds: ['4.5'], labScenarioId: 'fw-1', estimatedMinutes: 12,
    })
    expect(units[1].estimatedMinutes).toBeUndefined()
    expect(skippedScenarioIds).toEqual(['kaputt'])
  })
})

describe('objectiveIdOfDeckId', () => {
  it('erkennt System-Objective-Decks und ignoriert alles andere', () => {
    expect(objectiveIdOfDeckId('sy0-701-objective-4-9')).toBe('4.9')
    expect(objectiveIdOfDeckId('01_grundlagen')).toBeNull()
    expect(objectiveIdOfDeckId(undefined)).toBeNull()
  })
})
