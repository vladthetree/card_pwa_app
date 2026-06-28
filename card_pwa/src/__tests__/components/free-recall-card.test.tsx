/**
 * AI_CONTEXT: Vitest coverage for free recall card; protects components behavior from regressions in the learning PWA.
 */
import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Card } from '../../types'

/**
 * Render-/Struktur-Test für den M3-Free-Recall-Renderer.
 * ⚠️ NEU GENERIERT, OHNE ORIGINAL-SCREENSHOT (RECOVERY_LOG §4, Git-Historie
 * bis f72ffd6) — Ablauf laut
 * TODO.md: erinnern → aufdecken → selbst bewerten. Der Score-Pfad
 * (Gewusst→1.0 / Nicht gewusst→0.0) ist im Schwestertest
 * `utils/free-recall-scoring.test.ts` über den realen Code-Pfad abgedeckt.
 * Wie beim M2-Test: kein jsdom im Repo → renderToStaticMarkup.
 */

vi.mock('../../contexts/SettingsContext', async () => {
  const { STRINGS } = await import('../../i18n')
  return { STRINGS, useSettings: () => ({ settings: { language: 'de' } }) }
})

import FreeRecallCard from '../../components/FreeRecallCard'

const FRONT = `RECALL: Nenne die sechs Phasen des NIST-Incident-Response-Lebenszyklus in eigenen Worten.`
const BACK = `Preparation, Detection & Analysis, Containment, Eradication, Recovery, Lessons Learned.

Eselsbruecke: P-DA-C-E-R-L — "Pandas Dösen Auch Charmant, Eulen Ruhen Lieber".`

const card = {
  id: 'recall-1', noteId: 'n1', type: 'review', front: FRONT, back: BACK,
  extra: {}, tags: [], interval: 3, due: 20601, reps: 1, lapses: 0, queue: 2,
} as unknown as Card

function render(flipped: boolean) {
  return renderToStaticMarkup(
    createElement(FreeRecallCard, {
      card,
      flipped,
      onFlip: () => {},
      onAnswerEvaluated: () => {},
    }),
  )
}

describe('FreeRecallCard — Vorderseite (erinnern)', () => {
  const html = render(false)

  it('zeigt das FREE-RECALL-Badge und den Frage-Header', () => {
    expect(html).toContain('Free-Recall')
    expect(html).toContain('Frage')
  })

  it('zeigt die Frage ohne RECALL:-Präfix', () => {
    expect(html).toContain('Nenne die sechs Phasen')
    expect(html).not.toContain('RECALL:')
  })

  it('zeigt Erinnern-Hinweis und Aufdecken-Button, aber keine Antwort', () => {
    expect(html).toContain('Erst aus dem Gedächtnis abrufen')
    expect(html).toContain('data-testid="freerecall-reveal"')
    expect(html).toContain('Antwort aufdecken')
    expect(html).not.toContain('Lessons Learned')
  })

  it('nutzt Mono für technische UI und Sans für längere Lerntexte', () => {
    expect(html).toContain('font-mono')
    expect(html).toContain('font-sans')
  })
})

describe('FreeRecallCard — Rückseite (aufdecken + selbst bewerten)', () => {
  const html = render(true)

  it('zeigt die Antwort inkl. Merkhilfe', () => {
    expect(html).toContain('Lessons Learned')
    expect(html).toContain('Pandas Dösen Auch Charmant')
  })

  it('zeigt die Selbstbewertung mit Gewusst/Nicht-gewusst-Buttons', () => {
    expect(html).toContain('data-testid="freerecall-selfcheck"')
    expect(html).toContain('Wusstest du die Antwort?')
    expect(html).toContain('data-testid="freerecall-known"')
    expect(html).toContain('data-testid="freerecall-not-known"')
    expect(html).toContain('Gewusst')
    expect(html).toContain('Nicht gewusst')
  })
})
