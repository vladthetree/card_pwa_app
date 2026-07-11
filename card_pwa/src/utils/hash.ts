/**
 * AI_CONTEXT: Utility module for hash; provides pure helpers for scheduling, parsing, scoring, tags, video notes, backup, or app data transformations.
 */
/**
 * FNV-1a 32-bit hash. Deterministic and dependency-free — used to derive
 * stable per-run orderings from a seed without pulling in a PRNG library.
 * Returns an unsigned 32-bit integer.
 */
export function fnv1a32(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** Same hash mapped to the unit interval [0, 1]. */
export function fnv1aUnit(input: string): number {
  return fnv1a32(input) / 0xffffffff
}

/**
 * Deterministischer Fisher-Yates-Shuffle: gleiche Seed-Eingabe → gleiche
 * Reihenfolge. Für Antwortoptionen (MC/Matching/Ordering/DragMatch), damit
 * ein Reload/Resume mitten in der Karte die Optionsreihenfolge nicht ändert
 * (Seed z. B. `${card.id}:${card.front}`).
 */
export function seededShuffle<T>(seed: string, items: readonly T[]): T[] {
  const result = [...items]
  // mulberry32, initialisiert aus dem FNV-Hash des Seeds.
  let state = fnv1a32(seed) || 1
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1))
    const tmp = result[i]
    result[i] = result[j]
    result[j] = tmp
  }
  return result
}
