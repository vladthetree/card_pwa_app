import { describe, it, expect, afterEach, vi } from 'vitest'
import { LAB_CATEGORIES, LAB_SCENARIOS } from '../../data/labScenarios'
import { computeMatchingScore, computeOrderingScore } from '../../utils/pbqScoring'
import { readCompletedLabs, persistCompletedLab } from '../../utils/labProgress'
import { STORAGE_KEYS } from '../../constants/appIdentity'

/**
 * Labs-Inventar + Fortschritt. Struktur/Layout rekonstruiert aus den
 * Screenshots `…23.38.26/.47/.57/.39.17/.49.jpeg`; Inhalte jenseits der
 * Screenshots ⚠️ neu generiert (docs/labs.md).
 */

describe('Labs — Inventar-Integrität', () => {
  it('alle Szenario-IDs sind eindeutig', () => {
    const ids = LAB_SCENARIOS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('jedes Szenario gehört zu einer existierenden Kategorie', () => {
    const categoryIds = new Set(LAB_CATEGORIES.map(c => c.id))
    for (const scenario of LAB_SCENARIOS) {
      expect(categoryIds.has(scenario.categoryId), scenario.id).toBe(true)
    }
  })

  it('jede Kategorie hat mindestens ein Szenario', () => {
    for (const category of LAB_CATEGORIES) {
      expect(
        LAB_SCENARIOS.some(s => s.categoryId === category.id),
        category.id,
      ).toBe(true)
    }
  })

  it('Matching: jede korrekte Antwort ist in den Optionen enthalten', () => {
    for (const scenario of LAB_SCENARIOS) {
      if (scenario.interaction.type !== 'matching') continue
      for (const item of scenario.interaction.items) {
        expect(scenario.interaction.options, `${scenario.id}: ${item.left}`).toContain(item.right)
      }
    }
  })

  it('Ordering: correctOrder ist eine Permutation der Schritte', () => {
    for (const scenario of LAB_SCENARIOS) {
      if (scenario.interaction.type !== 'ordering') continue
      const { steps, correctOrder } = scenario.interaction
      expect(correctOrder.length, scenario.id).toBe(steps.length)
      expect(new Set(correctOrder).size, scenario.id).toBe(steps.length)
      for (const idx of correctOrder) {
        expect(idx >= 0 && idx < steps.length, scenario.id).toBe(true)
      }
    }
  })

  it('belegtes Geo-Block-Szenario: korrekte Lösung ergibt Score 1, Anzeige-Reihenfolge nicht', () => {
    const geoBlock = LAB_SCENARIOS.find(s => s.id === 'firewalls-geo-block')
    expect(geoBlock).toBeDefined()
    if (!geoBlock || geoBlock.interaction.type !== 'ordering') throw new Error('unexpected shape')
    const { steps, correctOrder } = geoBlock.interaction
    const solution = correctOrder.map(i => steps[i])
    expect(computeOrderingScore(solution, correctOrder, steps)).toBe(1)
    expect(computeOrderingScore(steps, correctOrder, steps)).toBeLessThan(1)
    // Hard-Beleg `…23.39.17.jpeg`: Geo-Block-DENY zuerst, dann ALLOW :443, dann implicit DENY
    expect(solution[0]).toContain('185.204.0.0/16')
    expect(solution[1]).toContain(':443')
    expect(solution[2]).toContain('DENY  ANY  ANY')
  })

  it('belegtes Control-Funktion-Szenario: vollständige Zuordnung ergibt Score 1', () => {
    const controls = LAB_SCENARIOS.find(s => s.id === 'grundlagen-control-funktion')
    expect(controls).toBeDefined()
    if (!controls || controls.interaction.type !== 'matching') throw new Error('unexpected shape')
    const correct = Object.fromEntries(controls.interaction.items.map(i => [i.left, i.right]))
    expect(computeMatchingScore(correct, controls.interaction.items)).toBe(1)
    expect(controls.interaction.items).toHaveLength(6)
  })
})

describe('Labs — GESCHAFFT-Fortschritt (localStorage)', () => {
  function stubWindowWithStorage(initial: Record<string, string> = {}) {
    const store = new Map(Object.entries(initial))
    const localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value) },
      removeItem: (key: string) => { store.delete(key) },
    }
    vi.stubGlobal('window', { localStorage } as unknown as Window & typeof globalThis)
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('liest leeren Fortschritt als leere Menge', () => {
    stubWindowWithStorage()
    expect(readCompletedLabs().size).toBe(0)
  })

  it('persistiert gelöste Szenarien (round-trip, idempotent)', () => {
    stubWindowWithStorage()
    persistCompletedLab('firewalls-geo-block')
    persistCompletedLab('firewalls-geo-block')
    persistCompletedLab('ir-nist-phasen')
    const completed = readCompletedLabs()
    expect(completed.size).toBe(2)
    expect(completed.has('firewalls-geo-block')).toBe(true)
  })

  it('ignoriert korrupte Storage-Inhalte', () => {
    stubWindowWithStorage({ [STORAGE_KEYS.labsCompleted]: '{not json' })
    expect(readCompletedLabs().size).toBe(0)
  })
})
