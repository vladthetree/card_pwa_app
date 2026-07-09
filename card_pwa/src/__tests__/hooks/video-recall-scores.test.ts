/**
 * AI_CONTEXT: Vitest coverage for the per-video recall score history and the "understood?" verdict logic.
 */
import { describe, it, expect } from 'vitest'
import {
  computeRecallVerdict,
  parseRecallScores,
  videoScoreKey,
  type RecallRunResult,
} from '../../hooks/useVideoRecallScores'

function run(known: number, total: number): RecallRunResult {
  return { known, total, at: 0 }
}

describe('computeRecallVerdict — Verstanden-Empfehlung', () => {
  it('ohne Läufe: unknown', () => {
    expect(computeRecallVerdict(undefined)).toBe('unknown')
    expect(computeRecallVerdict([])).toBe('unknown')
  })

  it('letzter Lauf unter 50 %: review (Video erneut ansehen)', () => {
    expect(computeRecallVerdict([run(1, 5)])).toBe('review')
    expect(computeRecallVerdict([run(0, 4)])).toBe('review')
    // Frühere gute Läufe retten einen schwachen letzten Lauf nicht.
    expect(computeRecallVerdict([run(5, 5), run(1, 5)])).toBe('review')
  })

  it('letzter Lauf 50–79 %: almost', () => {
    expect(computeRecallVerdict([run(3, 5)])).toBe('almost')
    expect(computeRecallVerdict([run(2, 4)])).toBe('almost')
  })

  it('ab 80 % mit genügend Fragen: understood', () => {
    expect(computeRecallVerdict([run(4, 5)])).toBe('understood')
    expect(computeRecallVerdict([run(5, 5)])).toBe('understood')
  })

  it('ab 80 %, aber zu wenige Fragen (< 4): nur almost — zu dünn für ein Urteil', () => {
    expect(computeRecallVerdict([run(3, 3)])).toBe('almost')
    expect(computeRecallVerdict([run(2, 2)])).toBe('almost')
  })

  it('Glückslauf-Dämpfung: starker Lauf direkt nach einer Bruchlandung ist nur almost', () => {
    expect(computeRecallVerdict([run(1, 5), run(5, 5)])).toBe('almost')
    // War der Vorlauf solide (>= 50 %), zählt der starke Lauf voll.
    expect(computeRecallVerdict([run(3, 5), run(5, 5)])).toBe('understood')
  })
})

describe('parseRecallScores — Persistenz-Parsing', () => {
  it('leerer/kaputter Input ergibt eine leere Map', () => {
    expect(parseRecallScores(null)).toEqual({})
    expect(parseRecallScores('')).toEqual({})
    expect(parseRecallScores('not json')).toEqual({})
    expect(parseRecallScores('[1,2,3]')).toEqual({})
  })

  it('übernimmt nur valide Läufe unter 3-stelligen Video-Schlüsseln', () => {
    const raw = JSON.stringify({
      '030': [
        { known: 4, total: 5, at: 123 },
        { known: 9, total: 5, at: 124 }, // known > total → verworfen
        { known: 2, total: 0, at: 125 }, // total 0 → verworfen
      ],
      'abc': [{ known: 1, total: 2, at: 1 }], // kein Video-Schlüssel
      '031': 'nope', // kein Array
    })
    const map = parseRecallScores(raw)
    expect(Object.keys(map)).toEqual(['030'])
    expect(map['030']).toEqual([{ known: 4, total: 5, at: 123 }])
  })

  it('behält nur die letzten 5 Läufe pro Video', () => {
    const runs = Array.from({ length: 8 }, (_, i) => ({ known: i % 6, total: 5, at: i }))
    const map = parseRecallScores(JSON.stringify({ '042': runs }))
    expect(map['042']).toHaveLength(5)
    expect(map['042'][4].at).toBe(7)
  })
})

describe('videoScoreKey', () => {
  it('polstert den Index auf drei Stellen', () => {
    expect(videoScoreKey(3)).toBe('003')
    expect(videoScoreKey(42)).toBe('042')
    expect(videoScoreKey(121)).toBe('121')
  })
})
