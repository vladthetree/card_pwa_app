// @vitest-environment happy-dom
/**
 * AI_CONTEXT: Vitest coverage for the dashboard DungeonLoopScene: endless phase cycle, monster rotation, pause while hidden, static when animations are off or motion is reduced, and the quest panel integration.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'

const hoisted = vi.hoisted(() => ({
  reduced: false,
  companion: { classId: 'paladin' as const, enabled: true, showInHeader: true, showInQuests: true, dungeonRunEnabled: true, dashboardLoopEnabled: true, animationsEnabled: true },
}))

vi.mock('../../ui/motion', () => ({ useReducedMotion: () => hoisted.reduced }))
vi.mock('../../contexts/SettingsContext', async importOriginal => {
  const actual = await importOriginal<typeof import('../../contexts/SettingsContext')>()
  return { ...actual, useCompanionSettings: () => hoisted.companion }
})

import { DungeonLoopScene } from '../../components/hero/DungeonLoopScene'
import { HomeQuestsPanel } from '../../components/home/HomeQuestsPanel'
import { STRINGS } from '../../i18n'
import type { GamificationProfile } from '../../types'

let root: Root | null = null
let container: HTMLDivElement | null = null

async function mount(level = 5) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => { root?.render(<DungeonLoopScene level={level} label="Held" />) })
}
const phase = () => container?.querySelector('[data-testid="dungeon-loop"]')?.getAttribute('data-phase')

beforeEach(() => {
  vi.useFakeTimers()
  hoisted.reduced = false
  hoisted.companion = { ...hoisted.companion, enabled: true, showInQuests: true, dashboardLoopEnabled: true, animationsEnabled: true, classId: 'paladin' }
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
})
afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  container?.remove()
  root = null
  container = null
  vi.useRealTimers()
})

describe('DungeonLoopScene', () => {
  it('läuft endlos durch idle → lunge → strike → death → return und beginnt von vorn', async () => {
    await mount()
    expect(container?.querySelector('[data-testid="dungeon-loop"]')?.getAttribute('data-running')).toBe('true')
    const seen: string[] = [phase() ?? '']
    for (const wait of [1600, 380, 360, 1000, 640, 1600]) {
      await act(async () => { vi.advanceTimersByTime(wait) })
      seen.push(phase() ?? '')
    }
    expect(seen).toEqual(['idle', 'lunge', 'strike', 'death', 'return', 'idle', 'lunge'])
  })

  it('wechselt nach jedem Durchlauf das Monster reihum', async () => {
    await mount()
    const monsterAt = () => container?.innerHTML.match(/mon-(\d)-/)?.[1]
    const first = monsterAt()
    await act(async () => { vi.advanceTimersByTime(1600 + 380 + 360 + 1000 + 640 + 50) })
    const second = monsterAt()
    expect(first).toBeTruthy()
    expect(second).toBeTruthy()
    expect(second).not.toBe(first)
  })

  it('spielt im Strike den Angriff und zeigt den Klassen-Effekt', async () => {
    await mount()
    await act(async () => { vi.advanceTimersByTime(1600 + 380 + 10) })
    expect(phase()).toBe('strike')
    expect(container?.querySelector('[data-testid="dungeon-loop-hero"]')?.getAttribute('data-anim')).toBe('attack')
  })

  it('wechselt den Angriff und das Idle von Durchlauf zu Durchlauf', async () => {
    await mount(10)
    const cycleMs = 1600 + 380 + 360 + 1000 + 640
    const heroUrl = () => container?.querySelector('[data-testid="dungeon-loop-hero"]')?.getAttribute('style')?.match(/url\(([^)]+)\)/)?.[1] ?? ''
    const idleUrls = new Set<string>()
    const attackUrls = new Set<string>()
    let now = 0
    for (let cycle = 0; cycle < 4; cycle += 1) {
      await act(async () => { vi.advanceTimersByTime(cycle * cycleMs + 100 - now) }); now = cycle * cycleMs + 100
      idleUrls.add(heroUrl())
      await act(async () => { vi.advanceTimersByTime(cycle * cycleMs + 1600 + 380 + 50 - now) }); now = cycle * cycleMs + 1600 + 380 + 50
      attackUrls.add(heroUrl())
    }
    expect(idleUrls.size).toBe(2)
    expect(attackUrls.size).toBe(4)
  })

  it('steht still, wenn Animationen ausgeschaltet sind oder Reduced Motion gilt', async () => {
    hoisted.companion = { ...hoisted.companion, animationsEnabled: false }
    await mount()
    await act(async () => { vi.advanceTimersByTime(5000) })
    expect(phase()).toBe('idle')
    expect(container?.querySelector('[data-testid="dungeon-loop"]')?.getAttribute('data-running')).toBe('false')
    await act(async () => root?.unmount()); container?.remove(); root = null
    hoisted.companion = { ...hoisted.companion, animationsEnabled: true }
    hoisted.reduced = true
    await mount()
    await act(async () => { vi.advanceTimersByTime(5000) })
    expect(phase()).toBe('idle')
  })

  it('pausiert, wenn die Seite versteckt wird, und läuft danach weiter', async () => {
    await mount()
    await act(async () => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')) })
    expect(container?.querySelector('[data-testid="dungeon-loop"]')?.getAttribute('data-running')).toBe('false')
    await act(async () => { vi.advanceTimersByTime(4000) })
    expect(phase()).toBe('idle')
    await act(async () => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')) })
    expect(container?.querySelector('[data-testid="dungeon-loop"]')?.getAttribute('data-running')).toBe('true')
  })
})

describe('HomeQuestsPanel mit Dungeon-Schleife', () => {
  const profile = { level: 3, rankTier: 'cadet', currentLevelXp: 1, nextLevelXp: 10, levelProgress: 10, todayXp: 0, totalXp: 1, quests: [] } as unknown as GamificationProfile
  const render = () => renderToStaticMarkup(<HomeQuestsPanel t={STRINGS.de} profile={profile} />)

  it('zeigt die Schleife oben im Panel', () => {
    expect(render()).toContain('data-testid="dungeon-loop"')
  })
  it('lässt sie weg, wenn der Schalter, der Begleiter oder das Quest-Panel aus ist', () => {
    hoisted.companion = { ...hoisted.companion, dashboardLoopEnabled: false }
    expect(render()).not.toContain('dungeon-loop')
    hoisted.companion = { ...hoisted.companion, dashboardLoopEnabled: true, enabled: false }
    expect(render()).not.toContain('dungeon-loop')
    hoisted.companion = { ...hoisted.companion, enabled: true, showInQuests: false }
    expect(render()).not.toContain('dungeon-loop')
  })
})
