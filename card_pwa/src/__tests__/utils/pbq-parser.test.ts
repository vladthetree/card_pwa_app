/**
 * AI_CONTEXT: Vitest coverage for pbq parser; protects utils behavior from regressions in the learning PWA.
 */
import { describe, it, expect } from 'vitest'
import {
  OrderingParser,
  OrderingAnswerParser,
  MatchingParser,
  MatchingAnswerParser,
  parseQuestion,
  parseAnswer,
} from '../../utils/cardTextParser'

describe('OrderingParser', () => {
  it('erkennt ORDERING: Header', () => {
    expect(OrderingParser.isOrdering('ORDERING:\n1) Step')).toBe(true)
    expect(OrderingParser.isOrdering('ordering:\n1) Step')).toBe(true)
    expect(OrderingParser.isOrdering('Was ist HTTP?')).toBe(false)
  })

  it('extrahiert Frage und Items korrekt', () => {
    const text = `ORDERING:
Bringe die Phasen in die richtige Reihenfolge.

1) Preparation
2) Identification
3) Containment
4) Eradication`
    const result = OrderingParser.parse(text)
    expect(result.type).toBe('ordering')
    expect(result.question).toBe('Bringe die Phasen in die richtige Reihenfolge.')
    expect(result.items).toEqual(['Preparation', 'Identification', 'Containment', 'Eradication'])
  })

  it('unterstützt N. Punkt-Format neben N) Klammer', () => {
    const text = `ORDERING:
Aufgabe

1. Alpha
2. Beta
3. Gamma`
    const result = OrderingParser.parse(text)
    expect(result.items).toEqual(['Alpha', 'Beta', 'Gamma'])
  })

  it('gibt leere Items zurück bei fehlendem Header-Inhalt', () => {
    const result = OrderingParser.parse('ORDERING:')
    expect(result.items).toHaveLength(0)
  })
})

describe('OrderingAnswerParser', () => {
  it('parst CORRECT_ORDER zu 0-basierten Indizes', () => {
    const text = 'CORRECT_ORDER: 2,3,1,4\nExplanation text'
    const result = OrderingAnswerParser.parse(text)
    expect(result.type).toBe('ordering')
    expect(result.correctOrder).toEqual([1, 2, 0, 3])
    expect(result.explanation).toBe('Explanation text')
  })

  it('extrahiert Merkhilfe', () => {
    const text = 'CORRECT_ORDER: 1,2,3\nSome explanation\n\nMerkhilfe: PICERL'
    const result = OrderingAnswerParser.parse(text)
    expect(result.merkhilfe).toBe('PICERL')
    expect(result.explanation).toBe('Some explanation')
  })

  it('gibt null zurück wenn keine Merkhilfe vorhanden', () => {
    const result = OrderingAnswerParser.parse('CORRECT_ORDER: 1,2\nText')
    expect(result.merkhilfe).toBeNull()
  })
})

describe('MatchingParser', () => {
  it('erkennt MATCHING: Header', () => {
    expect(MatchingParser.isMatching('MATCHING:\nHTTP >> Layer 7')).toBe(true)
    expect(MatchingParser.isMatching('matching:\nX >> Y')).toBe(true)
    expect(MatchingParser.isMatching('Was ist HTTP?')).toBe(false)
  })

  it('extrahiert Paare mit >> Separator', () => {
    const text = `MATCHING:
Ordne Protokolle den Schichten zu.

HTTP >> Anwendungsschicht
TCP >> Transportschicht
IP >> Vermittlungsschicht`
    const result = MatchingParser.parse(text)
    expect(result.type).toBe('matching')
    expect(result.question).toBe('Ordne Protokolle den Schichten zu.')
    expect(result.pairs).toEqual([
      { left: 'HTTP', right: 'Anwendungsschicht' },
      { left: 'TCP',  right: 'Transportschicht' },
      { left: 'IP',   right: 'Vermittlungsschicht' },
    ])
  })

  it('erlaubt mehrere linke Seiten mit gleicher Kategorie', () => {
    const text = `MATCHING:
Krypto

AES >> Symmetric
3DES >> Symmetric
RSA >> Asymmetric`
    const result = MatchingParser.parse(text)
    expect(result.pairs.filter(p => p.right === 'Symmetric')).toHaveLength(2)
  })
})

describe('MatchingAnswerParser', () => {
  it('parst = Paare und Merkhilfe', () => {
    const text = `HTTP = Application layer
TCP = Transport layer

HTTP arbeitet auf der Anwendungsschicht; TCP stellt den Ende-zu-Ende-Transport bereit.

Merkhilfe: Layers 7 down`
    const result = MatchingAnswerParser.parse(text)
    expect(result.type).toBe('matching')
    expect(result.pairs).toEqual([
      { left: 'HTTP', right: 'Application layer' },
      { left: 'TCP',  right: 'Transport layer' },
    ])
    expect(result.explanation).toContain('HTTP arbeitet auf der Anwendungsschicht')
    expect(result.merkhilfe).toBe('Layers 7 down')
  })
})

describe('parseQuestion / parseAnswer dispatch', () => {
  it('dispatcht korrekt auf ordering', () => {
    const q = parseQuestion('ORDERING:\nFrage\n1) A\n2) B')
    expect(q.type).toBe('ordering')
  })

  it('dispatcht korrekt auf matching', () => {
    const q = parseQuestion('MATCHING:\nFrage\nA >> B')
    expect(q.type).toBe('matching')
  })

  it('fällt auf standard zurück', () => {
    const q = parseQuestion('Was ist DNS?')
    expect(q.type).toBe('standard')
  })

  it('parst ordering answer korrekt', () => {
    const a = parseAnswer('CORRECT_ORDER: 1,2\nText', 'ordering')
    expect(a.type).toBe('ordering')
  })

  it('parst matching answer korrekt', () => {
    const a = parseAnswer('A = B\nMerkhilfe: hint', 'matching')
    expect(a.type).toBe('matching')
  })
})
