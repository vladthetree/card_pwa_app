/**
 * AI_CONTEXT: Vitest coverage for splash motivation quote selection.
 */
import { beforeEach, describe, it, expect } from 'vitest'
import {
  daypartSlot,
  pickLaunchMotivationQuote,
  pickMotivationQuote,
  resetLaunchMotivationQuoteCache,
} from '../../utils/motivationQuote'
import { MOTIVATION_QUOTES } from '../../data/motivationQuotes'

function createMemoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}

beforeEach(() => {
  resetLaunchMotivationQuoteCache()
})

describe('daypartSlot', () => {
  it('teilt den Tag in Vormittag / Nachmittag / Abend', () => {
    expect(daypartSlot(0)).toBe(0)
    expect(daypartSlot(10)).toBe(0)
    expect(daypartSlot(11)).toBe(1)
    expect(daypartSlot(16)).toBe(1)
    expect(daypartSlot(17)).toBe(2)
    expect(daypartSlot(23)).toBe(2)
  })
})

describe('pickLaunchMotivationQuote', () => {
  it('bleibt innerhalb desselben App-Launches stabil', () => {
    const storage = createMemoryStorage()
    const first = pickLaunchMotivationQuote('de', { random: () => 0, storage })
    const second = pickLaunchMotivationQuote('de', { random: () => 0.75, storage })

    expect(second).toEqual(first)
  })

  it('vermeidet beim nächsten App-Launch den direkt vorherigen Spruch', () => {
    const storage = createMemoryStorage()
    const first = pickLaunchMotivationQuote('de', { random: () => 0, storage })

    resetLaunchMotivationQuoteCache()
    const second = pickLaunchMotivationQuote('de', { random: () => 0, storage })

    expect(first).toEqual(MOTIVATION_QUOTES.de[0])
    expect(second).toEqual(MOTIVATION_QUOTES.de[1])
  })

  it('liefert auch ohne Storage einen gültigen Offline-Spruch', () => {
    const quote = pickLaunchMotivationQuote('en', { random: () => 0.5, storage: null })

    expect(MOTIVATION_QUOTES.en).toContainEqual(quote)
  })
})

describe('pickMotivationQuote', () => {
  it('ist deterministisch: gleicher Tag + Abschnitt = gleicher Spruch', () => {
    const a = pickMotivationQuote('de', new Date(2026, 6, 9, 9, 0))
    const b = pickMotivationQuote('de', new Date(2026, 6, 9, 10, 30))
    expect(a).toEqual(b)
  })

  it('liefert im Tagesverlauf verschiedene Sprüche (mehrere pro Tag)', () => {
    const morning = pickMotivationQuote('de', new Date(2026, 6, 9, 9, 0))
    const afternoon = pickMotivationQuote('de', new Date(2026, 6, 9, 14, 0))
    const evening = pickMotivationQuote('de', new Date(2026, 6, 9, 20, 0))
    expect(morning.title).not.toBe(afternoon.title)
    expect(afternoon.title).not.toBe(evening.title)
  })

  it('liefert für beide Sprachen gültige Sprüche aus dem Katalog', () => {
    for (const language of ['de', 'en'] as const) {
      const quote = pickMotivationQuote(language, new Date(2026, 6, 9, 12, 0))
      expect(MOTIVATION_QUOTES[language]).toContainEqual(quote)
      expect(quote.title.length).toBeGreaterThan(5)
      expect(quote.body.length).toBeGreaterThan(10)
    }
  })

  it('der Katalog ist groß genug für echte Abwechslung', () => {
    expect(MOTIVATION_QUOTES.de.length).toBeGreaterThanOrEqual(60)
    expect(MOTIVATION_QUOTES.en.length).toBe(MOTIVATION_QUOTES.de.length)
    // Keine doppelten Titel — jeder Spruch ist eigenständig.
    expect(new Set(MOTIVATION_QUOTES.de.map(q => q.title)).size).toBe(MOTIVATION_QUOTES.de.length)
  })
})
