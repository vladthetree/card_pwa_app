/**
 * AI_CONTEXT: Vitest coverage for labs view; protects components behavior from regressions in the learning PWA.
 */
import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

/**
 * Render-/Struktur-Test für die Labs-Liste und das Szenario-Detail,
 * rekonstruiert aus `…23.38.26.jpeg` (Liste) und `…23.38.47/.39.17.jpeg`
 * (Detail). Wie bei den anderen Komponenten-Tests: kein jsdom → SSR-Markup.
 */

// LabsView nutzt useSettings (Profil für die Lab-Versuchs-Instrumentierung);
// im SSR-Struktur-Test genügt ein nicht-hydriertes Profil ohne Provider.
vi.mock('../../contexts/SettingsContext', () => ({
  useSettings: () => ({ profile: null, isProfileHydrated: false }),
}))

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
import { LAB_SCENARIOS, LAB_TARGET_INVENTORY, type LabScenario } from '../../data/labScenarios'

describe('LabsView — Liste (Beleg …23.38.26.jpeg)', () => {
  const html = renderToStaticMarkup(
    createElement(LabsView, { language: 'de', onExit: () => {} }),
  )

  it('zeigt Titel, Untertitel und Fortschritts-Pill mit aktuellem Inventarziel', () => {
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

  it('zeigt keinen zufälligen Übungs-Lab-Generator mehr', () => {
    expect(html).not.toContain('Übungs-Lab generieren')
    expect(html).not.toContain('lab-training-')
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

  it('Decision-Detail zeigt Multi-Select-Prompt, alle Optionen und Checkbox-Rollen', () => {
    const scenario: LabScenario = {
      id: 'test-decision',
      categoryId: 'iam',
      title: 'Least-Privilege-Entscheidung',
      objective: '4.6 Identity and access management',
      difficulty: 'fortgeschritten',
      minutes: 6,
      description: 'Welche Rechte darf der Helpdesk-Account bekommen?',
      interaction: {
        type: 'decision',
        selectionMode: 'multiple',
        options: [
          { id: 'reset-pw', text: 'Passwörter zurücksetzen' },
          { id: 'domain-admin', text: 'Domain-Admin-Rechte' },
        ],
        correctIds: ['reset-pw'],
      },
    }
    const html = renderToStaticMarkup(
      createElement(LabScenarioView, { language: 'de', scenario, onBack: () => {}, onSolved: () => {} }),
    )
    expect(html).toContain('Wähle alle zutreffenden Optionen')
    expect(html).toContain('Passwörter zurücksetzen')
    expect(html).toContain('Domain-Admin-Rechte')
    expect(html).toContain('role="checkbox"')
  })

  it('Decision-Detail mit Single-Select zeigt Radio-Rollen und den Single-Prompt', () => {
    const scenario: LabScenario = {
      id: 'test-decision-single',
      categoryId: 'iam',
      title: 'MFA-Faktor-Entscheidung',
      objective: '4.6 Multifactor authentication',
      difficulty: 'einsteiger',
      minutes: 4,
      description: 'Welcher Faktor ist "something you have"?',
      interaction: {
        type: 'decision',
        selectionMode: 'single',
        options: [
          { id: 'token', text: 'Hardware-Token' },
          { id: 'password', text: 'Passwort' },
        ],
        correctIds: ['token'],
      },
    }
    const html = renderToStaticMarkup(
      createElement(LabScenarioView, { language: 'de', scenario, onBack: () => {}, onSolved: () => {} }),
    )
    expect(html).toContain('Wähle die richtige Option')
    expect(html).toContain('role="radio"')
    expect(html).toContain('role="radiogroup"')
  })

  it('Mehrschritt-Capstone zeigt Schrittfortschritt und zunächst nur die erste Analyse', () => {
    const scenario = LAB_SCENARIOS.find(item => item.id === 'capstone-4-9-log-correlation')!
    const html = renderToStaticMarkup(
      createElement(LabScenarioView, { language: 'de', scenario, onBack: () => {}, onSolved: () => {} }),
    )
    expect(html).toContain('Schritt 1 von 3')
    expect(html).toContain('Quellen auswählen')
    expect(html).toContain('Endpoint-Prozess- und OS-Sicherheitslogs')
    expect(html).not.toContain('Timeline korrelieren')
  })
})
