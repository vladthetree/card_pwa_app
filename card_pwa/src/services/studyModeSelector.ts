/**
 * AI_CONTEXT: Application service for study Mode Selector; owns business logic outside React components for learning, sync, profile, update, or session flows.
 */
import { isDragMatchCard } from '../utils/cardVariant'
import { fnv1aUnit } from '../utils/hash'
import type { Card } from '../types'

export const DRAG_MATCH_STIMULUS_RATIO = 0.2
const MIN_ELIGIBLE_FOR_DRAG_MATCH = 4

export function buildDragMatchModePlan(
  cards: Array<Pick<Card, 'id' | 'front' | 'back'>>,
  seed: string | number,
  ratio = DRAG_MATCH_STIMULUS_RATIO,
): Set<string> {
  const eligible = cards
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => isDragMatchCard(card.front, card.back))

  if (eligible.length < MIN_ELIGIBLE_FOR_DRAG_MATCH) {
    return new Set()
  }

  const normalizedRatio = Number.isFinite(ratio)
    ? Math.max(0, Math.min(0.4, ratio))
    : DRAG_MATCH_STIMULUS_RATIO
  const targetCount = Math.min(
    eligible.length,
    Math.max(1, Math.floor(eligible.length * normalizedRatio)),
  )

  const ranked = eligible
    .map(item => ({
      ...item,
      score: fnv1aUnit(`${seed}:${item.index}:${item.card.id}`),
    }))
    .sort((a, b) => a.score - b.score)

  const selectedIds = new Set<string>()
  const selectedIndexes = new Set<number>()

  for (const item of ranked) {
    if (selectedIds.size >= targetCount) break
    if (selectedIndexes.has(item.index - 1) || selectedIndexes.has(item.index + 1)) continue

    selectedIds.add(item.card.id)
    selectedIndexes.add(item.index)
  }

  for (const item of ranked) {
    if (selectedIds.size >= targetCount) break
    if (selectedIds.has(item.card.id)) continue

    selectedIds.add(item.card.id)
  }

  return selectedIds
}
