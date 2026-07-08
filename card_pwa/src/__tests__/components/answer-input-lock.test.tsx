/**
 * AI_CONTEXT: Vitest coverage for answer input locking; protects components behavior from regressions in the learning PWA.
 */
import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Card } from '../../types'

/**
 * Sperr-Kontrakt „Zurückblättern ist read-only“: Sobald die Antwortseite einer
 * Karte sichtbar war (answerRevealed) oder die Karte nur angesehen wird
 * (readOnly), dürfen Antwort-Eingaben nicht mehr klickbar sein — sonst ließe
 * sich die Lösung ansehen, zurückflippen und „wissend“ beantworten (XP-Farm).
 * Kein jsdom (vitest environment: 'node') → SSR-Markup wie im Drag-Match-Test.
 */

vi.mock('framer-motion', () => {
  const FRAMER_ONLY = new Set([
    'drag', 'dragSnapToOrigin', 'dragConstraints', 'dragElastic', 'dragMomentum', 'dragTransition',
    'whileDrag', 'whileTap', 'whileHover',
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
    m: motionProxy,
    useReducedMotion: () => false,
  }
})

vi.mock('../../contexts/SettingsContext', async () => {
  const { STRINGS } = await import('../../i18n')
  return { STRINGS, useSettings: () => ({ settings: { language: 'de', questionTextSize: 'default' } }) }
})

import CardFace from '../../components/CardFace'
import DragMatchCard from '../../components/DragMatchCard'
import FreeRecallCard from '../../components/FreeRecallCard'
import { parseMcQuestion, parseMcAnswer } from '../../utils/cardTextParser'

function makeCard(front: string, back: string, overrides: Partial<Card> = {}): Card {
  return {
    id: 'c1',
    noteId: 'n1',
    type: 'new',
    front,
    back,
    extra: { acronym: '', examples: '', port: '', protocol: '' },
    tags: [],
    interval: 0,
    due: 0,
    reps: 0,
    lapses: 0,
    queue: 0,
    ...overrides,
  }
}

// 5 Optionen → Inline-MC-Renderer (Drag-Match verlangt exakt 4).
const MC_FRONT = 'Was ist 3+3?\nA) 5\nB) 6\nC) 7\nD) 8\nE) 9'
const MC_BACK = '>> CORRECT: B | Sechs ist korrekt.'

function countDisabledOptions(markup: string): number {
  return (markup.match(/<button[^>]*disabled[^>]*>/g) ?? []).length
}

describe('Antwort-Eingaben nach Aufdecken gesperrt', () => {
  it('Inline-MC: answerRevealed sperrt alle Optionen und zeigt den Sperr-Hinweis', () => {
    const card = makeCard(MC_FRONT, MC_BACK)
    const markup = renderToStaticMarkup(
      createElement(CardFace, {
        card,
        flipped: false,
        onFlip: () => {},
        answerRevealed: true,
      }),
    )
    expect(markup).toContain('Antwort aufgedeckt — Eingabe gesperrt')
    expect(countDisabledOptions(markup)).toBeGreaterThanOrEqual(5)
  })

  it('Inline-MC: ohne answerRevealed bleiben die Optionen klickbar', () => {
    const card = makeCard(MC_FRONT, MC_BACK)
    const markup = renderToStaticMarkup(
      createElement(CardFace, {
        card,
        flipped: false,
        onFlip: () => {},
      }),
    )
    expect(markup).not.toContain('Antwort aufgedeckt — Eingabe gesperrt')
    expect(countDisabledOptions(markup)).toBe(0)
  })

  it('DragMatch: inputLocked deaktiviert alle Options-Chips und ersetzt den Dropzone-Hinweis', () => {
    const front = 'Wofür steht ZTNA?\nA: Alpha\nB: Zero Trust Network Access\nC: Gamma\nD: Delta'
    const back = '>> CORRECT: B | Erklärung.'
    const card = makeCard(front, back)
    const markup = renderToStaticMarkup(
      createElement(DragMatchCard, {
        card,
        question: parseMcQuestion(front),
        answer: parseMcAnswer(back),
        flipped: false,
        onFlip: () => {},
        onAnswerEvaluated: () => {},
        inputLocked: true,
      }),
    )
    expect(markup).toContain('Antwort aufgedeckt — Eingabe gesperrt')
    expect(countDisabledOptions(markup)).toBeGreaterThanOrEqual(4)
  })

  it('FreeRecall: inputLocked sperrt die Selbstbewertung auf der Rückseite', () => {
    const card = makeCard('RECALL: Nenne die CIA-Triade.', 'Confidentiality, Integrity, Availability', { tags: ['free-recall'] })
    const markup = renderToStaticMarkup(
      createElement(FreeRecallCard, {
        card,
        flipped: true,
        onFlip: () => {},
        onAnswerEvaluated: () => {},
        inputLocked: true,
      }),
    )
    expect(countDisabledOptions(markup)).toBeGreaterThanOrEqual(2)
  })
})
