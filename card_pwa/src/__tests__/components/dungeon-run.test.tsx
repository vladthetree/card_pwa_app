// @vitest-environment happy-dom
/**
 * AI_CONTEXT: Vitest coverage for the DungeonRunPanel: victory, retreat without loss, skip, calm/quick effects, reduced motion and the disabled switch.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { HeroSnapshot } from '../../db/queries/heroState'
import { buildHeroState } from '../../utils/heroDungeon'
import { buildDeckDomainIndex } from '../../utils/securityDomain'
import { normalizeHeroLoadout } from '../../db/queries/heroLoadout'

const hoisted = vi.hoisted(() => ({
  snapshot: null as unknown,
  reduced: false,
  companion: { classId: 'paladin' as const, enabled: true, showInHeader: true, showInQuests: true, dungeonRunEnabled: true, dashboardLoopEnabled: true, animationsEnabled: true },
  persistSeen: vi.fn(async () => undefined),
}))

vi.mock('../../contexts/SettingsContext', async importOriginal => {
  const actual = await importOriginal<typeof import('../../contexts/SettingsContext')>()
  return {
    ...actual,
    useSettings: () => ({ settings: { language: 'de', nextDayStartsAt: 4, companion: hoisted.companion } }),
  }
})
vi.mock('../../hooks/useCardDb', () => ({ useGamificationProfile: () => ({ profile: { level: 5 }, error: null }) }))
vi.mock('../../hooks/useHeroSnapshot', () => ({ useHeroSnapshot: () => ({ snapshot: hoisted.snapshot, error: null, reload: () => {} }) }))
vi.mock('../../ui/motion', () => ({ useReducedMotion: () => hoisted.reduced }))
vi.mock('../../db/queries/heroLoadout', async importOriginal => {
  const actual = await importOriginal<typeof import('../../db/queries/heroLoadout')>()
  return { ...actual, persistHeroSeenFloors: hoisted.persistSeen }
})
vi.mock('../../ui/overlays/Dialog', () => ({ Dialog: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog">{children}</div> }))

import { DungeonRunPanel } from '../../components/hero/DungeonRunPanel'

const DAY = 86_400_000
const NOW = new Date('2026-10-12T10:00:00').getTime()
const decks = [{ id: 'newinfo-chapter-1', name: 'K1' }]

function snapshotWith(options: { seenFloors?: Record<string, number>; matureCards: number; gearTiers?: number }): HeroSnapshot {
  // Karten + Reviews so bauen, dass `matureCards` Karten sicher reif sind (Reviews entlang des Plans über ein halbes Jahr).
  const cards = Array.from({ length: 20 }, (_, i) => ({ id: `c${i}`, deckId: 'newinfo-chapter-1', tags: [] as string[] }))
  const reviews = []
  for (let c = 0; c < options.matureCards; c += 1) {
    // Abstände, die FSRS mit "Good" pünktlich trifft: 0, 2, 13, 47, 160 Tage (Spiel-Replay prüft Fälligkeit tageweise)
    for (const [i, day] of [0, 2, 13, 60, 160].entries()) {
      reviews.push({ reviewKey: `r${c}-${i}`, cardId: `c${c}`, rating: 3 as const, timeMs: 3000, timestamp: NOW - 200 * DAY + day * DAY })
    }
  }
  const purchases = Array.from({ length: options.gearTiers ?? 0 }, (_, i) => ({
    slot: (['weapon', 'offhand', 'head', 'chest', 'relic'] as const)[i % 5], tier: 1 as const, variant: 0, pricePaid: 100, purchasedAt: i + 1,
  }))
  const state = buildHeroState({
    reviews, cards, deckDomains: buildDeckDomainIndex(decks), purchases, equipped: {}, level: 5, nextDayStartsAt: 4, now: NOW,
  })
  return {
    state,
    loadout: normalizeHeroLoadout({ purchases, seenFloors: options.seenFloors } as never),
    deckDomains: buildDeckDomainIndex(decks),
  }
}

let root: Root | null = null
let container: HTMLDivElement | null = null

async function mount(props: React.ComponentProps<typeof DungeonRunPanel> = { deckId: 'newinfo-chapter-1' }) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => { root?.render(<DungeonRunPanel {...props} />) })
}

beforeEach(() => {
  vi.useFakeTimers()
  hoisted.snapshot = null
  hoisted.reduced = false
  hoisted.companion = { classId: 'paladin', enabled: true, showInHeader: true, showInQuests: true, dungeonRunEnabled: true, dashboardLoopEnabled: true, animationsEnabled: true }
  hoisted.persistSeen.mockClear()
})

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  container?.remove()
  root = null
  container = null
  vi.useRealTimers()
})

describe('DungeonRunPanel', () => {
  it('rendert nichts, wenn der Dungeon-Gang oder der Begleiter ausgeschaltet ist', async () => {
    hoisted.snapshot = snapshotWith({ matureCards: 0 })
    hoisted.companion = { ...hoisted.companion, dungeonRunEnabled: false }
    await mount()
    expect(container?.innerHTML).toBe('')
    await act(async () => root?.unmount())
    container?.remove()
    hoisted.companion = { ...hoisted.companion, dungeonRunEnabled: true, enabled: false }
    await mount()
    expect(container?.innerHTML).toBe('')
  })

  it('zeigt vor dem Laden einen ruhigen Platzhalter', async () => {
    await mount()
    expect(container?.querySelector('[data-testid="dungeon-run-loading"]')).not.toBeNull()
  })

  it('Rückzug ohne Verlust: nennt konkret, was fehlt, und feiert nichts', async () => {
    hoisted.snapshot = snapshotWith({ matureCards: 0, seenFloors: { '1': 0 } })
    await mount()
    const panel = container?.querySelector('[data-testid="dungeon-run"]')
    expect(panel?.getAttribute('data-mode')).toBe('retreat')
    await act(async () => { vi.advanceTimersByTime(3000) })
    expect(container?.querySelector('[data-testid="dungeon-run-banner"]')?.textContent).toContain('Rückzug – ohne Verlust.')
    expect(container?.querySelector('[data-testid="dungeon-run-hint"]')?.textContent).toMatch(/reife Karten/)
    expect(container?.querySelector('[data-testid="dungeon-run-gold"]')?.textContent).toContain('Gold')
  })

  it('beim allerersten Mal wird nichts gefeiert (Ausgangsstand wird gemerkt)', async () => {
    hoisted.snapshot = snapshotWith({ matureCards: 12, gearTiers: 2 })
    await mount()
    expect(container?.querySelector('[data-testid="dungeon-run"]')?.getAttribute('data-mode')).not.toBe('victory')
    expect(hoisted.persistSeen).toHaveBeenCalledTimes(1)
  })

  it('Sieg: eine neu geöffnete Etage wird einmal gefeiert und danach als gesehen gespeichert', async () => {
    hoisted.snapshot = snapshotWith({ matureCards: 12, gearTiers: 2, seenFloors: { '1': 0 } })
    await mount()
    const panel = container?.querySelector('[data-testid="dungeon-run"]')
    expect(panel?.getAttribute('data-mode')).toBe('victory')
    expect(panel?.getAttribute('data-phase')).toBe('intro')
    await act(async () => { vi.advanceTimersByTime(600) })
    expect(container?.querySelector('[data-testid="dungeon-run"]')?.getAttribute('data-phase')).toBe('lunge')
    await act(async () => { vi.advanceTimersByTime(3000) })
    expect(container?.querySelector('[data-testid="dungeon-run-banner"]')?.textContent).toMatch(/Etage \d+ geöffnet!|Boss besiegt!/)
    expect(hoisted.persistSeen).toHaveBeenCalledWith(1, expect.any(Number))
    expect(hoisted.persistSeen).toHaveBeenCalledTimes(1)
  })

  it('Überspringen springt direkt zum Ergebnis', async () => {
    hoisted.snapshot = snapshotWith({ matureCards: 12, gearTiers: 2, seenFloors: { '1': 0 } })
    await mount()
    const skip = container?.querySelector<HTMLButtonElement>('[data-testid="dungeon-run-skip"]')
    expect(skip).not.toBeNull()
    await act(async () => { skip?.click() })
    expect(container?.querySelector('[data-testid="dungeon-run"]')?.getAttribute('data-phase')).toBe('done')
    expect(container?.querySelector('[data-testid="dungeon-run-skip"]')).toBeNull()
  })

  it('Reduced Motion: kein Ablauf, sofort das Ergebnis', async () => {
    hoisted.reduced = true
    hoisted.snapshot = snapshotWith({ matureCards: 0, seenFloors: { '1': 0 } })
    await mount()
    expect(container?.querySelector('[data-testid="dungeon-run"]')?.getAttribute('data-phase')).toBe('done')
    expect(container?.querySelector('[data-testid="dungeon-run-skip"]')).toBeNull()
  })

  it('Daily Quest: bestimmt den Dungeon aus den gelernten Karten, wenn das Session-Deck keine Domäne hat', async () => {
    hoisted.snapshot = snapshotWith({ matureCards: 0, seenFloors: { '1': 0 } })
    await mount({ deckId: 'daily-quest', reviewedDeckIds: ['newinfo-chapter-1', 'newinfo-chapter-1', 'irgendwas'] })
    const panel = container?.querySelector('[data-testid="dungeon-run"]')
    expect(panel).not.toBeNull()
    expect(panel?.getAttribute('data-mode')).toBe('retreat')
    expect(container?.querySelector('[data-testid="dungeon-run-nodomain"]')).toBeNull()
  })

  it('Daily Quest ohne zuordenbare Karten zeigt den Helden und die Goldzeile statt einer leeren Fläche', async () => {
    hoisted.snapshot = snapshotWith({ matureCards: 0 })
    await mount({ deckId: 'daily-quest', reviewedDeckIds: ['kein-sy0-deck'] })
    expect(container?.querySelector('[data-testid="dungeon-run-nodomain"]')).not.toBeNull()
    expect(container?.querySelector('[data-testid="dungeon-hero-idle"]')).not.toBeNull()
    expect(container?.querySelector('[data-testid="dungeon-run-gold"]')).not.toBeNull()
  })

  it('Deck ohne Dungeon zeigt nur die Goldzeile', async () => {
    hoisted.snapshot = snapshotWith({ matureCards: 0 })
    await mount({ deckId: 'irgendein-anderes-deck' })
    expect(container?.querySelector('[data-testid="dungeon-run-nodomain"]')).not.toBeNull()
    expect(container?.querySelector('[data-testid="dungeon-run-gold"]')).not.toBeNull()
  })
})
