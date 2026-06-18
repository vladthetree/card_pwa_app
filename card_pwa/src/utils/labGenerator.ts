/**
 * Lab-Generator — erzeugt aus den validierten Pools in `data/labBlueprints.ts`
 * deterministisch (seeded PRNG) konkrete LabScenario-Instanzen fuer das
 * Trainings-Feature der Labs.
 *
 * Eigenschaften:
 * - Deterministisch: gleicher Blueprint + Seed => identisches Szenario; der
 *   Seed steckt in der Szenario-ID (`gen-<blueprint>-<seed>`).
 * - Eindeutig loesbar per Konstruktion (siehe Invarianten in labBlueprints.ts).
 * - Anti-Dopplung: jede Instanz hat eine kanonische Signatur (gezogene
 *   Paar-Menge bzw. Schritt-Auswahl + Parametersatz); bereits geloeste
 *   Signaturen werden bei `generateFreshLab` ausgeschlossen. Distraktor- und
 *   Anzeige-Mischung zaehlen bewusst NICHT zur Identitaet.
 * - Kapazitaet ist berechenbar (`countTotalVariants`), Tests erzwingen >= 9999.
 */

import {
  LAB_BLUEPRINTS,
  getLabBlueprintsByCategory,
  type LabBlueprint,
  type LabMatchingBlueprint,
  type LabOrderingBlueprint,
} from '../data/labBlueprints'
import type { LabDifficulty, LabScenario } from '../data/labScenarios'

export const GENERATED_LAB_ID_PREFIX = 'gen-'

export interface GeneratedLab {
  scenario: LabScenario
  /** Kanonische Inhalts-Signatur fuer Anti-Dopplung/Fortschritt. */
  signature: string
  blueprintId: string
  seed: number
}

// ── Seeded PRNG (mulberry32) ─────────────────────────────────────────────────

function strHash(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function rngInt(rng: () => number, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive)
}

function shuffled<T>(rng: () => number, input: readonly T[]): T[] {
  const out = [...input]
  for (let i = out.length - 1; i > 0; i--) {
    const j = rngInt(rng, i + 1)
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

/** k eindeutige Indizes aus 0..n-1, aufsteigend sortiert. */
function sampleIndices(rng: () => number, n: number, k: number): number[] {
  const all = shuffled(rng, Array.from({ length: n }, (_v, i) => i))
  return all.slice(0, k).sort((a, b) => a - b)
}

// ── Hilfen ───────────────────────────────────────────────────────────────────

function applyParams(text: string, params?: Record<string, string>): string {
  if (!params) return text
  return text.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => params[key] ?? _m)
}

function difficultyForSize(size: number): LabDifficulty {
  if (size <= 4) return 'einsteiger'
  if (size === 5) return 'fortgeschritten'
  return 'experte'
}

function minutesForSize(size: number): number {
  if (size <= 4) return 3
  if (size === 5) return 4
  return 5
}

function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  let result = 1
  for (let i = 0; i < k; i++) result = (result * (n - i)) / (i + 1)
  return Math.round(result)
}

// ── Generierung ──────────────────────────────────────────────────────────────

function generateMatching(blueprint: LabMatchingBlueprint, seed: number, rng: () => number): GeneratedLab {
  const span = blueprint.draw.max - blueprint.draw.min + 1
  const k = blueprint.draw.min + rngInt(rng, span)
  const drawn = sampleIndices(rng, blueprint.pairs.length, k)
  const items = shuffled(rng, drawn.map(i => blueprint.pairs[i]))

  const unusedRights = blueprint.pairs
    .filter((_pair, i) => !drawn.includes(i))
    .map(pair => pair.right)
  const distractorCount = Math.min(
    blueprint.maxDistractors,
    unusedRights.length,
    1 + rngInt(rng, Math.max(1, blueprint.maxDistractors)),
  )
  const distractors = shuffled(rng, unusedRights).slice(0, distractorCount)
  const options = shuffled(rng, [...items.map(item => item.right), ...distractors])

  const scenario: LabScenario = {
    id: `${GENERATED_LAB_ID_PREFIX}${blueprint.id}-${seed}`,
    categoryId: blueprint.categoryId,
    title: blueprint.titles[rngInt(rng, blueprint.titles.length)],
    objective: blueprint.objective,
    difficulty: difficultyForSize(k),
    minutes: minutesForSize(k),
    description: blueprint.description,
    interaction: { type: 'matching', items, options },
  }
  return {
    scenario,
    signature: `${blueprint.id}:${drawn.join(',')}`,
    blueprintId: blueprint.id,
    seed,
  }
}

