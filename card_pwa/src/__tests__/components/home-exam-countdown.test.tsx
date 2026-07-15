/**
 * AI_CONTEXT: Protects the compact mobile exam countdown placement and keeps
 * pacing/streak/reload information out of the home top controls.
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HomeBottomBar } from '../../components/home/HomeBottomBar'

function render(examDaysLeft: number | null = 30) {
  return renderToStaticMarkup(createElement(HomeBottomBar, {
    t: {
      settings: 'Einstellungen',
      sort_name: 'Name',
      sort_due_today: 'Heute fällig',
      create_deck: 'Deck erstellen',
      create_card: 'Karte erstellen',
      import_action: 'Importieren',
      backup_export_title: 'Exportieren',
      install: 'Installieren',
    },
    language: 'de',
    shuffleModeEnabled: false,
    showShuffleOnly: false,
    deckSortMode: 'name',
    homeTab: 'decks',
    canInstall: false,
    isInstalled: true,
    isInstalling: false,
    examDaysLeft,
    onHomeTabChange: () => undefined,
    onDeckSortModeChange: () => undefined,
    onToggleShuffleOnly: () => undefined,
    onCreateDeck: () => undefined,
    onCreateCard: () => undefined,
    onImport: () => undefined,
    onExport: () => undefined,
    onShowSettings: () => undefined,
    onInstall: () => undefined,
  }))
}

describe('mobile Prüfungs-Countdown', () => {
  it('zeigt in der oberen Leiste nur die verbleibenden Tage', () => {
    const html = render(30)
    expect(html).toContain('data-testid="exam-countdown"')
    expect(html).toContain('Prüfung in 30 Tagen')
    expect(html).toContain('>30</span>')
    expect(html).toContain('>Tage</span>')
    expect(html).not.toContain('Tempo')
    expect(html).not.toContain('lucide-refresh-cw')
    expect(html).not.toContain('lucide-flame')
  })

  it('blendet den Counter ohne zukünftigen Prüfungstermin aus', () => {
    expect(render(null)).not.toContain('data-testid="exam-countdown"')
  })
})
