import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

/**
 * Render-/Struktur-Test für die Labs-Liste und das Szenario-Detail,
 * rekonstruiert aus `…23.38.26.jpeg` (Liste) und `…23.38.47/.39.17.jpeg`
 * (Detail). Wie bei den anderen Komponenten-Tests: kein jsdom → SSR-Markup.
 */

vi.mock('framer-motion', () => {
  const FRAMER_ONLY = new Set([
    'drag', 'dragSnapToOrigin', 'dragConstraints', 'whileDrag', 'whileTap', 'whileHover',
    'onDragStart', 'onDragEnd', 'initial', 'animate', 'exit', 'transition', 'layout', 'variants',
    'axis', 'values', 'onReorder', 'value',
  ])
  const make = (tag: string) => (props: Record<string, unknown>) => {
    const clean: Record<string, unknown> = {}
    for (const key of Object.keys(props)) if (!FRAMER_ONLY.has(key)) clean[key] = props[key]
    return createElement(tag, clean)
  }
  return {
    motion: new Proxy({}, { get: (_t, tag: string) => make(tag) }),
    Reorder: { Group: make('div'), Item: make('div') },
    useReducedMotion: () => false,
  }
})

import LabsView from '../../components/labs/LabsView'
import LabScenarioView from '../../components/labs/LabScenarioView'
import { LAB_SCENARIOS, LAB_TARGET_INVENTORY } from '../../data/labScenarios'

describe('LabsView — Liste (Beleg …23.38.26.jpeg)', () => {
  const html = renderToStaticMarkup(
    createElement(LabsView, { language: 'de', onExit: () => {} }),
  )

  it('zeigt Titel, Untertitel und Fortschritts-Pill (x / 71)', () => {
    expect(html).toContain('Labs')
    expect(html).toContain('Interaktive Sicherheits-Szenarien')
    expect(html).toContain(`/ ${LAB_TARGET_INVENTORY}`)
  })

  it('zeigt die belegte Kategorie Security-Grundlagen mit Zähler und Untertitel', () => {
    expect(html).toContain('Security-Grundlagen')
    expect(html).toContain('Szenarien')
    expect(html).toContain('Controls, CIA, Zero-Trust, Change-Management')
  })

  it('zeigt Szenario-Zeilen mit Schwierigkeit, Dauer und Objective', () => {
    expect(html).toContain('Einsteiger')
    expect(html).toContain('Fortgeschritten')
    expect(html).toContain('Experte')
    expect(html).toContain('1.1 Security Controls')
    expect(html).toContain('Min')
  })

  it('rendert durchgängig Mono-Schrift', () => {
    expect(html).toContain('font-mono')
    expect(html).not.toContain('font-sans')
  })
})

describe('LabScenarioView — Detail', () => {
  it('Matching-Detail zeigt Beweismaterial, Dropdowns und Antwort prüfen (Beleg …23.38.47.jpeg)', () => {
    const scenario = LAB_SCENARIOS.find(s => s.id === 'grundlagen-control-funktion')!
    const html = renderToStaticMarkup(
      createElement(LabScenarioView, { language: 'de', scenario, onBack: () => {}, onSolved: () => {} }),
    )
    expect(html).toContain('Beweismaterial')
    expect(html).toContain('Ordne jedem Element rechts das richtige Pendant zu')
    expect(html).toContain('– auswählen –')
    expect(html).toContain('Antwort prüfen')
    expect(html).toContain('Firewall verwirft eingehenden RDP-Traffic')
    expect(html).toContain('1.1 Security Controls')
  })

  it('Ordering-Detail zeigt Topologie, Ziel-Callout und nummerierte Schritte (Beleg …23.39.17.jpeg)', () => {
    const scenario = LAB_SCENARIOS.find(s => s.id === 'firewalls-geo-block')!
    const html = renderToStaticMarkup(
      createElement(LabScenarioView, { language: 'de', scenario, onBack: () => {}, onSolved: () => {} }),
    )
    expect(html).toContain('Netzwerktopologie')
    expect(html).toContain('Internet -&gt; [Firewall] -&gt; DMZ Webserver 192.168.1.10:443')
    expect(html).toContain('Ziel: Block bekannter Bad-Networks zuerst')
    expect(html).toContain('Ziehe die Regeln in die richtige Reihenfolge')
    expect(html).toContain('185.204.0.0/16')
    expect(html).toContain('Geo-Block vor Web-Allow')
    expect(html).toContain('Experte')
  })
})
