// @vitest-environment happy-dom
/**
 * AI_CONTEXT: Vitest coverage for HeroShopModal (purchase rules, funds, variants) and SkillTreeModal (allocation rules and points).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { HeroSnapshot } from '../../db/queries/heroState'
import { buildHeroState } from '../../utils/heroDungeon'
import { buildDeckDomainIndex } from '../../utils/securityDomain'
import { normalizeHeroLoadout } from '../../db/queries/heroLoadout'

const hoisted = vi.hoisted(() => ({
  purchase: vi.fn(async () => ({ ok: true })),
  setEquipped: vi.fn(async () => undefined),
  setVariant: vi.fn(async () => undefined),
  persistSkills: vi.fn(async () => undefined),
}))

vi.mock('../../db/queries/heroLoadout', async importOriginal => {
  const actual = await importOriginal<typeof import('../../db/queries/heroLoadout')>()
  return {
    ...actual,
    purchaseHeroItem: hoisted.purchase,
    setHeroEquippedTier: hoisted.setEquipped,
    setHeroItemVariant: hoisted.setVariant,
    persistHeroSkillNodes: hoisted.persistSkills,
  }
})
vi.mock('../../ui/overlays/Dialog', () => ({ Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))

import { HeroShopModal } from '../../components/hero/HeroShopModal'
import { SkillTreeModal } from '../../components/hero/SkillTreeModal'

const DAY = 86_400_000
const NOW = new Date('2026-10-12T10:00:00').getTime()
const decks = [{ id: 'newinfo-chapter-1', name: 'K1' }]

/** Ein ehrlicher Lerner mit `goldDays` Lerntagen (je 24 Gold): verdient `goldDays * 24` Gold. */
function snapshotWith(goldDays: number, skillNodeIds: string[] = [], level = 1, purchases: Array<{ slot: string; tier: number }> = []): HeroSnapshot {
  const cards = Array.from({ length: 10 }, (_, i) => ({ id: `c${i}`, deckId: 'newinfo-chapter-1', tags: [] as string[] }))
  const reviews = []
  for (let d = 0; d < goldDays; d += 1) {
    for (let c = 0; c < 6; c += 1) {
      // Jeden Tag sechs NEUE Karten (je 4 Gold): Einführung zahlt 4 Gold.
      reviews.push({ reviewKey: `d${d}-c${c}`, cardId: `n${d}-${c}`, rating: 3 as const, timeMs: 3000, timestamp: NOW - (goldDays - d) * DAY + c * 1000 })
    }
  }
  const stored = purchases.map((p, i) => ({ ...p, variant: 0, pricePaid: 0, purchasedAt: i + 1 }))
  const loadout = normalizeHeroLoadout({ purchases: stored, skillNodeIds } as never)
  const state = buildHeroState({
    reviews, cards, deckDomains: buildDeckDomainIndex(decks), purchases: loadout.purchases, equipped: loadout.equipped, level, nextDayStartsAt: 4, now: NOW,
  })
  return { state, loadout, deckDomains: buildDeckDomainIndex(decks) }
}

let root: Root | null = null
let container: HTMLDivElement | null = null

async function mount(node: React.ReactElement) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => { root?.render(node) })
}

beforeEach(() => {
  Object.values(hoisted).forEach(fn => fn.mockClear())
})
afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  container?.remove()
  root = null
  container = null
})

