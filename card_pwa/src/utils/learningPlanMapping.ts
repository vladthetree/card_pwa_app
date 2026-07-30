/**
 * AI_CONTEXT:
 * Role: Pure read-model joining the learning plan to its objective decks and
 *       mapped cards. The generated content map owns the logical assignment;
 *       the existing Card.id scheduler state owns progress.
 * Important: Never persist deck/unit progress from this module. A card moved
 *            to another physical deck must keep its plan progress because the
 *            join key is always Card.id.
 */
import type { Card } from '../types'
import {
  SY0701_LEARNING_PLAN_ACRONYM_REFERENCES,
  type Sy0701LearningPlanAcronymReference,
} from '../data/sy0701LearningPlanAcronymMap'
import type { LearningUnitDefinition, VideoContentMapEntry } from './learningUnits'
import {
  SY0_701_OBJECTIVES,
  getSecurityObjectiveDeckId,
  getSecurityObjectiveDeckName,
} from './securityDeckHierarchy'

export interface LearningPlanUnitCardMapping {
  unitId: string
  videoIndex: number
  objectiveId: string
  domainId: string
  rootDeckName: string
  primarySubDeckId: string
  primarySubDeckName: string
  sourceSubDeckIds: readonly string[]
  /** @deprecated Alias of primarySubDeckId for existing consumers. */
  deckId: string
  /** Current physical locations are informational only, never progress keys. */
  physicalDeckIds: readonly string[]
  cardIds: readonly string[]
  installedCardIds: readonly string[]
  reviewedCardIds: readonly string[]
  missingCardIds: readonly string[]
}

export interface LearningPlanDeckCardMapping {
  deckId: string
  subDeckName: string
  domainId: string
  rootDeckName: string
  sourceSubDeckIds: readonly string[]
  objectiveId: string
  unitIds: readonly string[]
  cardIds: readonly string[]
  installedCardIds: readonly string[]
  reviewedCardIds: readonly string[]
  missingCardIds: readonly string[]
  physicalDeckIds: readonly string[]
}

export interface LearningPlanAcronymCardMapping {
  cardId: string
  label: string
  objectiveIds: readonly string[]
  rationale: string
  installed: boolean
  reviewed: boolean
  /** Rein informativ; fachliche Zuordnung und Fortschritt hängen an cardId. */
  physicalDeckId: string | null
}

export interface LearningPlanCanonicalSuccessRate {
  /** Ganzzahliger, gerundeter Anzeigewert. */
  rate: number
  /** Exakter, ungerundeter Quotient für die 90-%-Schwelle. */
  ratio: number
  successful: number
  total: number
}

export type LearningPlanSubDeckStatus = 'open' | 'inProgress' | 'fulfilled'

export interface LearningPlanSubDeckReadModel extends LearningPlanDeckCardMapping {
  successRate: LearningPlanCanonicalSuccessRate
  status: LearningPlanSubDeckStatus
}

export interface LearningPlanMappingSummary {
  rootDeckCount: number
  deckCount: number
  unitCount: number
  cardCount: number
  installedCardCount: number
  reviewedCardCount: number
  missingCardCount: number
}

export interface LearningPlanContentMapping {
  byUnitId: ReadonlyMap<string, LearningPlanUnitCardMapping>
  byDeckId: ReadonlyMap<string, LearningPlanDeckCardMapping>
  byObjectiveId: ReadonlyMap<string, LearningPlanDeckCardMapping>
  byAcronymCardId: ReadonlyMap<string, LearningPlanAcronymCardMapping>
  acronymCardsByObjectiveId: ReadonlyMap<string, readonly LearningPlanAcronymCardMapping[]>
  summary: LearningPlanMappingSummary
  /** Content-QA diagnostics; expected to remain empty for a released manifest. */
  duplicateCardIds: readonly string[]
  objectiveMismatchUnitIds: readonly string[]
  missingAcronymCardIds: readonly string[]
  invalidAcronymObjectiveCardIds: readonly string[]
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)]
}

export const LEARNING_PLAN_SUBDECK_SUCCESS_THRESHOLD = 0.9

