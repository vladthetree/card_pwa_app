/**
 * AI_CONTEXT: Vitest coverage for study mode selector; protects services behavior from regressions in the learning PWA.
 */
import { describe, expect, it } from 'vitest'
import { buildDragMatchModePlan } from '../../utils/studyModeSelector'
import type { Card } from '../../types'

function createMcCard(id: string): Pick<Card, 'id' | 'front' | 'back'> {
  return {
    id,
    front: [
      `Welche Antwort passt zu ${id}?`,
      'A: Cloud Access Security Broker',
      'B: Cloud Application Security Baseline',
      'C: Cloud Authentication Service Bridge',
      'D: Cyber Asset Security Broker',
    ].join('\n'),
    back: '>> CORRECT: A | Cloud Access Security Broker',
  }
}

describe('study mode selector', () => {
  it('uses Drag-Match as a sparse stimulus mode, not as the default for all ABCD cards', () => {
    const cards = Array.from({ length: 20 }, (_, index) => createMcCard(`card-${index + 1}`))

    const plan = buildDragMatchModePlan(cards, 'session-seed')

    expect(plan.size).toBe(4)
    expect(plan.size).toBeLessThan(cards.length / 2)
  })

  it('keeps adjacent cards from both becoming Drag-Match when possible', () => {
    const cards = Array.from({ length: 20 }, (_, index) => createMcCard(`card-${index + 1}`))
    const plan = buildDragMatchModePlan(cards, 'session-seed')
    const selectedIndexes = cards
      .map((card, index) => plan.has(card.id) ? index : -1)
      .filter(index => index >= 0)

    for (let i = 1; i < selectedIndexes.length; i += 1) {
      expect(selectedIndexes[i] - selectedIndexes[i - 1]).toBeGreaterThan(1)
    }
  })

  it('is deterministic for a given seed and card order', () => {
    const cards = Array.from({ length: 12 }, (_, index) => createMcCard(`card-${index + 1}`))

    expect([...buildDragMatchModePlan(cards, 'same-seed')]).toEqual([...buildDragMatchModePlan(cards, 'same-seed')])
  })

  it('does not select Drag-Match when a tiny run would make it dominate', () => {
    const cards = Array.from({ length: 3 }, (_, index) => createMcCard(`card-${index + 1}`))

    expect(buildDragMatchModePlan(cards, 'small-run').size).toBe(0)
  })
})
