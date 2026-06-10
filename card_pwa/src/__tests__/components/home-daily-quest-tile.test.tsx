import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { HomeDailyQuestTile } from '../../components/home/HomeDailyQuestTile'

/**
 * Dashboard-Kachel "Pilot" = Daily Quest, rekonstruiert aus dem Handy-
 * Screenshot vom 8. Juni 2026 (`WhatsApp …23.36.20.jpeg`): "DAILY QUEST /
 * Jetzt: 25 Karten / 01 General Security Concepts · … heute …" mit
 * "25 Karten starten" + "Decks anzeigen".
 */

function render(overrides: Partial<Parameters<typeof HomeDailyQuestTile>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(HomeDailyQuestTile, {
      language: 'de',
      questSize: 25,
      dueTodayTotal: 277,
      topDeckName: '01 General Security Concepts',
      starting: false,
      onStart: () => {},
      onShowDecks: () => {},
      ...overrides,
    }),
  )
}

describe('HomeDailyQuestTile — Pilot-Modus (Beleg …23.36.20.jpeg)', () => {
  it('zeigt Label, Titel und Deck-Hinweis wie im Screenshot', () => {
    const html = render()
    expect(html).toContain('Daily Quest')
    expect(html).toContain('Jetzt: 25 Karten')
    expect(html).toContain('01 General Security Concepts')
    expect(html).toContain('277 heute fällig')
  })

  it('bietet Start- und Decks-anzeigen-Aktionen an', () => {
    const html = render()
    expect(html).toContain('25 Karten starten')
    expect(html).toContain('Decks anzeigen')
    expect(html).toContain('data-testid="daily-quest-start"')
  })

  it('deaktiviert den Start, wenn keine Karten fällig sind', () => {
    const html = render({ questSize: 0, dueTodayTotal: 0, topDeckName: null })
    expect(html).toContain('Alles erledigt')
    expect(html).toContain('disabled')
  })
})
