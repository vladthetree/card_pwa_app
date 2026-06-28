/**
 * AI_CONTEXT:
 * Role: Canonical tag identity helpers shared by flashcards and video notes.
 * Used by: videoTags, tagSuggestions, videoNotes queries, deck tag queries, backup restore, and tag collection matching.
 * Important: Display labels may keep user spelling, but comparisons must use normalizeTagId so spaces, underscores, dashes, case, and # prefixes match.
 */
/**
 * Gemeinsame Tag-Identitaet fuer Karten- und Video-Notiz-Tags. Anzeigeformen
 * duerfen frei bleiben, aber Vergleiche laufen ueber eine stabile, kanonische ID.
 */

const SEPARATOR_PATTERN = /[\s_-]+/g

export function stripTagPrefix(value: string): string {
  return value.trim().replace(/^#+/, '')
}

export function normalizeTagId(value: string): string {
  return stripTagPrefix(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(SEPARATOR_PATTERN, '-')
    .replace(/^-+|-+$/g, '')
}

export function tagsMatch(a: string, b: string): boolean {
  const left = normalizeTagId(a)
  const right = normalizeTagId(b)
  return left !== '' && left === right
}

export function uniqueByTagId(tags: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const raw of tags) {
    const tag = stripTagPrefix(raw)
    const id = normalizeTagId(tag)
    if (!tag || !id || seen.has(id)) continue
    seen.add(id)
    result.push(tag)
  }

  return result
}

export function toInlineTag(value: string): string {
  return stripTagPrefix(value)
    .normalize('NFKC')
    .replace(SEPARATOR_PATTERN, '-')
    .replace(/^-+|-+$/g, '')
}
