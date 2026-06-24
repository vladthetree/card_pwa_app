import { describe, it, expect } from 'vitest'
import { filterTagSuggestions, findTagDraftAtCursor, insertSuggestedTag } from '../../utils/tagSuggestions'

/**
 * Tag-Empfehlungen aus bestehenden Tags bei der Vergabe im Notizzettel.
 */

const ALL = ['Crypto', 'Cloud', 'IAM', 'Incident Response', 'Risk', 'Compliance']

describe('filterTagSuggestions', () => {
  it('schlägt ohne Eingabe alle noch nicht gesetzten Tags vor (bis Limit)', () => {
    expect(filterTagSuggestions(ALL, [], '', 100)).toEqual(ALL)
  })

  it('schließt bereits gesetzte Tags aus (case-insensitiv)', () => {
    expect(filterTagSuggestions(ALL, ['crypto', 'RISK'], '', 100)).toEqual([
      'Cloud',
      'IAM',
      'Incident Response',
      'Compliance',
    ])
  })

  it('filtert per Teilstring, Groß-/Kleinschreibung egal', () => {
    expect(filterTagSuggestions(ALL, [], 'co', 100)).toEqual(['Compliance'])
    // "Incident Response" enthält ebenfalls ein "c".
    expect(filterTagSuggestions(ALL, [], 'c', 100)).toEqual(['Crypto', 'Cloud', 'Incident Response', 'Compliance'])
  })

  it('begrenzt die Anzahl der Empfehlungen', () => {
    expect(filterTagSuggestions(ALL, [], '', 2)).toEqual(['Crypto', 'Cloud'])
  })

  it('liefert eine leere Liste, wenn nichts passt', () => {
    expect(filterTagSuggestions(ALL, [], 'zzz', 8)).toEqual([])
  })
})

describe('findTagDraftAtCursor', () => {
  it('erkennt den gerade getippten Tag links vom Cursor', () => {
    const text = 'Notiz zu #cr'
    expect(findTagDraftAtCursor(text, text.length)).toEqual({
      start: 9,
      end: 12,
      query: 'cr',
    })
  })

  it('liefert null, wenn links vom Cursor kein Tag-Entwurf steht', () => {
    expect(findTagDraftAtCursor('Notiz ohne Tag', 8)).toBeNull()
    expect(findTagDraftAtCursor('a#b', 3)).toBeNull()
  })
})

describe('insertSuggestedTag', () => {
  it('ersetzt einen Tag-Entwurf und setzt den Cursor hinter den eingefügten Tag', () => {
    const next = insertSuggestedTag('Notiz zu #cr', 12, 'Crypto')
    expect(next).toEqual({
      content: 'Notiz zu #Crypto ',
      cursor: 17,
    })
  })

  it('fügt ohne Entwurf einen neuen Tag mit passendem Abstand ein', () => {
    const next = insertSuggestedTag('Notiz', 5, 'Cloud')
    expect(next).toEqual({
      content: 'Notiz #Cloud ',
      cursor: 13,
    })
  })

  it('macht Leerzeichen in Vorschlägen inline-tag-kompatibel', () => {
    expect(insertSuggestedTag('', 0, 'Incident Response').content).toBe('#Incident-Response ')
  })
})
