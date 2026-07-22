import { describe, expect, it } from 'vitest'
import { SY0701_CONTENT_MAP, SY0701_CONTENT_MAP_BY_VIDEO_INDEX } from '../../data/sy0701ContentMap'
import { makeCard } from '../fixtures/cardFixtures'
import type { LearningUnitDefinition, VideoContentMapEntry } from '../../utils/learningUnits'
import {
  buildLearningPlanContentMapping,
  collectLearningPlanCardIds,
} from '../../utils/learningPlanMapping'

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
    })).toHaveLength(412)
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
