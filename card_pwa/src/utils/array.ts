/**
 * AI_CONTEXT: Utility module for array; tiny array helpers shared across
 * batched Dexie writes (import pipeline, algorithm migration).
 */
export function chunkArray<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}
