/**
 * AI_CONTEXT: Vitest coverage for acronym quiz question building; protects utils behavior from regressions in the learning PWA.
 */
import { describe, expect, it } from 'vitest'
import { buildAcronymQuestions, pickAcronymQuestions, seedFrom } from '../../utils/acronymQuiz'
import { SY0701_ACRONYMS, SY0701_AMBIGUOUS_ABBRS } from '../../data/sy0701Acronyms'

describe('buildAcronymQuestions', () => {
  const questions = buildAcronymQuestions(SY0701_ACRONYMS, 42)

  it('erzeugt genau eine Frage je Akronym-Bedeutungspaar', () => {
    expect(questions).toHaveLength(SY0701_ACRONYMS.length)
  })

  it('jede Frage hat 4 eindeutige Optionen inkl. der korrekten Bedeutung', () => {
    for (const q of questions) {
      expect(q.options).toHaveLength(4)
      expect(new Set(q.options).size).toBe(4)
      expect(q.options[q.correctIndex]).toBe(q.correctMeaning)
    }
  })

  it('kein Distraktor teilt die Abkürzung der Frage (keine zweite gültige Antwort)', () => {
    const meaningsByAbbr = new Map<string, Set<string>>()
    for (const a of SY0701_ACRONYMS) {
      if (!meaningsByAbbr.has(a.abbr)) meaningsByAbbr.set(a.abbr, new Set())
      meaningsByAbbr.get(a.abbr)!.add(a.meaning)
    }
    for (const q of questions) {
      const siblingMeanings = meaningsByAbbr.get(q.abbr)!
      for (const opt of q.options) {
        if (opt === q.correctMeaning) continue
        expect(siblingMeanings.has(opt)).toBe(false)
      }
    }
  })

  it('ist deterministisch bei gleichem Seed', () => {
    const again = buildAcronymQuestions(SY0701_ACRONYMS, 42)
    expect(again).toEqual(questions)
  })

  it('liefert bei anderem Seed eine andere Options-Reihenfolge (nicht identisch)', () => {
    const other = buildAcronymQuestions(SY0701_ACRONYMS, 7)
    const sameOrderCount = questions.filter((q, i) => q.options.join('|') === other[i].options.join('|')).length
    expect(sameOrderCount).toBeLessThan(questions.length)
  })

  it('mehrdeutige Abkürzungen tragen alle einen Disambiguierungs-Hinweis', () => {
    const ambiguous = questions.filter(q => SY0701_AMBIGUOUS_ABBRS.includes(q.abbr))
    expect(ambiguous.length).toBeGreaterThan(0)
    for (const q of ambiguous) {
      expect(q.contextHint).toBeTruthy()
    }
  })
})

describe('pickAcronymQuestions', () => {
  const all = buildAcronymQuestions(SY0701_ACRONYMS, 1)

  it('zieht die angeforderte Anzahl ohne Duplikate', () => {
    const picked = pickAcronymQuestions(all, 20, 99)
    expect(picked).toHaveLength(20)
    expect(new Set(picked.map(q => q.id)).size).toBe(20)
  })

  it('deckelt auf die verfügbare Menge, wenn mehr angefordert wird als vorhanden', () => {
    const picked = pickAcronymQuestions(all, 10_000, 99)
    expect(picked).toHaveLength(all.length)
  })
})

describe('seedFrom', () => {
  it('ist stabil für denselben Text', () => {
    expect(seedFrom('2026-07-20')).toBe(seedFrom('2026-07-20'))
  })

  it('unterscheidet verschiedene Texte', () => {
    expect(seedFrom('2026-07-20')).not.toBe(seedFrom('2026-07-21'))
  })
})