/**
 * Reiner Lernplanstatus. Der echte Deck-/Kartenstatus bleibt unberührt.
 * Fehlende Karten sperren „Erfüllt“, damit eine unvollständige Installation
 * nicht aufgrund der verbleibenden Reviews fälschlich grün wird.
 */
export function computeLearningPlanSubDeckStatus(input: {
  ratio: number
  totalAnswers: number
  missingCardCount?: number
}): LearningPlanSubDeckStatus {
  if (input.totalAnswers <= 0) return 'open'
  if (
    (input.missingCardCount ?? 0) === 0
    && input.ratio >= LEARNING_PLAN_SUBDECK_SUCCESS_THRESHOLD
  ) {
    return 'fulfilled'
  }
  return 'inProgress'
}

/** Entfernt doppelte Card-IDs in einer gestarteten Lernplan-Session stabil. */
export function buildUniqueLearningPlanSessionCardIds(
  ...cardIdGroups: ReadonlyArray<readonly string[]>
): string[] {
  return unique(cardIdGroups.flat())
}

/** IDs needed from IndexedDB. This list is stable and independent of deck
 * placement, so moved cards do not silently disappear from the plan. */
export function collectLearningPlanCardIds(input: {
  courseDefinitions: readonly LearningUnitDefinition[]
  contentMapByVideoIndex: ReadonlyMap<number, VideoContentMapEntry>
  acronymReferences?: readonly Sy0701LearningPlanAcronymReference[]
}): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  const definitions = [...input.courseDefinitions].sort((a, b) => a.order - b.order)
  for (const definition of definitions) {
    if (definition.type !== 'course' || definition.videoIndex === undefined) continue
    const content = input.contentMapByVideoIndex.get(definition.videoIndex)
    if (!content) continue
    for (const cardId of content.courseCardIds) {
      if (seen.has(cardId)) continue
      seen.add(cardId)
      ids.push(cardId)
    }
  }
  for (const reference of input.acronymReferences ?? SY0701_LEARNING_PLAN_ACRONYM_REFERENCES) {
    if (seen.has(reference.cardId)) continue
    seen.add(reference.cardId)
    ids.push(reference.cardId)
  }
  return ids
}

function cardWasReviewed(card: Pick<Card, 'reps' | 'lastReviewedAt'>): boolean {
  return card.reps > 0 || (card.lastReviewedAt !== undefined && Number.isFinite(card.lastReviewedAt))
}

interface MutableDeckMapping {
  deckId: string
  subDeckName: string
  objectiveId: string
  domainId: string
  rootDeckName: string
  sourceSubDeckIds: string[]
  unitIds: string[]
  cardIds: string[]
  installedCardIds: string[]
  reviewedCardIds: string[]
  missingCardIds: string[]
  physicalDeckIds: string[]
}

/**
 * Builds the plan projection without writing progress. Logical membership is
 * taken from the versioned VideoContentMapEntry.cardIds; reviewed state is
 * looked up exclusively through the matching Card.id.
 */