function generateOrdering(blueprint: LabOrderingBlueprint, seed: number, rng: () => number): GeneratedLab {
  const paramIndex = blueprint.paramSets ? rngInt(rng, blueprint.paramSets.length) : -1
  const params = paramIndex >= 0 ? blueprint.paramSets?.[paramIndex] : undefined

  let chosen: number[]
  if (blueprint.sampleSteps) {
    const span = blueprint.sampleSteps.max - blueprint.sampleSteps.min + 1
    const k = blueprint.sampleSteps.min + rngInt(rng, span)
    chosen = sampleIndices(rng, blueprint.steps.length, k)
  } else {
    chosen = blueprint.steps.map((_s, i) => i)
  }
  const resolved = chosen.map(i => applyParams(blueprint.steps[i], params))

  // Anzeige-Permutation; nie die Loesungs-Reihenfolge selbst zeigen.
  let display = shuffled(rng, resolved.map((_s, i) => i))
  let attempts = 0
  while (display.every((value, index) => value === index) && attempts < 8) {
    display = shuffled(rng, display)
    attempts++
  }
  if (display.every((value, index) => value === index)) {
    display = display.map((_v, i) => (i + 1) % display.length)
  }
  const steps = display.map(i => resolved[i])
  const correctOrder = resolved.map((_s, p) => display.indexOf(p))

  const scenario: LabScenario = {
    id: `${GENERATED_LAB_ID_PREFIX}${blueprint.id}-${seed}`,
    categoryId: blueprint.categoryId,
    title: applyParams(blueprint.titles[rngInt(rng, blueprint.titles.length)], params),
    objective: blueprint.objective,
    difficulty: blueprint.difficulty ?? difficultyForSize(chosen.length),
    minutes: minutesForSize(chosen.length),
    description: applyParams(blueprint.description, params),
    ...(blueprint.goal ? { goal: applyParams(blueprint.goal, params) } : {}),
    ...(blueprint.topology ? { topology: applyParams(blueprint.topology, params) } : {}),
    interaction: { type: 'ordering', steps, correctOrder },
  }
  return {
    scenario,
    signature: `${blueprint.id}:${chosen.join(',')}@${paramIndex}`,
    blueprintId: blueprint.id,
    seed,
  }
}

export function generateLab(blueprint: LabBlueprint, seed: number): GeneratedLab {
  const rng = mulberry32((seed ^ strHash(blueprint.id)) >>> 0)
  return blueprint.kind === 'matching'
    ? generateMatching(blueprint, seed, rng)
    : generateOrdering(blueprint, seed, rng)
}

/**
 * Frische Trainings-Instanz fuer eine Kategorie: bevorzugt Signaturen, die
 * noch nicht geloest wurden. Blueprints werden kapazitaetsgewichtet gewaehlt.
 */
export function generateFreshLab(
  categoryId: string,
  excludeSignatures: ReadonlySet<string>,
  randomSeed: () => number = () => Math.floor(Math.random() * 0x7fffffff),
): GeneratedLab | null {
  const blueprints = getLabBlueprintsByCategory(categoryId)
  if (blueprints.length === 0) return null

  const weights = blueprints.map(countBlueprintVariants)
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)

  let fallback: GeneratedLab | null = null
  for (let attempt = 0; attempt < 48; attempt++) {
    const seed = randomSeed() >>> 0
    let pickValue = (seed / 0xffffffff) * totalWeight
    let blueprint = blueprints[blueprints.length - 1]
    for (let i = 0; i < blueprints.length; i++) {
      pickValue -= weights[i]
      if (pickValue < 0) {
        blueprint = blueprints[i]
        break
      }
    }
    const generated = generateLab(blueprint, seed)
    if (!excludeSignatures.has(generated.signature)) return generated
    fallback = generated
  }
  // Pool praktisch erschoepft: lieber eine Wiederholung als gar nichts.
  return fallback
}

// ── Kapazitaet ───────────────────────────────────────────────────────────────

export function countBlueprintVariants(blueprint: LabBlueprint): number {
  if (blueprint.kind === 'matching') {
    let total = 0
    for (let k = blueprint.draw.min; k <= blueprint.draw.max; k++) {
      total += binomial(blueprint.pairs.length, k)
    }
    return total
  }
  const paramVariants = blueprint.paramSets?.length ?? 1
  if (!blueprint.sampleSteps) return paramVariants
  let subsets = 0
  for (let k = blueprint.sampleSteps.min; k <= blueprint.sampleSteps.max; k++) {
    subsets += binomial(blueprint.steps.length, k)
  }
  return subsets * paramVariants
}

export function countCategoryVariants(categoryId: string): number {
  return getLabBlueprintsByCategory(categoryId).reduce(
    (sum, blueprint) => sum + countBlueprintVariants(blueprint),
    0,
  )
}

export function countTotalVariants(): number {
  return LAB_BLUEPRINTS.reduce((sum, blueprint) => sum + countBlueprintVariants(blueprint), 0)
}
