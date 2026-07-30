import { describe, expect, it } from 'vitest'
import { SY0701_CONTENT_MAP, SY0701_CONTENT_MAP_BY_VIDEO_INDEX } from '../../data/sy0701ContentMap'
import {
  SY0701_LEARNING_PLAN_ACRONYM_REFERENCES,
} from '../../data/sy0701LearningPlanAcronymMap'
import { makeCard } from '../fixtures/cardFixtures'
import type { LearningUnitDefinition, VideoContentMapEntry } from '../../utils/learningUnits'
import {
  buildLearningPlanSubDeckReadModels,
  buildLearningPlanContentMapping,
  buildUniqueLearningPlanSessionCardIds,
  collectLearningPlanCardIds,
  computeLearningPlanSubDeckStatus,
} from '../../utils/learningPlanMapping'
import {
  SY0_701_OBJECTIVES,
  SY0_701_OBJECTIVE_BY_SUBDECK_ID,
  getSecurityObjectiveDeckId,
} from '../../utils/securityDeckHierarchy'

function courseDefinition(videoIndex: number, objectiveId: string): LearningUnitDefinition {
  return {
    unitId: `unit:course:${String(videoIndex).padStart(3, '0')}`,
    type: 'course',
    title: `Video ${videoIndex}`,
    objectiveIds: [objectiveId],
    requirementIds: [],
    order: videoIndex,
    videoIndex,
    definitionVersion: 'test-v1',
  }
}

describe('learning plan card/deck mapping', () => {
  it('ordnet jedes der 28 echten SY0-701-Subdecks explizit dem richtigen Objective zu', () => {
    expect(Object.keys(SY0_701_OBJECTIVE_BY_SUBDECK_ID)).toHaveLength(28)
    for (const objective of SY0_701_OBJECTIVES) {
      expect(SY0_701_OBJECTIVE_BY_SUBDECK_ID[getSecurityObjectiveDeckId(objective.code)])
        .toBe(objective.code)
    }
    expect(SY0_701_OBJECTIVE_BY_SUBDECK_ID['unbekanntes-deck']).toBeUndefined()
  })

  it('bildet den echten Lernpfad vollständig und ohne doppelte Card-IDs ab', () => {
    const definitions = SY0701_CONTENT_MAP.map(entry => courseDefinition(entry.videoIndex, entry.objectiveId))
    const mapping = buildLearningPlanContentMapping({
      courseDefinitions: definitions,
      contentMapByVideoIndex: SY0701_CONTENT_MAP_BY_VIDEO_INDEX,
      cards: [],
    })

    expect(mapping.summary).toEqual({
      rootDeckCount: 5,
      deckCount: 28,
      unitCount: 120,
      cardCount: 412,
      installedCardCount: 0,
      reviewedCardCount: 0,
      missingCardCount: 412,
    })
    expect(mapping.duplicateCardIds).toEqual([])
    expect(mapping.objectiveMismatchUnitIds).toEqual([])
    expect(collectLearningPlanCardIds({
      courseDefinitions: definitions,
      contentMapByVideoIndex: SY0701_CONTENT_MAP_BY_VIDEO_INDEX,
    })).toHaveLength(455)
  })

  it('verbucht Fortschritt ausschließlich über Card.id, unabhängig vom physischen Deck', () => {
    const entries: VideoContentMapEntry[] = [
      {
        videoIndex: 2,
        objectiveId: '1.1',
        primarySubDeckId: 'sy0-701-objective-1-1',
        sourceSubDeckIds: ['sy0-701-objective-1-1'],
        requirementIds: [],
        courseCardIds: ['card-a', 'card-b'],
        recallQuestionIds: [],
        recallCardIds: [],
      },
      {
        videoIndex: 3,
        objectiveId: '1.1',
        primarySubDeckId: 'sy0-701-objective-1-1',
        sourceSubDeckIds: ['sy0-701-objective-1-1'],
        requirementIds: [],
        courseCardIds: ['card-c'],
        recallQuestionIds: [],
        recallCardIds: [],
      },
    ]
    const definitions = entries.map(entry => courseDefinition(entry.videoIndex, entry.objectiveId))
    const mapping = buildLearningPlanContentMapping({
      courseDefinitions: definitions,
      contentMapByVideoIndex: new Map(entries.map(entry => [entry.videoIndex, entry])),
      cards: [
        makeCard({ id: 'card-a', type: 'review', deckId: 'bewusst-verschobenes-deck', reps: 3 }),
        makeCard({ id: 'card-b', type: 'new', deckId: 'sy0-701-objective-1-1', reps: 0 }),
        // card-c fehlt lokal und darf deshalb keinen Fortschritt erhalten.
        makeCard({ id: 'nicht-gemappt', type: 'review', deckId: 'sy0-701-objective-1-1', reps: 8 }),
      ],
    })

    const unit = mapping.byUnitId.get('unit:course:002')!
    expect(unit.primarySubDeckId).toBe('sy0-701-objective-1-1')
    expect(unit.primarySubDeckName).toBe('1.1 Security Controls')
    expect(unit.rootDeckName).toBe('01_General_Security_Concepts')
    expect(unit.cardIds).toEqual(['card-a', 'card-b'])
    expect(unit.reviewedCardIds).toEqual(['card-a'])
    expect(unit.physicalDeckIds).toEqual(['bewusst-verschobenes-deck', 'sy0-701-objective-1-1'])

    const deck = mapping.byObjectiveId.get('1.1')!
    expect(deck.deckId).toBe('sy0-701-objective-1-1')
    expect(deck.cardIds).toEqual(['card-a', 'card-b', 'card-c'])
    expect(deck.reviewedCardIds).toEqual(['card-a'])
    expect(deck.missingCardIds).toEqual(['card-c'])
    expect(mapping.summary.reviewedCardCount).toBe(1)
  })

  it('ordnet jede Acronym-Karte individuell per Card.id zu', () => {
    expect(SY0701_LEARNING_PLAN_ACRONYM_REFERENCES).toHaveLength(43)
    expect(new Set(SY0701_LEARNING_PLAN_ACRONYM_REFERENCES.map(entry => entry.cardId)).size).toBe(43)
    expect(SY0701_LEARNING_PLAN_ACRONYM_REFERENCES.every(entry =>
      entry.objectiveIds.length > 0
      && entry.objectiveIds.every(objectiveId =>
        SY0_701_OBJECTIVES.some(objective => objective.code === objectiveId),
      ),
    )).toBe(true)

    const multiObjective = SY0701_LEARNING_PLAN_ACRONYM_REFERENCES
      .find(entry => entry.cardId === '1779724748974')!
    const mapping = buildLearningPlanContentMapping({
      courseDefinitions: [],
      contentMapByVideoIndex: new Map(),
      acronymReferences: [multiObjective],
      cards: [
        makeCard({
          id: multiObjective.cardId,
          type: 'review',
          deckId: 'sy0-701-acronyms-bonus',
          reps: 2,
        }),
      ],
    })

    expect(mapping.byAcronymCardId.get(multiObjective.cardId)).toMatchObject({
      installed: true,
      reviewed: true,
      physicalDeckId: 'sy0-701-acronyms-bonus',
    })
    expect(mapping.acronymCardsByObjectiveId.get('4.4')?.[0].cardId).toBe(multiObjective.cardId)
    expect(mapping.acronymCardsByObjectiveId.get('4.5')?.[0].cardId).toBe(multiObjective.cardId)
    expect(mapping.acronymCardsByObjectiveId.get('4.7')?.[0].cardId).toBe(multiObjective.cardId)
    expect(mapping.byAcronymCardId.size).toBe(1)
  })

  it('dedupliziert dieselbe Karten-ID innerhalb einer gestarteten Lernsession', () => {
    expect(buildUniqueLearningPlanSessionCardIds(
      ['subdeck-a', 'shared'],
      ['shared', 'acronym-b'],
      ['subdeck-a'],
    )).toEqual(['subdeck-a', 'shared', 'acronym-b'])
  })

  it('zählt eine versehentlich doppelt gemappte Card-ID nur beim ersten Kursvideo', () => {
    const entries: VideoContentMapEntry[] = [
      { videoIndex: 2, objectiveId: '1.1', primarySubDeckId: 'sy0-701-objective-1-1', sourceSubDeckIds: ['sy0-701-objective-1-1'], requirementIds: [], courseCardIds: ['shared'], recallQuestionIds: [], recallCardIds: [] },
      { videoIndex: 3, objectiveId: '1.2', primarySubDeckId: 'sy0-701-objective-1-2', sourceSubDeckIds: ['sy0-701-objective-1-2'], requirementIds: [], courseCardIds: ['shared'], recallQuestionIds: [], recallCardIds: [] },
    ]
    const definitions = entries.map(entry => courseDefinition(entry.videoIndex, entry.objectiveId))
    const mapping = buildLearningPlanContentMapping({
      courseDefinitions: definitions,
      contentMapByVideoIndex: new Map(entries.map(entry => [entry.videoIndex, entry])),
      cards: [makeCard({ id: 'shared', type: 'review', reps: 1 })],
    })

    expect(mapping.summary.cardCount).toBe(1)
    expect(mapping.byUnitId.get('unit:course:002')?.cardIds).toEqual(['shared'])
    expect(mapping.byUnitId.get('unit:course:003')?.cardIds).toEqual([])
    expect(mapping.duplicateCardIds).toEqual(['shared'])
  })
})