export function buildLearningPlanContentMapping(input: {
  courseDefinitions: readonly LearningUnitDefinition[]
  contentMapByVideoIndex: ReadonlyMap<number, VideoContentMapEntry>
  cards: readonly Card[]
  acronymReferences?: readonly Sy0701LearningPlanAcronymReference[]
}): LearningPlanContentMapping {
  const cardById = new Map(input.cards.map(card => [card.id, card]))
  const cardOwnerUnitId = new Map<string, string>()
  const duplicateCardIds: string[] = []
  const objectiveMismatchUnitIds: string[] = []
  const byUnitId = new Map<string, LearningPlanUnitCardMapping>()
  const mutableByObjective = new Map<string, MutableDeckMapping>()
  const validObjectiveIds = new Set(SY0_701_OBJECTIVES.map(objective => objective.code))

  const definitions = [...input.courseDefinitions].sort((a, b) => a.order - b.order)
  for (const definition of definitions) {
    if (definition.type !== 'course' || definition.videoIndex === undefined) continue
    const content = input.contentMapByVideoIndex.get(definition.videoIndex)
    if (!content) continue

    const objectiveId = content.objectiveId
    if (!definition.objectiveIds.includes(objectiveId)) {
      objectiveMismatchUnitIds.push(definition.unitId)
    }
    const expectedSubDeckId = getSecurityObjectiveDeckId(objectiveId)
    const objective = SY0_701_OBJECTIVES.find(entry => entry.code === objectiveId)
    const domainId = objectiveId.split('.')[0]
    const rootDeckName = objective?.rootDeckName ?? ''
    const primarySubDeckId = content.primarySubDeckId
    const primarySubDeckName = getSecurityObjectiveDeckName(objectiveId)
    const sourceSubDeckIds = unique(content.sourceSubDeckIds)
    if (primarySubDeckId !== expectedSubDeckId) {
      objectiveMismatchUnitIds.push(definition.unitId)
    }
    const cardIds: string[] = []
    for (const cardId of unique(content.courseCardIds)) {
      const owner = cardOwnerUnitId.get(cardId)
      if (owner && owner !== definition.unitId) {
        duplicateCardIds.push(cardId)
        continue
      }
      cardOwnerUnitId.set(cardId, definition.unitId)
      cardIds.push(cardId)
    }

    const installedCardIds = cardIds.filter(cardId => cardById.has(cardId))
    const reviewedCardIds = installedCardIds.filter(cardId => cardWasReviewed(cardById.get(cardId)!))
    const missingCardIds = cardIds.filter(cardId => !cardById.has(cardId))
    const physicalDeckIds = unique(installedCardIds
      .map(cardId => cardById.get(cardId)?.deckId)
      .filter((id): id is string => typeof id === 'string'))

    const unitMapping: LearningPlanUnitCardMapping = {
      unitId: definition.unitId,
      videoIndex: definition.videoIndex,
      objectiveId,
      domainId,
      rootDeckName,
      primarySubDeckId,
      primarySubDeckName,
      sourceSubDeckIds,
      deckId: primarySubDeckId,
      physicalDeckIds,
      cardIds,
      installedCardIds,
      reviewedCardIds,
      missingCardIds,
    }
    byUnitId.set(definition.unitId, unitMapping)

    const deck = mutableByObjective.get(objectiveId) ?? {
      deckId: primarySubDeckId,
      subDeckName: primarySubDeckName,
      objectiveId,
      domainId,
      rootDeckName,
      sourceSubDeckIds: [],
      unitIds: [],
      cardIds: [],
      installedCardIds: [],
      reviewedCardIds: [],
      missingCardIds: [],
      physicalDeckIds: [],
    }
    deck.unitIds.push(definition.unitId)
    deck.cardIds.push(...cardIds)
    deck.installedCardIds.push(...installedCardIds)
    deck.reviewedCardIds.push(...reviewedCardIds)
    deck.missingCardIds.push(...missingCardIds)
    deck.physicalDeckIds.push(...physicalDeckIds)
    deck.sourceSubDeckIds.push(...sourceSubDeckIds)
    mutableByObjective.set(objectiveId, deck)
  }

  const byDeckId = new Map<string, LearningPlanDeckCardMapping>()
  const byObjectiveId = new Map<string, LearningPlanDeckCardMapping>()
  for (const deck of mutableByObjective.values()) {
    const mapping: LearningPlanDeckCardMapping = {
      ...deck,
      unitIds: unique(deck.unitIds),
      cardIds: unique(deck.cardIds),
      installedCardIds: unique(deck.installedCardIds),
      reviewedCardIds: unique(deck.reviewedCardIds),
      missingCardIds: unique(deck.missingCardIds),
      physicalDeckIds: unique(deck.physicalDeckIds),
      sourceSubDeckIds: unique(deck.sourceSubDeckIds),
    }
    byDeckId.set(mapping.deckId, mapping)
    byObjectiveId.set(mapping.objectiveId, mapping)
  }

  const cardIds = unique([...byUnitId.values()].flatMap(mapping => mapping.cardIds))
  const installedCardIds = cardIds.filter(cardId => cardById.has(cardId))
  const reviewedCardIds = installedCardIds.filter(cardId => cardWasReviewed(cardById.get(cardId)!))
  const byAcronymCardId = new Map<string, LearningPlanAcronymCardMapping>()
  const mutableAcronymCardsByObjectiveId = new Map<string, LearningPlanAcronymCardMapping[]>()
  const invalidAcronymObjectiveCardIds: string[] = []
  for (const reference of input.acronymReferences ?? SY0701_LEARNING_PLAN_ACRONYM_REFERENCES) {
    const card = cardById.get(reference.cardId)
    const objectiveIds = unique(reference.objectiveIds)
    if (objectiveIds.some(objectiveId => !validObjectiveIds.has(objectiveId))) {
      invalidAcronymObjectiveCardIds.push(reference.cardId)
    }
    const mapping: LearningPlanAcronymCardMapping = {
      cardId: reference.cardId,
      label: reference.label,
      objectiveIds,
      rationale: reference.rationale,
      installed: card !== undefined,
      reviewed: card !== undefined && cardWasReviewed(card),
      physicalDeckId: card?.deckId ?? null,
    }
    byAcronymCardId.set(mapping.cardId, mapping)
    for (const objectiveId of objectiveIds) {
      if (!validObjectiveIds.has(objectiveId)) continue
      const list = mutableAcronymCardsByObjectiveId.get(objectiveId) ?? []
      list.push(mapping)
      mutableAcronymCardsByObjectiveId.set(objectiveId, list)
    }
  }
  const acronymCardsByObjectiveId = new Map<string, readonly LearningPlanAcronymCardMapping[]>(
    [...mutableAcronymCardsByObjectiveId.entries()]
      .map(([objectiveId, mappings]) => [
        objectiveId,
        [...mappings].sort((a, b) => a.label.localeCompare(b.label) || a.cardId.localeCompare(b.cardId)),
      ]),
  )

  return {
    byUnitId,
    byDeckId,
    byObjectiveId,
    byAcronymCardId,
    acronymCardsByObjectiveId,
    summary: {
      rootDeckCount: new Set([...byUnitId.values()].map(mapping => mapping.rootDeckName).filter(Boolean)).size,
      deckCount: byDeckId.size,
      unitCount: byUnitId.size,
      cardCount: cardIds.length,
      installedCardCount: installedCardIds.length,
      reviewedCardCount: reviewedCardIds.length,
      missingCardCount: cardIds.length - installedCardIds.length,
    },
    duplicateCardIds: unique(duplicateCardIds),
    objectiveMismatchUnitIds: unique(objectiveMismatchUnitIds),
    missingAcronymCardIds: [...byAcronymCardId.values()]
      .filter(mapping => !mapping.installed)
      .map(mapping => mapping.cardId),
    invalidAcronymObjectiveCardIds: unique(invalidAcronymObjectiveCardIds),
  }
}

