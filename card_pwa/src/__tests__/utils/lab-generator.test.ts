/**
 * AI_CONTEXT: Vitest coverage for lab generator; protects utils behavior from regressions in the learning PWA.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { LAB_BLUEPRINTS, getLabBlueprintsByCategory } from '../../data/labBlueprints'
import { LAB_CATEGORIES, LAB_SCENARIOS, LAB_SOURCES } from '../../data/labScenarios'
import {
  GENERATED_LAB_ID_PREFIX,
  countBlueprintVariants,
  countCategoryVariants,
  countTotalVariants,
  generateFreshLab,
  generateLab,
} from '../../utils/labGenerator'
import { readTrainingSolved, persistTrainingSolved } from '../../utils/labTraining'
import { computeMatchingScore, computeOrderingScore } from '../../utils/pbqScoring'
import { STORAGE_KEYS } from '../../constants/appIdentity'

/**
 * Trainings-Generator: Blueprints (validierte Pools) + seeded Kombinatorik.
 * Diese Tests erzwingen die Eindeutigkeits-Invarianten aus labBlueprints.ts,
 * Determinismus, strukturelle Gueltigkeit ueber viele Seeds sowie die
 * Zielkapazitaet (>= 9999 unterscheidbare Uebungs-Labs).
 */

// 24 coprime-spaced seeds exercise every blueprint with 312 generated
// scenarios. Variant-capacity tests below cover the full combinatorial range,
// so generating 780 scenarios here only repeated the same invariants.
const SAMPLE_SEEDS = Array.from({ length: 24 }, (_v, i) => i * 7919 + 13)

describe('Lab-Blueprints — Pool-Invarianten', () => {
  it('IDs eindeutig, Kategorien existieren, jede Kategorie hat einen Blueprint', () => {
    const ids = LAB_BLUEPRINTS.map(bp => bp.id)
    expect(new Set(ids).size).toBe(ids.length)

    const categoryIds = new Set(LAB_CATEGORIES.map(c => c.id))
    for (const bp of LAB_BLUEPRINTS) {
      expect(categoryIds.has(bp.categoryId), bp.id).toBe(true)
    }
    for (const category of LAB_CATEGORIES) {
      expect(getLabBlueprintsByCategory(category.id).length, category.id).toBeGreaterThanOrEqual(1)
    }
  })

  it('jeder Blueprint nennt mindestens zwei existierende Quellen inkl. CompTIA-Objectives', () => {
    const sourceIds = new Set(LAB_SOURCES.map(s => s.id))
    for (const bp of LAB_BLUEPRINTS) {
      expect(bp.sourceIds.length, bp.id).toBeGreaterThanOrEqual(2)
      expect(bp.sourceIds, bp.id).toContain('comptia-sy0-701-objectives')
      for (const sourceId of bp.sourceIds) {
        expect(sourceIds.has(sourceId), `${bp.id}: ${sourceId}`).toBe(true)
      }
    }
  })

  it('Matching-Pools: lefts/rights eindeutig, Draw-Bereich gueltig', () => {
    for (const bp of LAB_BLUEPRINTS) {
      if (bp.kind !== 'matching') continue
      const lefts = bp.pairs.map(p => p.left)
      const rights = bp.pairs.map(p => p.right)
      expect(new Set(lefts).size, bp.id).toBe(lefts.length)
      expect(new Set(rights).size, bp.id).toBe(rights.length)
      expect(bp.draw.min, bp.id).toBeGreaterThanOrEqual(3)
      expect(bp.draw.max, bp.id).toBeLessThanOrEqual(6)
      expect(bp.draw.max, bp.id).toBeLessThanOrEqual(bp.pairs.length - 1) // Platz fuer Distraktoren
      expect(bp.pairs.length, bp.id).toBeGreaterThanOrEqual(10)
    }
  })

  it('Blueprint-Paare doppeln keine kuratierten Szenario-Paare (Anti-Dopplung)', () => {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9äöüß]/g, '')
    const curatedLefts = new Set<string>()
    const curatedRights = new Set<string>()
    for (const scenario of LAB_SCENARIOS) {
      if (scenario.interaction.type !== 'matching') continue
      for (const item of scenario.interaction.items) {
        curatedLefts.add(norm(item.left))
        curatedRights.add(norm(item.right))
      }
    }
    for (const bp of LAB_BLUEPRINTS) {
      if (bp.kind !== 'matching') continue
      for (const pair of bp.pairs) {
        expect(curatedLefts.has(norm(pair.left)), `${bp.id}: left "${pair.left}"`).toBe(false)
        expect(curatedRights.has(norm(pair.right)), `${bp.id}: right "${pair.right}"`).toBe(false)
      }
    }
  })

  it('Firewall-Regelkette: jede Parametrisierung ist streng geschachtelt (badHost ∈ branchNet ⊂ regionNet)', () => {
    const toInt = (ip: string) => ip.split('.').reduce((acc, octet) => ((acc << 8) + Number(octet)) >>> 0, 0)
    const inCidr = (ip: string, cidr: string) => {
      const [net, bitsStr] = cidr.split('/')
      const bits = Number(bitsStr)
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0
      return (toInt(ip) & mask) === (toInt(net) & mask)
    }
    const cidrStrictlyInCidr = (inner: string, outer: string) => {
      const [innerNet, innerBits] = inner.split('/')
      return Number(innerBits) > Number(outer.split('/')[1]) && inCidr(innerNet, outer)
    }
    const bp = LAB_BLUEPRINTS.find(b => b.id === 'firewalls-regelkette')
    expect(bp).toBeDefined()
    if (!bp || bp.kind !== 'ordering') throw new Error('unexpected shape')
    expect(bp.paramSets?.length ?? 0).toBeGreaterThan(0)
    for (const params of bp.paramSets ?? []) {
      expect(inCidr(params.badHost, params.branchNet), `${params.service}: badHost ∈ branchNet`).toBe(true)
      expect(cidrStrictlyInCidr(params.branchNet, params.regionNet), `${params.service}: branchNet ⊂ regionNet`).toBe(true)
      expect(inCidr(params.srvIp, params.regionNet), `${params.service}: srvIp darf nicht im Quell-Netz liegen`).toBe(false)
    }
  })

  it('Ordering-Blueprints: Schritte eindeutig, Parameter-Slots vollstaendig aufloesbar', () => {
    for (const bp of LAB_BLUEPRINTS) {
      if (bp.kind !== 'ordering') continue
      expect(new Set(bp.steps).size, bp.id).toBe(bp.steps.length)
      if (bp.sampleSteps) {
        expect(bp.sampleSteps.min, bp.id).toBeGreaterThanOrEqual(3)
        expect(bp.sampleSteps.max, bp.id).toBeLessThanOrEqual(bp.steps.length)
      }
      const slots = new Set<string>()
      const texts = [bp.description, bp.goal ?? '', bp.topology ?? '', ...bp.titles, ...bp.steps]
      for (const text of texts) {
        for (const match of text.matchAll(/\{\{(\w+)\}\}/g)) slots.add(match[1])
      }
      if (slots.size > 0) {
        expect(bp.paramSets?.length ?? 0, bp.id).toBeGreaterThan(0)
        for (const params of bp.paramSets ?? []) {
          for (const slot of slots) {
            expect(typeof params[slot], `${bp.id}: {{${slot}}}`).toBe('string')
          }
        }
      }
    }
  })
})

