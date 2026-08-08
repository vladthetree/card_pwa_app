/**
 * AI_CONTEXT: Vitest coverage for drag match card; protects components behavior from regressions in the learning PWA.
 */
import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Card } from '../../types'

/**
 * Render-/Struktur-Test für den M2-Drag-Match-Renderer, rekonstruiert aus
 * `Drag-Match1/2_enabled_Fokus_mode.jpeg`. Das Repo testet ohne jsdom
 * (vitest `environment: 'node'`), daher via `renderToStaticMarkup` statt
 * Testing-Library; die Auswertungs-Logik (richtig→1.0 / falsch→0.0) ist im
 * Schwestertest `utils/drag-match-scoring.test.ts` über den realen Code-Pfad
 * abgedeckt.
 */

// framer-motion in Node/SSR auf einfache DOM-Elemente mappen (kein window/matchMedia).
vi.mock('framer-motion', () => {
  const FRAMER_ONLY = new Set([
    'drag', 'dragSnapToOrigin', 'dragConstraints', 'whileDrag', 'whileTap', 'whileHover',
    'onDragStart', 'onDragEnd', 'initial', 'animate', 'exit', 'transition', 'layout', 'variants',
  ])
  const make = (tag: string) => (props: Record<string, unknown>) => {
    const clean: Record<string, unknown> = {}
    for (const key of Object.keys(props)) if (!FRAMER_ONLY.has(key)) clean[key] = props[key]
    return createElement(tag, clean)
  }
  const motionProxy = new Proxy({}, { get: (_t, tag: string) => make(tag) })
  return {
    motion: motionProxy,
    // ui/motion re-exportiert `m as motion` — der Mock muss beide Namen liefern.
    m: motionProxy,
    useReducedMotion: () => false,
  }
})

// Echte i18n-Strings, aber leichter Settings-Hook (kein DB-Kontext nötig).
vi.mock('../../contexts/SettingsContext', async () => {
  const { STRINGS } = await import('../../i18n')
  return { STRINGS, useSettings: () => ({ settings: { language: 'de' } }) }
})

import DragMatchCard from '../../components/DragMatchCard'
import { parseMcQuestion, parseMcAnswer } from '../../utils/cardTextParser'

const ZTNA_FRONT = `Which expansion describes the application-level access model abbreviated as Zero Trust Network Access (ZTNA)?
A: Zoned Trust Network Architecture
B: Zero Trust Network Access
C: Zone-based Tunneling Network Access
D: Zero-Touch Network Authentication`

const ZTNA_BACK = `>> CORRECT: B |

Zero Trust Network Access vermittelt Zugriff auf einzelne Anwendungen statt pauschal auf ein Netzwerk. Die Zugriffsprüfung erfolgt pro Sitzung ohne implizites Vertrauen.

Nicht:
A | Dieser Ausdruck ist kein etabliertes Zero-Trust-Zugriffsmodell.
C | Tunneling allein beschreibt nicht die identitätsbasierte Zugriffsentscheidung.
D | Zero-Touch-Bereitstellung ist ein anderes Konzept als Anwendungszugriff.`

const card = {
  id: '1779669260169', noteId: 'n1', type: 'review', front: ZTNA_FRONT, back: ZTNA_BACK,
  extra: {}, tags: [], interval: 3, due: 20601, reps: 1, lapses: 0, queue: 2,
} as unknown as Card

function render(flipped: boolean) {
  return renderToStaticMarkup(
    createElement(DragMatchCard, {
      card,
      question: parseMcQuestion(ZTNA_FRONT),
      answer: parseMcAnswer(ZTNA_BACK),
      flipped,
      onFlip: () => {},
      onAnswerEvaluated: () => {},
    }),
  )
}

describe('DragMatchCard — Vorderseite (rekonstruiert aus Drag-Match1)', () => {
  const html = render(false)

  it('zeigt das DRAG-MATCH-Badge und den "FRAGE"-Header', () => {
    expect(html).toContain('Drag-Match')          // dragmatch_type_badge
    expect(html).toContain('Frage')               // t.question
  })

  it('zeigt die Drag-Drop-Zone mit Hinweistext', () => {
    expect(html).toContain('Korrekte Antwort hierher ziehen')
    expect(html).toContain('data-testid="dragmatch-dropzone"')
  })

  it('zeigt die Frage und alle vier Antwort-Optionen', () => {
    expect(html).toContain('Which expansion describes')
    expect(html).toContain('Zoned Trust Network Architecture')
    expect(html).toContain('Zero Trust Network Access')
    expect(html).toContain('Zone-based Tunneling Network Access')
    expect(html).toContain('Zero-Touch Network Authentication')
  })

  it('vergibt Anzeige-Buchstaben A–D nach Position (egal wie gemischt)', () => {
    for (const letter of ['A', 'B', 'C', 'D']) {
      expect(html).toContain(`data-testid="dragmatch-option-${letter}"`)
      expect(html).toContain(`${letter})`)
    }
  })

  it('nutzt Mono für technische UI und Sans für längere Lerntexte', () => {
    expect(html).toContain('font-mono')
    expect(html).toContain('font-sans')
  })
})

describe('DragMatchCard — Rückseite (Erklärung)', () => {
  it('zeigt richtige Lösung, deutsche Erklärung und alle Distraktorerklärungen ohne Quellen-Metatext', () => {
    const html = render(true)
    expect(html).toContain('RICHTIG: Zero Trust Network Access')
    expect(html).toContain('vermittelt Zugriff auf einzelne Anwendungen')
    expect(html).toContain('Warum nicht?')
    expect(html).toContain('Tunneling allein beschreibt nicht')
    expect(html).not.toContain('PDF-Bezug')
  })
})