/** Baut die reine Lernplan-Projektion aus Card-ID-Mapping und kanonischer Rate. */
export function buildLearningPlanSubDeckReadModels(input: {
  contentMapping: LearningPlanContentMapping
  successRateByDeckId: Readonly<Record<string, LearningPlanCanonicalSuccessRate | undefined>>
}): ReadonlyMap<string, LearningPlanSubDeckReadModel> {
  const result = new Map<string, LearningPlanSubDeckReadModel>()
  for (const [objectiveId, deck] of input.contentMapping.byObjectiveId) {
    const successRate = input.successRateByDeckId[deck.deckId] ?? {
      rate: 0,
      ratio: 0,
      successful: 0,
      total: 0,
    }
    result.set(objectiveId, {
      ...deck,
      successRate,
      status: computeLearningPlanSubDeckStatus({
        ratio: successRate.ratio,
        totalAnswers: successRate.total,
        missingCardCount: deck.missingCardIds.length,
      }),
    })
  }
  return result
}

export const EMPTY_LEARNING_PLAN_CONTENT_MAPPING: LearningPlanContentMapping = {
  byUnitId: new Map(),
  byDeckId: new Map(),
  byObjectiveId: new Map(),
  byAcronymCardId: new Map(),
  acronymCardsByObjectiveId: new Map(),
  summary: {
    rootDeckCount: 0,
    deckCount: 0,
    unitCount: 0,
    cardCount: 0,
    installedCardCount: 0,
    reviewedCardCount: 0,
    missingCardCount: 0,
  },
  duplicateCardIds: [],
  objectiveMismatchUnitIds: [],
  missingAcronymCardIds: [],
  invalidAcronymObjectiveCardIds: [],
}
