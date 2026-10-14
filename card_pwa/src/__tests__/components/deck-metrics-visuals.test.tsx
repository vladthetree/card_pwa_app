// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { DeckMetricsModal } from '../../components/DeckMetricsModal'
import type { DeckMetricsSnapshot } from '../../types'

const snapshot: DeckMetricsSnapshot = {
  deckId: 'deck-1',
  period: 'all',
  cardCount: 20,
  reviewedCardCount: 10,
  totalReviews: 20,
  successRate: 75,
  ratingCounts: { 1: 2, 2: 3, 3: 10, 4: 5 },
  lastRatingAt: { 1: 1, 2: 2, 3: 3, 4: 4 },
  trendDelta: 4,
}

vi.mock('../../db/queries', () => ({
  getDeckMetricsSnapshot: vi.fn(async () => snapshot),
}))

vi.mock('../../ui/overlays/Dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

let root: Root | null = null
let container: HTMLDivElement | null = null

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  container?.remove()
  root = null
  container = null
})

describe('Deck-Metriken Visualisierung', () => {
  it('zeigt die Rating-Verteilung proportional und zusätzlich als zugängliche Zahlen', async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root?.render(<DeckMetricsModal
        deck={{ id: 'deck-1', name: 'Security', total: 20, new: 0, learning: 0, due: 0 }}
        language="de"
        onClose={() => undefined}
      />)
      await Promise.resolve()
    })

    const bar = container.querySelector('[data-testid="rating-distribution-bar"]')
    expect(bar?.getAttribute('aria-label')).toContain('Nochmal: 2')
    expect(bar?.getAttribute('aria-label')).toContain('Gut: 10')
    expect(container.querySelector<HTMLElement>('[data-rating="1"]')?.style.width).toBe('10%')
    expect(container.querySelector<HTMLElement>('[data-rating="3"]')?.style.width).toBe('50%')
    expect(container.textContent).toContain('50%')
  })
})