describe('Lab-Generator — Instanzen', () => {
  it('deterministisch: gleicher Seed liefert identisches Szenario und gleiche Signatur', () => {
    for (const bp of LAB_BLUEPRINTS) {
      const a = generateLab(bp, 4711)
      const b = generateLab(bp, 4711)
      expect(a.scenario, bp.id).toEqual(b.scenario)
      expect(a.signature, bp.id).toBe(b.signature)
    }
  })

  it('generierte Szenarien sind strukturell gueltig und mit Score 1 loesbar', () => {
    for (const bp of LAB_BLUEPRINTS) {
      for (const seed of SAMPLE_SEEDS) {
        const { scenario } = generateLab(bp, seed)
        expect(scenario.id.startsWith(GENERATED_LAB_ID_PREFIX), bp.id).toBe(true)
        expect(scenario.categoryId, bp.id).toBe(bp.categoryId)
        const blob = JSON.stringify(scenario)
        expect(blob.includes('{{'), `${bp.id}@${seed}: unaufgeloester Platzhalter`).toBe(false)

        if (scenario.interaction.type === 'matching') {
          const { items, options } = scenario.interaction
          expect(new Set(options).size, bp.id).toBe(options.length)
          for (const item of items) {
            expect(options, `${bp.id}@${seed}: ${item.left}`).toContain(item.right)
          }
          expect(options.length, bp.id).toBeGreaterThan(items.length) // mind. 1 Distraktor
          const correct = Object.fromEntries(items.map(i => [i.left, i.right]))
          expect(computeMatchingScore(correct, items), `${bp.id}@${seed}`).toBe(1)
        } else if (scenario.interaction.type === 'ordering') {
          const { steps, correctOrder } = scenario.interaction
          expect(new Set(steps).size, bp.id).toBe(steps.length)
          expect(correctOrder.length, bp.id).toBe(steps.length)
          expect(new Set(correctOrder).size, bp.id).toBe(steps.length)
          const identity = steps.map((_s, i) => i)
          expect(correctOrder, `${bp.id}@${seed}: Anzeige = Loesung`).not.toEqual(identity)
          const solution = correctOrder.map(i => steps[i])
          expect(computeOrderingScore(solution, correctOrder, steps), `${bp.id}@${seed}`).toBe(1)
          expect(computeOrderingScore(steps, correctOrder, steps), `${bp.id}@${seed}`).toBeLessThan(1)
        }
      }
    }
  })

  it('Regelketten-Instanz: Loesung folgt der geschachtelten First-Match-Logik', () => {
    const bp = LAB_BLUEPRINTS.find(b => b.id === 'firewalls-regelkette')
    expect(bp).toBeDefined()
    if (!bp || bp.kind !== 'ordering') throw new Error('unexpected shape')
    const { scenario } = generateLab(bp, 99)
    if (scenario.interaction.type !== 'ordering') throw new Error('unexpected shape')
    const solution = scenario.interaction.correctOrder.map(i => scenario.interaction.type === 'ordering' ? scenario.interaction.steps[i] : '')
    expect(solution[0]).toMatch(/^DENY {2}TCP/)
    expect(solution[1]).toMatch(/^ALLOW TCP/)
    expect(solution[solution.length - 1]).toContain('DENY  ANY ANY')
  })

  it('Seeds erzeugen ueberwiegend unterschiedliche Signaturen (keine Massen-Dopplung)', () => {
    for (const bp of LAB_BLUEPRINTS) {
      const signatures = new Set(SAMPLE_SEEDS.map(seed => generateLab(bp, seed).signature))
      const capacity = countBlueprintVariants(bp)
      const expectedMin = Math.min(SAMPLE_SEEDS.length * 0.5, capacity * 0.5)
      expect(signatures.size, bp.id).toBeGreaterThanOrEqual(Math.floor(expectedMin))
    }
  })

  it('generierte IDs kollidieren nie mit kuratierten Szenario-IDs', () => {
    for (const scenario of LAB_SCENARIOS) {
      expect(scenario.id.startsWith(GENERATED_LAB_ID_PREFIX), scenario.id).toBe(false)
    }
  })
})

