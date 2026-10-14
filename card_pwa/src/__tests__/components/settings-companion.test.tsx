/**
 * AI_CONTEXT: Vitest coverage for the companion settings (Begleiter & Spiel): normalization, hiding via switches, and the settings section.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { GamificationProfile } from '../../types'

const hoisted = vi.hoisted(() => ({
  companion: { classId: 'paladin' as const, enabled: true, showInHeader: true, showInQuests: true, dungeonRunEnabled: true, dashboardLoopEnabled: true, animationsEnabled: true },
  level: 8,
  setCompanionSettings: vi.fn(),
}))

vi.mock('../../contexts/SettingsContext', async importOriginal => {
  const actual = await importOriginal<typeof import('../../contexts/SettingsContext')>()
  return {
    ...actual,
    useCompanionSettings: () => hoisted.companion,
    useSettings: () => ({
      settings: { language: 'de', nextDayStartsAt: 4, companion: hoisted.companion },
      setCompanionSettings: hoisted.setCompanionSettings,
    }),
  }
})
vi.mock('../../hooks/useCardDb', () => ({
  useGamificationProfile: () => ({ profile: { level: hoisted.level } as GamificationProfile, error: null }),
}))
vi.mock('../../hooks/useHeroSnapshot', () => ({ useHeroSnapshot: () => ({ snapshot: null, error: null, reload: () => {} }) }))
vi.mock('../../components/StreakBadge', () => ({ default: () => null }))
vi.mock('../../components/DailyGoalRing', () => ({ default: () => null }))

import { normalizeCompanionSettings, normalizeSettings, DEFAULT_COMPANION_SETTINGS, STRINGS } from '../../contexts/SettingsContext'
import { SettingsCompanionSection } from '../../components/settings/SettingsCompanionSection'
import { HomeHeaderBar } from '../../components/home/HomeHeaderBar'
import { HomeQuestsPanel } from '../../components/home/HomeQuestsPanel'

const headerProps = {
  t: STRINGS.de,
  language: 'de' as const,
  canInstall: false,
  isInstalled: true,
  isInstalling: false,
  isConnected: true,
  notificationPermission: 'granted' as const,
  storageEstimateUnavailable: true,
  storageUsedBytes: null,
  storageQuotaBytes: null,
  companionLevel: 8,
  onInstall: () => {},
  onRequestNotificationPermission: () => {},
  onShowSettings: () => {},
  onShowFaq: () => {},
}

const profile = { level: 8, rankTier: 'cadet', currentLevelXp: 1, nextLevelXp: 10, levelProgress: 10, todayXp: 0, totalXp: 1, quests: [] } as unknown as GamificationProfile

beforeEach(() => {
  hoisted.companion = { classId: 'paladin', enabled: true, showInHeader: true, showInQuests: true, dungeonRunEnabled: true, dashboardLoopEnabled: true, animationsEnabled: true }
  hoisted.level = 8
  hoisted.setCompanionSettings.mockClear()
})

describe('normalizeCompanionSettings', () => {
  it('liefert ohne Eingabe die Defaults (alles an)', () => {
    expect(normalizeCompanionSettings(undefined)).toEqual(DEFAULT_COMPANION_SETTINGS)
    expect(normalizeCompanionSettings(null)).toEqual(DEFAULT_COMPANION_SETTINGS)
    expect(normalizeCompanionSettings('kaputt')).toEqual(DEFAULT_COMPANION_SETTINGS)
  })

  it('übernimmt nur ausdrückliches false und ignoriert Müll-Werte', () => {
    expect(normalizeCompanionSettings({ enabled: false })).toEqual({ ...DEFAULT_COMPANION_SETTINGS, enabled: false })
    expect(normalizeCompanionSettings({ animationsEnabled: 0, showInHeader: 'nein' })).toEqual(DEFAULT_COMPANION_SETTINGS)
  })

  it('ergänzt alte gespeicherte Settings ohne companion-Feld um die Defaults', () => {
    expect(normalizeSettings({ language: 'en' }).companion).toEqual(DEFAULT_COMPANION_SETTINGS)
    expect(normalizeSettings({ companion: { enabled: false } as never }).companion.enabled).toBe(false)
  })
})

describe('Begleiter lässt sich per Einstellung ausblenden', () => {
  it('Header: aus über Hauptschalter, über Header-Schalter, sonst sichtbar', () => {
    expect(renderToStaticMarkup(createElement(HomeHeaderBar, headerProps))).toContain('data-testid="companion-badge"')
    hoisted.companion = { ...hoisted.companion, enabled: false }
    expect(renderToStaticMarkup(createElement(HomeHeaderBar, headerProps))).not.toContain('companion-badge')
    hoisted.companion = { ...hoisted.companion, enabled: true, showInHeader: false }
    expect(renderToStaticMarkup(createElement(HomeHeaderBar, headerProps))).not.toContain('companion-badge')
  })

  it('Quest-Panel: aus über Hauptschalter und über Panel-Schalter', () => {
    const render = () => renderToStaticMarkup(createElement(HomeQuestsPanel, { t: STRINGS.de, profile }))
    expect(render()).toContain('data-testid="companion-sprite"')
    hoisted.companion = { ...hoisted.companion, showInQuests: false }
    expect(render()).not.toContain('companion-sprite')
    hoisted.companion = { ...hoisted.companion, showInQuests: true, enabled: false }
    expect(render()).not.toContain('companion-sprite')
  })

  it('Animationen aus: kein companion-idle in Header und Panel', () => {
    hoisted.companion = { ...hoisted.companion, animationsEnabled: false }
    expect(renderToStaticMarkup(createElement(HomeHeaderBar, headerProps))).not.toContain('companion-idle')
    expect(renderToStaticMarkup(createElement(HomeQuestsPanel, { t: STRINGS.de, profile }))).not.toContain('companion-idle')
  })
})

describe('SettingsCompanionSection', () => {
  const render = () => renderToStaticMarkup(createElement(SettingsCompanionSection, { isOpen: true, onToggle: () => {}, presentation: 'panel' }))

  it('zeigt Titel, aktuellen Begleiter und Level', () => {
    const html = render()
    expect(html).toContain('Begleiter &amp; Spiel')
    expect(html).toContain('Ritter')
    expect(html).toContain('Dein Level: 8')
    expect(html).toContain('Nächste Entwicklung bei Level 18')
  })

  it('markiert Stufen nach Level als freigeschaltet oder gesperrt', () => {
    const html = render()
    expect(html).toMatch(/data-testid="companion-stage-squire"[^>]*data-unlocked="true"/)
    expect(html).toMatch(/data-testid="companion-stage-knight"[^>]*data-unlocked="true"/)
    expect(html).toMatch(/data-testid="companion-stage-paladin"[^>]*data-unlocked="false"/)
  })

  it('schaltet auf der höchsten Stufe alles frei und nennt keine nächste Entwicklung', () => {
    hoisted.level = 25
    const html = render()
    expect(html).toMatch(/data-testid="companion-stage-paladin"[^>]*data-unlocked="true"/)
    expect(html).toContain('Höchste Stufe erreicht')
  })

  it('deaktiviert die Unterschalter, wenn der Hauptschalter aus ist', () => {
    hoisted.companion = { ...hoisted.companion, enabled: false }
    const html = render()
    expect((html.match(/disabled=""/g) ?? []).length).toBe(5)
  })

  it('hat sechs Schalter und drei Klassenknöpfe mit aria-pressed', () => {
    const html = render()
    expect((html.match(/aria-pressed=/g) ?? []).length).toBe(6 + 3)
    expect((html.match(/data-testid="hero-class-/g) ?? []).length).toBe(3)
  })

  it('markiert die gewählte Klasse und bietet Laden und Skilltree an', () => {
    const html = render()
    expect(html).toMatch(/data-testid="hero-class-paladin"[^>]*>/)
    expect(html).toContain('data-testid="hero-open-shop"')
    expect(html).toContain('data-testid="hero-open-skills"')
    expect(html).toContain('data-testid="hero-domain-1"')
    expect(html).toContain('data-testid="hero-domain-5"')
  })
})
