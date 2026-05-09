/**
 * Pure scoring functions for PBQ (Performance-Based Question) card types.
 * Extracted here so they can be unit-tested independently of the React components.
 */

/**
 * Ordering score: count positions where the user's item matches the correct item.
 * Returns a value in [0, 1].
 */
export function computeOrderingScore(
  userOrder: string[],
  correctOrder: number[],
  originalItems: string[],
): number {
  const correctItems = correctOrder.map(i => originalItems[i])
  if (correctItems.length === 0) return 0
  let correct = 0
  for (let i = 0; i < correctItems.length; i++) {
    if (userOrder[i] === correctItems[i]) correct++
  }
  return correct / correctItems.length
}

/**
 * Matching score: count left→right pairs the user got right.
 * Returns a value in [0, 1].
 */
export function computeMatchingScore(
  connections: Record<string, string>,
  correctPairs: Array<{ left: string; right: string }>,
): number {
  if (correctPairs.length === 0) return 0
  let correct = 0
  for (const { left, right } of correctPairs) {
    if (connections[left] === right) correct++
  }
  return correct / correctPairs.length
}
