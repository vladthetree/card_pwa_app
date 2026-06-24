import { describe, it, expect } from 'vitest'
import { collectRelatedTags, extractTags, splitTagSegments } from '../../utils/videoTags'

/**
 * Inline-Tags (`#tag`) in Video-Notizen: Erkennung am Wortanfang und Zerlegung
 * in Segmente für die farbige Hervorhebung.
 */

describe('extractTags', () => {
  it('erkennt #tags am Wortanfang', () => {
    expect(extractTags('lerne #crypto und #cloud heute')).toEqual(['crypto', 'cloud'])
  })

  it('erkennt einen Tag am Zeilen-/String-Anfang und nach Zeilenumbruch', () => {
    expect(extractTags('#start in der mitte')).toEqual(['start'])
    expect(extractTags('zeile eins\n#zwei')).toEqual(['zwei'])
  })

  it('greift NICHT mitten im Wort (a#b, URLs mit Fragment)', () => {
    expect(extractTags('a#b text')).toEqual([])
    expect(extractTags('siehe http://example.com#frag')).toEqual([])
    expect(extractTags('##doppelt')).toEqual([])
  })

  it('dedupliziert case-insensitiv und behält die erste Schreibweise', () => {
    expect(extractTags('#Crypto #crypto #CRYPTO')).toEqual(['Crypto'])
  })

  it('unterstützt Umlaute, Ziffern, Unterstrich und Bindestrich', () => {
    expect(extractTags('#Verschlüsselung #sy0-701 #abc_def #1')).toEqual([
      'Verschlüsselung',
      'sy0-701',
      'abc_def',
      '1',
    ])
  })

  it('stoppt an Satzzeichen und liefert bei fehlenden Tags eine leere Liste', () => {
    expect(extractTags('ende #tag, danach #bar.')).toEqual(['tag', 'bar'])
    expect(extractTags('')).toEqual([])
    expect(extractTags('kein tag hier')).toEqual([])
  })
})

describe('splitTagSegments', () => {
  it('trennt Normaltext und #tag-Tokens (nur das #tag ist Tag-Segment)', () => {
    expect(splitTagSegments('lerne #crypto heute')).toEqual([
      { text: 'lerne ', isTag: false },
      { text: '#crypto', isTag: true },
      { text: ' heute', isTag: false },
    ])
  })

  it('behandelt Tag am Anfang und mehrere Tags', () => {
    expect(splitTagSegments('#a und #b')).toEqual([
      { text: '#a', isTag: true },
      { text: ' und ', isTag: false },
      { text: '#b', isTag: true },
    ])
  })

  it('lässt Text ohne Tags zusammenhängend und Leertext leer', () => {
    expect(splitTagSegments('kein tag')).toEqual([{ text: 'kein tag', isTag: false }])
    expect(splitTagSegments('')).toEqual([])
  })

  it('rekonstruiert den Originaltext verlustfrei (inkl. Zeilenumbruch)', () => {
    const text = 'zeile\n#tag, ende'
    expect(splitTagSegments(text).map(s => s.text).join('')).toBe(text)
  })
})

describe('collectRelatedTags', () => {
  it('zählt Tags, die gemeinsam mit dem aktiven Tag in Notizen vorkommen', () => {
    const related = collectRelatedTags(
      [
        { tags: ['crypto', 'pki', 'tls'] },
        { tags: ['Crypto', 'pki', 'iam'] },
        { tags: ['cloud', 'iam'] },
      ],
      'crypto',
      8,
    )
    expect(related).toEqual([
      { tag: 'pki', count: 2 },
      { tag: 'iam', count: 1 },
      { tag: 'tls', count: 1 },
    ])
  })

  it('zählt denselben verwandten Tag pro Notiz nur einmal und begrenzt das Ergebnis', () => {
    const related = collectRelatedTags(
      [
        { tags: ['risk', 'audit', 'audit', 'governance'] },
        { tags: ['risk', 'compliance'] },
      ],
      'risk',
      2,
    )
    expect(related).toEqual([
      { tag: 'audit', count: 1 },
      { tag: 'compliance', count: 1 },
    ])
  })

  it('liefert bei leerem aktivem Tag keine verwandten Tags', () => {
    expect(collectRelatedTags([{ tags: ['a', 'b'] }], '')).toEqual([])
  })
})
