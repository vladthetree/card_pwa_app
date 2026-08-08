/**
 * AI_CONTEXT: Vitest coverage for card back solution display; protects that the
 * correct answer is always visible on the answer side of interactive cards.
 */
import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Card } from '../../types'

/**
 * Regressionstests (Nutzer-Report 2026-07-07): Bei falsch beantworteten Karten
 * fehlte teils die richtige Antwort. Das Vorderseiten-Feedback verschwindet
 * nach dem Auto-Flip — die Rückseite muss die Lösung daher IMMER tragen:
 *  - OrderingCard-Rückseite: korrekte Reihenfolge als Liste (#1…#n)
 *  - CardFace-MC-Rückseite: "Richtig: …"-Banner auch ohne getippte Option
 * Wie in drag-match-card.test.tsx: node-Environment, daher renderToStaticMarkup.
 */

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
  return { motion: motionProxy, m: motionProxy, useReducedMotion: () => false }
})

vi.mock('../../contexts/SettingsContext', async () => {
  const { STRINGS } = await import('../../i18n')
  return {
    STRINGS,
    useSettings: () => ({ settings: { language: 'de', questionTextSize: 'default' } }),
  }
})

vi.mock('../../hooks/useHandsetLayout', () => ({
  useHandsetLayout: () => ({ isHandsetLayout: true, isHandsetLandscape: false }),
}))

import OrderingCard from '../../components/OrderingCard'
import CardFace from '../../components/CardFace'
import IncorrectReasonsSection from '../../components/IncorrectReasonsSection'
import { AnswerParser, OrderingParser, OrderingAnswerParser, QuestionParser } from '../../utils/cardTextParser'

const ORDERING_FRONT = `ORDERING: Sortiere die OSI-Schichten von unten nach oben
1. Physical
2. Data Link
3. Network
4. Transport`

const ORDERING_BACK = `CORRECT_ORDER: 1,2,3,4
Vom Kabel zum Ende-zu-Ende-Transport.`

const MC_FRONT = `Which city is the capital of France?
A) Berlin
B) Paris
C) Madrid
D) Rome`

const MC_BACK = `>> CORRECT: B |

Paris ist die Hauptstadt Frankreichs.

Nicht:
A | Berlin ist die Hauptstadt Deutschlands.
C | Madrid ist die Hauptstadt Spaniens.
D | Rom ist die Hauptstadt Italiens.`

const baseCard = {
  id: 'c1', noteId: 'n1', type: 'new', extra: {}, tags: [],
  interval: 0, due: 0, reps: 0, lapses: 0, queue: 0,
} as unknown as Card

describe('OrderingCard — Rückseite trägt die Lösung', () => {
  it('zeigt die korrekte Reihenfolge als nummerierte Liste, auch ohne Submit', () => {
    const html = renderToStaticMarkup(
      createElement(OrderingCard, {
        card: { ...baseCard, front: ORDERING_FRONT, back: ORDERING_BACK },
        question: OrderingParser.parse(ORDERING_FRONT),
        answer: OrderingAnswerParser.parse(ORDERING_BACK),
        flipped: true,
        onFlip: () => {},
        onAnswerEvaluated: () => {},
      }),
    )
    expect(html).toContain('#1')
    expect(html).toContain('Physical')
    expect(html).toContain('#4')
    expect(html).toContain('Transport')
    // Reihenfolge der Lösung: Physical vor Transport
    expect(html.indexOf('Physical')).toBeLessThan(html.indexOf('Transport'))
  })
})

describe('CardFace (MC) — Rückseite trägt die Lösung', () => {
  it('zeigt das "Richtig:"-Banner auch, wenn keine Option getippt wurde', () => {
    const html = renderToStaticMarkup(
      createElement(CardFace, {
        card: { ...baseCard, front: MC_FRONT, back: MC_BACK },
        flipped: true,
        onFlip: () => {},
        useDragMatchMode: false,
      }),
    )
    expect(html).toContain('RICHTIG:')
    expect(html).toContain('Paris')
    expect(html).toContain('Warum richtig?')
    expect(html).toContain('Warum nicht?')
    expect(html).toContain('Berlin ist die Hauptstadt Deutschlands.')
    // Ohne Antwort darf kein "Falsch:"-Banner erscheinen
    expect(html).not.toContain('FALSCH:')
  })

  it('hebt die kanonisch gewählte falsche Option in den Distraktorerklärungen hervor', () => {
    const html = renderToStaticMarkup(
      createElement(IncorrectReasonsSection, {
        answer: AnswerParser.parse(MC_BACK),
        options: QuestionParser.parse(MC_FRONT).options,
        selectedKey: 'A',
      }),
    )

    expect(html).toContain('data-selected-wrong-option="true"')
    expect(html).toContain('Berlin ist die Hauptstadt Deutschlands.')
  })
})
