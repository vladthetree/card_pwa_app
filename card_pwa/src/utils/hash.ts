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
