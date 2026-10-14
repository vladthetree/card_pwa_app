/**
 * AI_CONTEXT: Vitest coverage for the companion (Wächter) test feature; stage derivation from level and Home quest panel rendering.
 */
import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildCompanionSnapshot, COMPANION_STAGES } from '../../data/companionCatalog'
import { HomeQuestsPanel } from '../../components/home/HomeQuestsPanel'
import { HomeHeaderBar } from '../../components/home/HomeHeaderBar'
import { STRINGS } from '../../i18n'
import type { GamificationProfile } from '../../types'

// Streak-Badge und Tagesring brauchen den SettingsProvider; für die Kopfzeile genügen Platzhalter.
vi.mock('../../components/StreakBadge', () => ({ default: () => null }))
vi.mock('../../components/DailyGoalRing', () => ({ default: () => null }))

function profileAt(level: number): GamificationProfile {
  return {
    level,
    rankTier: 'cadet',
    totalXp: 0,
    currentLevelXp: 10,
    nextLevelXp: 100,
    levelProgress: 10,
    totalReviews: 0,
    successRate: 0,
    reviewedToday: 0,
    successToday: 0,
    todayXp: 0,
    currentStreak: 0,
    quests: [],
  } as unknown as GamificationProfile
}

describe('buildCompanionSnapshot', () => {
  it('leitet die Stufe aus dem Level ab (Schwellen 1/8/18)', () => {
    const idAt = (level: number) => buildCompanionSnapshot(level).stage.id
    expect(idAt(1)).toBe('squire')
    expect(idAt(7)).toBe('squire')
    expect(idAt(8)).toBe('knight')
    expect(idAt(17)).toBe('knight')
    expect(idAt(18)).toBe('paladin')
    expect(idAt(99)).toBe('paladin')
  })

  it('klemmt ungültige Level auf Stufe 1', () => {
    expect(buildCompanionSnapshot(0).stage.id).toBe('squire')
    expect(buildCompanionSnapshot(-5).stage.id).toBe('squire')
    expect(buildCompanionSnapshot(Number.NaN).stage.id).toBe('squire')
  })

  it('nennt die nächste Stufe und die Restlevel, auf der letzten Stufe keine', () => {
    const early = buildCompanionSnapshot(4)
    expect(early.nextStage?.id).toBe('knight')
    expect(early.levelsToNext).toBe(4)
    const last = buildCompanionSnapshot(25)
    expect(last.nextStage).toBeNull()
    expect(last.levelsToNext).toBe(0)
  })

  it('hat aufsteigende Schwellen und je Stufe ein Sprite und beide Übersetzungen', () => {
    const levels = COMPANION_STAGES.map(stage => stage.minLevel)
    expect([...levels].sort((a, b) => a - b)).toEqual(levels)
    for (const stage of COMPANION_STAGES) {
      expect(stage.sprite).toBeTruthy()
      expect(STRINGS.de[stage.nameKey]).toBeTruthy()
      expect(STRINGS.en[stage.nameKey]).toBeTruthy()
    }
  })
})

describe('HomeQuestsPanel mit Begleiter', () => {
  it('zeigt Sprite, Stufenname und Hinweis auf die nächste Entwicklung (DE)', () => {
    const html = renderToStaticMarkup(createElement(HomeQuestsPanel, { t: STRINGS.de, profile: profileAt(8) }))
    expect(html).toContain('data-stage="knight"')
    expect(html).toContain('Ritter')
    expect(html).toContain('Nächste Entwicklung bei Level 18')
    expect(html).toContain('data-testid="companion-hero"')
    expect(html).toContain('image-rendering:pixelated')
  })

  it('zeigt auf der höchsten Stufe keinen Entwicklungshinweis (EN)', () => {
    const html = renderToStaticMarkup(createElement(HomeQuestsPanel, { t: STRINGS.en, profile: profileAt(30) }))
    expect(html).toContain('data-stage="paladin"')
    expect(html).toContain('Highest stage reached')
    expect(html).not.toContain('Next evolution')
  })

  it('fällt ohne Profil auf den Knappen zurück', () => {
    const html = renderToStaticMarkup(createElement(HomeQuestsPanel, { t: STRINGS.de, profile: null }))
    expect(html).toContain('data-stage="squire"')
  })

  it('markiert das Sprite als dekorativ', () => {
    const html = renderToStaticMarkup(createElement(HomeQuestsPanel, { t: STRINGS.de, profile: profileAt(1) }))
    expect(html).toMatch(/aria-hidden="true"[^>]*data-testid="companion-hero"|data-testid="companion-hero"[^>]*aria-hidden="true"/)
  })
})

describe('HomeHeaderBar mit Begleiter', () => {
  const baseProps = {
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
    onInstall: () => {},
    onRequestNotificationPermission: () => {},
    onShowSettings: () => {},
    onShowFaq: () => {},
  }

  it('zeigt den Knappen neben dem Logo und beschreibt den Stand im aria-label', () => {
    const html = renderToStaticMarkup(createElement(HomeHeaderBar, { ...baseProps, companionLevel: 5 }))
    expect(html).toContain('data-testid="companion-badge"')
    expect(html).toContain('data-stage="squire"')
    expect(html).toContain('Begleiter: Knappe (1/3) · Level 5')
  })

  it('wechselt mit dem Level die Stufe und nutzt ohne Level den Knappen', () => {
    const knight = renderToStaticMarkup(createElement(HomeHeaderBar, { ...baseProps, companionLevel: 9 }))
    expect(knight).toContain('data-stage="knight"')
    const fallback = renderToStaticMarkup(createElement(HomeHeaderBar, baseProps))
    expect(fallback).toContain('data-stage="squire"')
  })
})