describe('Lab-Generator — Kapazitaet & Anti-Dopplung', () => {
  it('Gesamtkapazitaet >= 9999 unterscheidbare Uebungs-Labs', () => {
    expect(countTotalVariants()).toBeGreaterThanOrEqual(9999)
  })

  it('jede Kategorie hat >= 300 unterscheidbare Varianten', () => {
    for (const category of LAB_CATEGORIES) {
      expect(countCategoryVariants(category.id), category.id).toBeGreaterThanOrEqual(300)
    }
  })

  it('generateFreshLab meidet bereits geloeste Signaturen', () => {
    let counter = 1
    const nextSeed = () => (counter += 1009)
    const first = generateFreshLab('grundlagen', new Set(), nextSeed)
    expect(first).not.toBeNull()
    const exclude = new Set([first!.signature])
    for (let i = 0; i < 20; i++) {
      const next = generateFreshLab('grundlagen', exclude, nextSeed)
      expect(next).not.toBeNull()
      expect(exclude.has(next!.signature)).toBe(false)
    }
  })

  it('generateFreshLab liefert null fuer unbekannte Kategorien', () => {
    expect(generateFreshLab('gibt-es-nicht', new Set())).toBeNull()
  })
})

describe('Labs-Training — Fortschritt (localStorage)', () => {
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
    expect(readTrainingSolved().size).toBe(0)
  })

  it('persistiert Signaturen idempotent und getrennt vom kuratierten Fortschritt', () => {
    stubWindowWithStorage()
    persistTrainingSolved('grundlagen-begriffe:0,2,5,7')
    persistTrainingSolved('grundlagen-begriffe:0,2,5,7')
    persistTrainingSolved('ir-volatility-drill:1,2,4,6@3')
    const solved = readTrainingSolved()
    expect(solved.size).toBe(2)
    expect(window.localStorage.getItem(STORAGE_KEYS.labsCompleted)).toBeNull()
  })

  it('ignoriert korrupte Storage-Inhalte', () => {
    stubWindowWithStorage({ [STORAGE_KEYS.labsTrainingSolved]: '{kaputt' })
    expect(readTrainingSolved().size).toBe(0)
  })
})