describe('learning plan subdeck completion projection', () => {
  it.each([
    { ratio: 0.8999, totalAnswers: 10_000, expected: 'inProgress' },
    { ratio: 0.9, totalAnswers: 10, expected: 'fulfilled' },
    { ratio: 0.975, totalAnswers: 40, expected: 'fulfilled' },
    { ratio: 0, totalAnswers: 0, expected: 'open' },
  ] as const)('$ratio bei $totalAnswers Antworten → $expected', input => {
    expect(computeLearningPlanSubDeckStatus(input)).toBe(input.expected)
  })

  it('wertet fehlende Karten auch bei hoher Rate nicht fälschlich als erfüllt', () => {
    expect(computeLearningPlanSubDeckStatus({
      ratio: 1,
      totalAnswers: 5,
      missingCardCount: 1,
    })).toBe('inProgress')
  })

  it('verwendet die ungerundete Rate im Read-Model', () => {
    const entry: VideoContentMapEntry = {
      videoIndex: 2,
      objectiveId: '1.1',
      primarySubDeckId: 'sy0-701-objective-1-1',
      sourceSubDeckIds: ['sy0-701-objective-1-1'],
      requirementIds: [],
      courseCardIds: ['c1'],
      recallQuestionIds: [],
      recallCardIds: [],
    }
    const contentMapping = buildLearningPlanContentMapping({
      courseDefinitions: [courseDefinition(2, '1.1')],
      contentMapByVideoIndex: new Map([[2, entry]]),
      cards: [makeCard({ id: 'c1', type: 'review', reps: 1 })],
      acronymReferences: [],
    })
    const decks = buildLearningPlanSubDeckReadModels({
      contentMapping,
      successRateByDeckId: {
        'sy0-701-objective-1-1': {
          rate: 90,
          ratio: 0.8999,
          successful: 8999,
          total: 10_000,
        },
      },
    })

    expect(decks.get('1.1')?.successRate.rate).toBe(90)
    expect(decks.get('1.1')?.status).toBe('inProgress')
  })
})
