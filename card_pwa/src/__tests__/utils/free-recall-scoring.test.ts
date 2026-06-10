import { describe, it, expect } from 'vitest'
import { scoreFreeRecallSelfCheck } from '../../utils/freeRecallScoring'
import { isFreeRecallCard, stripFreeRecallPrefix, getCardVariant } from '../../utils/cardVariant'

/**
 * M3 Free Recall — Erkennung + Selbstbewertungs-Score.
 * ⚠️ NEU GENERIERT, OHNE ORIGINALQUELLE (Encoding: docs/M3-free-recall.md).
 */

describe('M3 — Selbstbewertungs-Score (scoreFreeRecallSelfCheck)', () => {
  it('Gewusst → 1.0 (freie FSRS-Wahl 1–4 in StudyView)', () => {
    expect(scoreFreeRecallSelfCheck(true)).toBe(1.0)
  })

  it('Nicht gewusst → 0.0 (StudyView erzwingt Rating 1 / Again, Regel P2.2)', () => {
    expect(scoreFreeRecallSelfCheck(false)).toBe(0.0)
  })
})

describe('M3 — Erkennung (isFreeRecallCard)', () => {
  it('erkennt das RECALL:-Präfix (case-insensitive, mit Whitespace)', () => {
    expect(isFreeRecallCard('RECALL: Nenne die CIA-Triade.')).toBe(true)
    expect(isFreeRecallCard('recall:\nNenne die CIA-Triade.')).toBe(true)
    expect(isFreeRecallCard('  Recall: Nenne die CIA-Triade.')).toBe(true)
  })

  it('erkennt den Tag free-recall in gängigen Schreibweisen', () => {
    expect(isFreeRecallCard('Nenne die CIA-Triade.', ['free-recall'])).toBe(true)
    expect(isFreeRecallCard('Nenne die CIA-Triade.', ['Free-Recall'])).toBe(true)
    expect(isFreeRecallCard('Nenne die CIA-Triade.', ['free_recall'])).toBe(true)
    expect(isFreeRecallCard('Nenne die CIA-Triade.', ['Free Recall'])).toBe(true)
  })

  it('Standard-/MC-/PBQ-Karten sind kein Free-Recall', () => {
    expect(isFreeRecallCard('Welcher Port gehört zu SSH?')).toBe(false)
    expect(isFreeRecallCard('Was bedeutet RECALL im Datenschutz?', ['PBQ'])).toBe(false)
    expect(isFreeRecallCard('MATCHING:\n22 >> SSH')).toBe(false)
  })

  it('verändert die bestehende Varianten-Erkennung nicht (additiv)', () => {
    expect(getCardVariant('RECALL: Nenne die CIA-Triade.')).toBe('standard')
    expect(getCardVariant('ORDERING:\n1) a 2) b')).toBe('ordering')
  })
})

describe('M3 — Anzeige (stripFreeRecallPrefix)', () => {
  it('entfernt das Präfix für die Anzeige', () => {
    expect(stripFreeRecallPrefix('RECALL: Nenne die CIA-Triade.')).toBe('Nenne die CIA-Triade.')
    expect(stripFreeRecallPrefix('recall:\nNenne die CIA-Triade.')).toBe('Nenne die CIA-Triade.')
  })

  it('lässt Karten ohne Präfix unverändert (Tag-Variante)', () => {
    expect(stripFreeRecallPrefix('Nenne die CIA-Triade.')).toBe('Nenne die CIA-Triade.')
  })
})
