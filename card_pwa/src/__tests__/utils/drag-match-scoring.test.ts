/**
 * AI_CONTEXT: Vitest coverage for drag match scoring; protects utils behavior from regressions in the learning PWA.
 */
import { describe, it, expect } from 'vitest'
import { parseQuestionText, parseAnswerText } from '../../utils/cardTextParser'
import { correctDragMatchKey, scoreDragMatchChoice } from '../../utils/dragMatchScoring'

/**
 * Belegte Fixture: die echte ZTNA-Karte aus dem Handy-Backup
 * `Project_Restore/card-pwa-backup-2026-06-08T21-54-32-447Z.csv` (card_id 1779669260169).
 * Dieselbe Karte ist in den Screenshots `Drag-Match1/2_enabled_Fokus_mode.jpeg` zu sehen.
 */
const ZTNA_FRONT = `Welche Bedeutung hat das Acronym 'ZTNA' im SY0-701-Kontext (Obj 1.2)?
A: Zoned Trust Network Architecture
B: Zero Trust Network Access
C: Zone-based Tunneling Network Access
D: Zero-Touch Network Authentication`

const ZTNA_BACK = `>> CORRECT: B | ZTNA = Zero Trust Network Access

Brokered Access zu Apps statt Network-Level VPN. Authentifizierung pro Session, kein impliziter Trust.

Eselsbruecke: ZTNA = wie ein Tuersteher bei jeder Tuer. Kein Generalpass wie bei VPN.

PDF-Bezug: SY0-701 Obj 1.2`

describe('dragMatchScoring (ZTNA, echtes Backup)', () => {
  const question = parseQuestionText(ZTNA_FRONT)
  const answer = parseAnswerText(ZTNA_BACK)

  it('parst alle vier Optionen und die kanonische Correct-Markierung', () => {
    expect(Object.keys(question.options)).toEqual(['A', 'B', 'C', 'D'])
    expect(question.options.B).toBe('Zero Trust Network Access')
    expect(answer.correctOptions).toEqual(['B'])
  })

  it('die kanonisch korrekte Option ist B = "Zero Trust Network Access"', () => {
    const key = correctDragMatchKey(answer)
    expect(key).toBe('B')
    expect(question.options[key]).toBe('Zero Trust Network Access')
  })

  it('richtige Wahl → 1.0, jede falsche Wahl → 0.0', () => {
    expect(scoreDragMatchChoice(answer, 'B')).toBe(1)
    for (const wrong of ['A', 'C', 'D']) {
      expect(scoreDragMatchChoice(answer, wrong)).toBe(0)
    }
  })

  it('Korrektheit hängt an der Identität, nicht am angezeigten Buchstaben', () => {
    // Im Screenshot wird die korrekte Option (kanonisch B) als "D" angezeigt,
    // weil die Optionen gemischt und nach Position neu beschriftet werden.
    // Die Bewertung bleibt trotzdem an der kanonischen Identität B hängen.
    expect(scoreDragMatchChoice(answer, correctDragMatchKey(answer))).toBe(1)
  })

  it('die Erklärung enthält den vollen Karten-Text (Kurzantwort + Eselsbruecke + PDF-Bezug)', () => {
    expect(answer.answer).toContain('ZTNA = Zero Trust Network Access')
    expect(answer.answer).toContain('Brokered Access zu Apps')
    expect(answer.answer).toContain('Eselsbruecke')
    expect(answer.answer).toContain('PDF-Bezug: SY0-701 Obj 1.2')
    // "Eselsbruecke:" (nicht "Merkhilfe:") bleibt inline in der Erklärung.
    expect(answer.merkhilfe).toBeNull()
  })
})

describe('dragMatchScoring (Randfälle)', () => {
  it('fällt auf answer.correct zurück, wenn correctOptions leer ist', () => {
    expect(scoreDragMatchChoice({ correctOptions: [], correct: 'C' }, 'C')).toBe(1)
    expect(scoreDragMatchChoice({ correctOptions: [], correct: 'C' }, 'A')).toBe(0)
  })

  it('ohne Correct-Angabe wird nichts als richtig gewertet', () => {
    expect(correctDragMatchKey({ correctOptions: [], correct: null })).toBe('')
    expect(scoreDragMatchChoice({ correctOptions: [], correct: null }, 'A')).toBe(0)
  })
})
