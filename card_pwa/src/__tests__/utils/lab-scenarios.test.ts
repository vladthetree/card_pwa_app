import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  LAB_CATEGORIES,
  LAB_SCENARIOS,
  LAB_SCENARIO_SOURCE_REFS,
  LAB_SOURCES,
  LAB_TARGET_INVENTORY,
  getLabScenarioSources,
} from '../../data/labScenarios'
import { computeMatchingScore, computeOrderingScore } from '../../utils/pbqScoring'
import { readCompletedLabs, persistCompletedLab } from '../../utils/labProgress'
import { STORAGE_KEYS } from '../../constants/appIdentity'

/**
 * Labs-Inventar + Fortschritt. Struktur/Layout rekonstruiert aus den
 * Screenshots `…23.38.26/.47/.57/.39.17/.49.jpeg`; Inhalte jenseits der
 * Screenshots ⚠️ neu generiert (docs/labs.md).
 */

describe('Labs — Inventar-Integrität', () => {
  it('Inventar ist auf den 100er-Zielstand ausgebaut (Ausbau ueber den belegten 71er-Stand hinaus)', () => {
    expect(LAB_SCENARIOS.length).toBe(LAB_TARGET_INVENTORY)
    expect(LAB_TARGET_INVENTORY).toBe(100)
  })

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

  it('Zielverteilung deckt alle Kategorien ab und betont Firewalls/Incident Response', () => {
    const counts = new Map<string, number>()
    for (const scenario of LAB_SCENARIOS) counts.set(scenario.categoryId, (counts.get(scenario.categoryId) ?? 0) + 1)
    expect(counts.get('firewalls')).toBe(14)
    expect(counts.get('incident-response')).toBe(14)
    expect(counts.get('betrieb')).toBe(12)
    for (const category of LAB_CATEGORIES) {
      expect(counts.get(category.id) ?? 0, category.id).toBeGreaterThanOrEqual(9)
    }
  })

  it('Security-Operations-Kategorie deckt die Domain-4-Luecken 4.1–4.4 und 4.7 ab', () => {
    const betriebObjectives = new Set(
      LAB_SCENARIOS.filter(s => s.categoryId === 'betrieb').map(s => s.objective.split(' ')[0]),
    )
    for (const objective of ['4.1', '4.2', '4.3', '4.4', '4.7']) {
      expect(betriebObjectives.has(objective), objective).toBe(true)
    }
  })

  it('jedes Szenario ist mit oeffentlichen Quellen belegbar', () => {
    const scenarioIds = new Set(LAB_SCENARIOS.map(s => s.id))
    const sourceIds = new Set(LAB_SOURCES.map(s => s.id))
    expect(new Set(LAB_SOURCES.map(s => s.id)).size).toBe(LAB_SOURCES.length)

    for (const source of LAB_SOURCES) {
      expect(source.url.startsWith('https://'), source.id).toBe(true)
      expect(source.publisher.length, source.id).toBeGreaterThan(2)
      expect(source.accessed, source.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(source.note.length, source.id).toBeGreaterThan(20)
    }

    for (const scenario of LAB_SCENARIOS) {
      const refs = LAB_SCENARIO_SOURCE_REFS[scenario.id]
      expect(refs?.length ?? 0, scenario.id).toBeGreaterThanOrEqual(2)
      expect(refs, scenario.id).toContain('comptia-sy0-701-objectives')
      expect(getLabScenarioSources(scenario.id).length, scenario.id).toBe(refs.length)
      for (const sourceId of refs) expect(sourceIds.has(sourceId), `${scenario.id}: ${sourceId}`).toBe(true)
    }

    for (const scenarioId of Object.keys(LAB_SCENARIO_SOURCE_REFS)) {
      expect(scenarioIds.has(scenarioId), scenarioId).toBe(true)
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

  it('Ordering: Anzeige-Reihenfolge ist nicht bereits die Loesung', () => {
    for (const scenario of LAB_SCENARIOS) {
      if (scenario.interaction.type !== 'ordering') continue
      const identity = scenario.interaction.steps.map((_step, index) => index)
      expect(scenario.interaction.correctOrder, scenario.id).not.toEqual(identity)
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