describe('HeroShopModal', () => {
  it('zeigt Kontostand und alle fünf Slots', async () => {
    await mount(<HeroShopModal isOpen onClose={() => {}} snapshot={snapshotWith(5)} classId="paladin" language="de" level={1} />)
    expect(container?.querySelector('[data-testid="hero-shop-balance"]')?.textContent).toContain('120')
    for (const slot of ['weapon', 'offhand', 'head', 'chest', 'relic']) {
      expect(container?.querySelector(`[data-testid="hero-slot-${slot}"]`)).not.toBeNull()
    }
  })

  it('sperrt den Kauf, solange das Gold nicht reicht, und nennt die Differenz', async () => {
    await mount(<HeroShopModal isOpen onClose={() => {}} snapshot={snapshotWith(2)} classId="paladin" language="de" level={1} />)
    const buy = container?.querySelector<HTMLButtonElement>('[data-testid="hero-buy-weapon"]')
    expect(buy?.disabled).toBe(true)
    expect(buy?.textContent).toContain('Noch 52 Gold')
  })

  it('kauft die nächste Stufe mit gewählter Variante, wenn das Gold reicht', async () => {
    await mount(<HeroShopModal isOpen onClose={() => {}} snapshot={snapshotWith(5)} classId="paladin" language="de" level={1} />)
    const buy = container?.querySelector<HTMLButtonElement>('[data-testid="hero-buy-weapon"]')
    expect(buy?.disabled).toBe(false)
    await act(async () => { buy?.click() })
    expect(hoisted.purchase).toHaveBeenCalledWith(expect.objectContaining({ slot: 'weapon', tier: 1, variant: 0, balance: 120 }))
  })

  it('bietet nach Stufe 1 die Stufe 2 an und zeigt Englisch bei en', async () => {
    const snap = snapshotWith(20, [], 1, [{ slot: 'weapon', tier: 1 }])
    await mount(<HeroShopModal isOpen onClose={() => {}} snapshot={snap} classId="mage" language="en" level={1} />)
    const slot = container?.querySelector('[data-testid="hero-slot-weapon"]')
    expect(slot?.textContent).toContain('Tier 2')
    expect(container?.textContent).toContain('Your gold')
  })

  it('zeigt "Alle Stufen gekauft", wenn ein Slot voll ist', async () => {
    const full = [1, 2, 3, 4, 5].map(tier => ({ slot: 'head', tier }))
    await mount(<HeroShopModal isOpen onClose={() => {}} snapshot={snapshotWith(0, [], 1, full)} classId="paladin" language="de" level={1} />)
    expect(container?.querySelector('[data-testid="hero-slot-head"]')?.textContent).toContain('Alle Stufen gekauft')
    expect(container?.querySelector('[data-testid="hero-buy-head"]')).toBeNull()
  })

  it('rendert nichts, wenn geschlossen', async () => {
    await mount(<HeroShopModal isOpen={false} onClose={() => {}} snapshot={snapshotWith(1)} classId="paladin" language="de" level={1} />)
    expect(container?.innerHTML).toBe('')
  })
})

describe('SkillTreeModal', () => {
  it('zeigt Kern und Klassenast mit 6 + 5 Knoten und 0 Punkten am Anfang', async () => {
    await mount(<SkillTreeModal isOpen onClose={() => {}} snapshot={snapshotWith(1)} classId="paladin" language="de" level={1} />)
    expect(container?.querySelectorAll('[data-testid^="skill-node-"]')).toHaveLength(11)
    const allocate = container?.querySelector<HTMLButtonElement>('[data-testid="skill-node-core-1"] button')
    expect(allocate?.disabled).toBe(true)
  })

  it('belegt mit freiem Punkt (Level 7) den ersten Kernknoten und speichert die Reihenfolge', async () => {
    await mount(<SkillTreeModal isOpen onClose={() => {}} snapshot={snapshotWith(1, [], 7)} classId="paladin" language="de" level={7} />)
    const button = container?.querySelector<HTMLButtonElement>('[data-testid="skill-node-core-1"] button')
    expect(button?.disabled).toBe(false)
    await act(async () => { button?.click() })
    expect(hoisted.persistSkills).toHaveBeenCalledWith(['core-1'])
    // Nachfolger bleibt gesperrt, solange kein Punkt frei oder der Vorgänger fehlt
    expect(container?.querySelector<HTMLButtonElement>('[data-testid="skill-node-core-4"] button')?.disabled).toBe(true)
  })

  it('nimmt einen Knoten samt Abhängigen zurück', async () => {
    const snap = snapshotWith(1, ['core-1', 'core-2', 'core-3'], 30)
    await mount(<SkillTreeModal isOpen onClose={() => {}} snapshot={snap} classId="paladin" language="de" level={30} />)
    expect(container?.querySelector('[data-testid="skill-node-core-2"]')?.getAttribute('data-state')).toBe('active')
    const remove = container?.querySelector<HTMLButtonElement>('[data-testid="skill-node-core-1"] button')
    await act(async () => { remove?.click() })
    expect(hoisted.persistSkills).toHaveBeenCalledWith([])
  })

  it('lässt Knoten ruhen, wenn die Punkte nicht reichen', async () => {
    const snap = snapshotWith(1, ['core-1', 'core-2', 'core-3'], 7)
    await mount(<SkillTreeModal isOpen onClose={() => {}} snapshot={snap} classId="paladin" language="de" level={7} />)
    const states = ['core-1', 'core-2', 'core-3'].map(id => container?.querySelector(`[data-testid="skill-node-${id}"]`)?.getAttribute('data-state'))
    expect(states).toEqual(['active', 'dormant', 'dormant'])
  })
})
