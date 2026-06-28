/**
 * AI_CONTEXT: Vitest coverage for video note signals; protects utils behavior from regressions in the learning PWA.
 */
import { describe, expect, it } from 'vitest'
import { countVideoNoteSignals, summarizeVideoNoteSignals } from '../../utils/videoNoteSignals'

describe('summarizeVideoNoteSignals', () => {
  it('zieht Fragen aus Prefixen und Fragezeichen heraus', () => {
    expect(summarizeVideoNoteSignals('Frage: Was ist Kerberos?\nWarum ist TGT wichtig?').questions).toEqual([
      'Was ist Kerberos?',
      'Warum ist TGT wichtig?',
    ])
  })

  it('erkennt Kartenideen und Merksätze aus freien Zettelzeilen', () => {
    const summary = summarizeVideoNoteSignals(`
      - Karte: CIA Triad -> Confidentiality, Integrity, Availability
      Merke: Watcher-Knoten erst nach Logging prüfen
      * [ ] card: TLS handshake -> ClientHello bis Finished
    `)

    expect(summary.cardIdeas).toEqual([
      'CIA Triad -> Confidentiality, Integrity, Availability',
      'TLS handshake -> ClientHello bis Finished',
    ])
    expect(summary.cues).toEqual(['Watcher-Knoten erst nach Logging prüfen'])
  })

  it('dedupliziert und zählt die erkannten Spuren', () => {
    const summary = summarizeVideoNoteSignals('Frage: Was ist PKI?\n? Was ist PKI?\n! Zertifikatkette prüfen')

    expect(summary.questions).toEqual(['Was ist PKI?'])
    expect(countVideoNoteSignals(summary)).toBe(2)
  })
})
