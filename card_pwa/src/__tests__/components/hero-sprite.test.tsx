// @vitest-environment happy-dom
/**
 * AI_CONTEXT: Vitest coverage for HeroSprite: idle loop via CSS, one-shot attack frames, reduced motion, disabled animations and static fallback.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'

const hoisted = vi.hoisted(() => ({ reduced: false }))
vi.mock('../../ui/motion', () => ({ useReducedMotion: () => hoisted.reduced }))

import { HeroSprite } from '../../components/hero/HeroSprite'
import { getHeroAnimation, getHeroAttackAnimation, getHeroAttackKind, getHeroFrameWidth, hasHeroAnimation, HERO_ANIMATION_FRAMES } from '../../data/heroAnimationCatalog'
import { HERO_CLASSES } from '../../data/heroClassCatalog'
import { getCompanionStages } from '../../data/companionCatalog'

let root: Root | null = null
let container: HTMLDivElement | null = null

async function mount(node: React.ReactElement) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => { root?.render(node) })
}

beforeEach(() => {
  vi.useFakeTimers()
  hoisted.reduced = false
})
afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  container?.remove()
  root = null
  container = null
  vi.useRealTimers()
})

describe('heroAnimationCatalog', () => {
  it('liefert für jeden Skin zwei Idle-Schleifen und für Stufe 1 und 2 vier Angriffe', () => {
    const attacks = ['attack-1', 'attack-2', 'attack-3', 'attack-4'] as const
    for (const definition of HERO_CLASSES) {
      getCompanionStages(definition.id).forEach((_stage, index) => {
        expect(getHeroAnimation(definition.id, index + 1, 'idle-a'), `${definition.id}-${index + 1} idle-a`).toBeTruthy()
        expect(getHeroAnimation(definition.id, index + 1, 'idle-b'), `${definition.id}-${index + 1} idle-b`).toBeTruthy()
        if (index < 2) for (const kind of attacks) expect(getHeroAnimation(definition.id, index + 1, kind), `${definition.id}-${index + 1} ${kind}`).toBeTruthy()
      })
    }
  })

  it('fällt bei fehlender Angriffsvariante auf einen vorhandenen Angriff zurück', () => {
    expect(getHeroAttackAnimation('paladin', 3, 2)).toBe(getHeroAnimation('paladin', 3, 'attack-1'))
    expect(getHeroAttackAnimation('mage', 2, 3)).toBe(getHeroAnimation('mage', 2, 'attack-4'))
    expect(getHeroAttackAnimation('mage', 99, 0)).toBe('')
  })

  it('faltet Angriffsnummern reihum in die vier Varianten', () => {
    expect(getHeroAttackKind(0)).toBe('attack-1')
    expect(getHeroAttackKind(3)).toBe('attack-4')
    expect(getHeroAttackKind(4)).toBe('attack-1')
    expect(getHeroAttackKind(-1)).toBe('attack-4')
  })

  it('kennt die Streifen des Paladins (Stufe 3) und liefert für Unbekanntes einen leeren String', () => {
    expect(hasHeroAnimation('paladin', 3)).toBe(true)
    expect(getHeroAnimation('paladin', 3, 'idle-a')).toBeTruthy()
    expect(getHeroAnimation('paladin', 3, 'attack-1')).toBeTruthy()
    expect(getHeroAnimation('mage', 99, 'idle-a')).toBe('')
  })
})

describe('HeroSprite', () => {
  it('spielt Idle als CSS-Schleife, wenn ein Streifen existiert und Animationen erlaubt sind', async () => {
    await mount(<HeroSprite classId="paladin" stageNumber={3} height={100} testId="s" />)
    const el = container?.querySelector('[data-testid="s"]') as HTMLElement
    expect(el.getAttribute('data-anim')).toBe('idle')
    expect(el.className).toContain('hero-strip-idle')
    expect(el.style.backgroundSize).toBe(`${getHeroFrameWidth(100) * HERO_ANIMATION_FRAMES}px 100px`)
  })

  it('zeigt den statischen Skin, wenn Animationen ausgeschaltet sind', async () => {
    await mount(<HeroSprite classId="paladin" stageNumber={3} height={100} animate={false} testId="s" />)
    const el = container?.querySelector('[data-testid="s"]') as HTMLElement
    expect(el.getAttribute('data-anim')).toBe('static')
    expect(el.style.backgroundPosition).toBe('0px 0px')
  })

  it('zeigt bei Reduced Motion den statischen Skin, auch im Angriffsmodus', async () => {
    hoisted.reduced = true
    await mount(<HeroSprite classId="paladin" stageNumber={3} height={100} mode="attack" testId="s" />)
    expect(container?.querySelector('[data-testid="s"]')?.getAttribute('data-anim')).toBe('static')
  })

  it('fällt ohne Streifen (andere Stufe/Klasse) auf den statischen Skin zurück, ohne zu brechen', async () => {
    await mount(<HeroSprite classId="mage" stageNumber={2} height={100} testId="s" />)
    const el = container?.querySelector('[data-testid="s"]') as HTMLElement
    expect(['static', 'idle']).toContain(el.getAttribute('data-anim'))
  })

  it('spielt den Angriff einmal durch alle Frames und meldet das Ende genau einmal', async () => {
    const done = vi.fn()
    await mount(<HeroSprite classId="paladin" stageNumber={3} height={100} mode="attack" attackVariant={1} attackFps={10} onAttackDone={done} testId="s" />)
    const el = () => container?.querySelector('[data-testid="s"]') as HTMLElement
    expect(el().getAttribute('data-anim')).toBe('attack')
    const fw = getHeroFrameWidth(100)
    expect(el().style.backgroundPosition).toBe('0px 0px')
    await act(async () => { vi.advanceTimersByTime(100) })
    expect(el().style.backgroundPosition).toBe(`${-fw}px 0px`)
    await act(async () => { vi.advanceTimersByTime(200) })
    expect(el().style.backgroundPosition).toBe(`${-3 * fw}px 0px`)
    await act(async () => { vi.advanceTimersByTime(500) })
    expect(done).toHaveBeenCalledTimes(1)
    expect(el().style.backgroundPosition).toBe(`${-(HERO_ANIMATION_FRAMES - 1) * fw}px 0px`)
  })
})
