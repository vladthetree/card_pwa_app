/**
 * AI_CONTEXT: Vitest coverage for messer video progress; protects hooks behavior from regressions in the learning PWA.
 */
import { describe, it, expect } from 'vitest'
import {
  parseVideoProgress,
  resolveVideoStatus,
  suggestConfidence,
  type MesserVideoProgress,
} from '../../hooks/useMesserVideoProgress'

/**
 * Lernfortschritt der Professor-Messer-Videos. Die Speicher-/Statuslogik ist
 * bewusst als pure Funktion ausgelegt (kein localStorage), damit sie ohne
 * Browser-Umgebung deterministisch testbar ist.
 *
 * Pädagogischer Kern: Schauen ≠ Können. Bloßes Öffnen darf nie als „sicher"
 * gelten — das war die Fluency-Illusion des alten binären „GESEHEN".
 */

describe('parseVideoProgress — Speicherformat & Migration', () => {
  it('liefert für leere/fehlende Eingaben ein leeres Objekt', () => {
    expect(parseVideoProgress(null)).toEqual({})
    expect(parseVideoProgress(undefined)).toEqual({})
    expect(parseVideoProgress('')).toEqual({})
  })

  it('migriert das Legacy-Array („gesehen") zu watched=true ohne Konfidenz', () => {
    const map = parseVideoProgress(JSON.stringify(['1.1', '2.3']))
    expect(map['1.1']).toEqual({ watched: true, confidence: null, updatedAt: 0 })
    expect(map['2.3']).toEqual({ watched: true, confidence: null, updatedAt: 0 })
  })

  it('ignoriert Nicht-String-Einträge im Legacy-Array', () => {
    const map = parseVideoProgress(JSON.stringify(['1.1', 42, null, { x: 1 }]))
    expect(Object.keys(map)).toEqual(['1.1'])
  })

  it('liest das aktuelle Objektformat typsicher und füllt Defaults', () => {
    const raw = JSON.stringify({
      '1.2': { watched: true, confidence: 'solid', updatedAt: 1700 },
      '3.1': { watched: true },
    })
    const map = parseVideoProgress(raw)
    expect(map['1.2']).toEqual({ watched: true, confidence: 'solid', updatedAt: 1700 })
    expect(map['3.1']).toEqual({ watched: true, confidence: null, updatedAt: 0 })
  })

  it('verwirft ungültige Konfidenzwerte zu null', () => {
    const raw = JSON.stringify({ '4.4': { watched: true, confidence: 'super-sicher' } })
    expect(parseVideoProgress(raw)['4.4'].confidence).toBeNull()
  })

  it('liefert bei kaputtem JSON oder Primitiven ein leeres Objekt', () => {
    expect(parseVideoProgress('{nope')).toEqual({})
    expect(parseVideoProgress('42')).toEqual({})
    expect(parseVideoProgress('"foo"')).toEqual({})
  })
})

describe('resolveVideoStatus — Status-Auflösung (Schauen ≠ Können)', () => {
  const entry = (over: Partial<MesserVideoProgress>): MesserVideoProgress => ({
    watched: false,
    confidence: null,
    updatedAt: 0,
    ...over,
  })

  it('ist ohne Eintrag „open"', () => {
    expect(resolveVideoStatus(undefined)).toBe('open')
  })

  it('ist bei reinem Schauen nur „watched" — nie „solid"', () => {
    const status = resolveVideoStatus(entry({ watched: true }))
    expect(status).toBe('watched')
    expect(status).not.toBe('solid')
  })

  it('spiegelt die Selbsteinschätzung, sobald gesetzt', () => {
    expect(resolveVideoStatus(entry({ watched: true, confidence: 'gaps' }))).toBe('gaps')
    expect(resolveVideoStatus(entry({ watched: true, confidence: 'ok' }))).toBe('ok')
    expect(resolveVideoStatus(entry({ watched: true, confidence: 'solid' }))).toBe('solid')
  })

  it('lässt Konfidenz Vorrang vor watched haben', () => {
    expect(resolveVideoStatus(entry({ watched: false, confidence: 'solid' }))).toBe('solid')
  })
})

describe('suggestConfidence — Vorschlag aus dem Abruf-Score', () => {
  it('schlägt ohne Karten neutral „ok" vor', () => {
    expect(suggestConfidence(0, 0)).toBe('ok')
  })

  it('vergibt „solid" ab 80 % (inkl. Grenze)', () => {
    expect(suggestConfidence(7, 7)).toBe('solid')
    expect(suggestConfidence(4, 5)).toBe('solid') // exakt 0.8
  })

  it('vergibt „ok" zwischen 50 % und 80 % (inkl. unterer Grenze)', () => {
    expect(suggestConfidence(1, 2)).toBe('ok') // exakt 0.5
    expect(suggestConfidence(5, 7)).toBe('ok') // ~0.71
  })

  it('vergibt „gaps" unter 50 %', () => {
    expect(suggestConfidence(2, 5)).toBe('gaps')
    expect(suggestConfidence(0, 3)).toBe('gaps')
  })
})
