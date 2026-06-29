/**
 * AI_CONTEXT: Vitest coverage for Obsidian-style [[wikilinks]] in video notes; protects parser behavior from regressions.
 */
import { describe, it, expect } from 'vitest'
import { extractLinks, linkTargetsMatch, normalizeLinkTarget, splitLinkSegments } from '../../utils/videoLinks'

/**
 * Wiki-Links (`[[Ziel]]`) in Video-Notizen: Erkennung der Ziele, Zerlegung in
 * Segmente für die Hervorhebung und kanonischer Ziel-Vergleich (Backlinks).
 */

describe('extractLinks', () => {
  it('erkennt [[Ziel]] und liefert das getrimmte Ziel ohne Klammern', () => {
    expect(extractLinks('siehe [[1.2]] und [[ PKI ]] dazu')).toEqual(['1.2', 'PKI'])
  })

  it('dedupliziert case-insensitiv/Whitespace und behält die erste Schreibweise', () => {
    expect(extractLinks('[[Crypto]] [[crypto]] [[ CRYPTO ]]')).toEqual(['Crypto'])
  })

  it('ignoriert leere und unvollständige Links', () => {
    expect(extractLinks('[[]] [[   ]] [[offen')).toEqual([])
    expect(extractLinks('')).toEqual([])
    expect(extractLinks('kein link hier')).toEqual([])
  })

  it('greift nicht über Zeilenumbrüche oder ]] hinaus', () => {
    expect(extractLinks('[[eins]] text [[zwei]]')).toEqual(['eins', 'zwei'])
    expect(extractLinks('[[mit\numbruch]]')).toEqual([])
  })
})

describe('splitLinkSegments', () => {
  it('trennt Normaltext und [[Link]]-Tokens (das ganze [[Ziel]] ist Link-Segment)', () => {
    expect(splitLinkSegments('siehe [[1.2]] dazu')).toEqual([
      { text: 'siehe ', isLink: false },
      { text: '[[1.2]]', isLink: true, target: '1.2' },
      { text: ' dazu', isLink: false },
    ])
  })

  it('behandelt Link am Anfang und mehrere Links', () => {
    expect(splitLinkSegments('[[a]] und [[b]]')).toEqual([
      { text: '[[a]]', isLink: true, target: 'a' },
      { text: ' und ', isLink: false },
      { text: '[[b]]', isLink: true, target: 'b' },
    ])
  })

  it('lässt leere Links als Normaltext und rekonstruiert den Originaltext verlustfrei', () => {
    expect(splitLinkSegments('kein [[]] link')).toEqual([{ text: 'kein [[]] link', isLink: false }])
    const text = 'zeile [[1.2]], ende'
    expect(splitLinkSegments(text).map(s => s.text).join('')).toBe(text)
  })
})

describe('normalizeLinkTarget / linkTargetsMatch', () => {
  it('normalisiert Whitespace und Groß-/Kleinschreibung', () => {
    expect(normalizeLinkTarget('  Incident   Response ')).toBe('incident response')
  })

  it('matcht gleiche Ziele und lehnt leere ab', () => {
    expect(linkTargetsMatch('[[1.2]]'.slice(2, -2), '1.2')).toBe(true)
    expect(linkTargetsMatch(' PKI ', 'pki')).toBe(true)
    expect(linkTargetsMatch('', 'pki')).toBe(false)
    expect(linkTargetsMatch('a', 'b')).toBe(false)
  })
})
