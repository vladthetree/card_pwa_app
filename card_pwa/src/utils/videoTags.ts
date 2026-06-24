/**
 * Inline-Tags für Video-Notizen. Tags werden direkt im Notiztext als `#tag`
 * gesetzt und beim Tippen erkannt — sie sind die Quelle der Verknüpfung zwischen
 * Videos und Lernkarten (Obsidian-artige Tag-Links). Diese Datei ist bewusst
 * rein (kein DB-/React-Import), damit sie isoliert testbar bleibt.
 */

// `#tag` nur am Wortanfang (Zeilenanfang oder nach Whitespace), damit `a#b`,
// `10:30#x` o. ä. NICHT fälschlich greifen. Unicode-fähig (Umlaute), erlaubt
// Buchstaben/Ziffern/Unterstrich/Bindestrich im Tag.
const TAG_PATTERN = /(^|\s)#([\p{L}\p{N}_-]+)/gu

/**
 * Alle Inline-Tags aus einem Notiztext, ohne führendes `#`. Dedupliziert
 * case-insensitiv (erste Schreibweise gewinnt), Reihenfolge des Auftretens.
 */
export function extractTags(content: string): string[] {
  if (!content) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const match of content.matchAll(TAG_PATTERN)) {
    const tag = match[2]
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(tag)
  }
  return result
}

export interface TagSegment {
  text: string
  isTag: boolean
}

export interface RelatedTagStats {
  tag: string
  count: number
}

/**
 * Zerlegt einen Notiztext in Segmente aus Normaltext und `#tag`-Tokens — für die
 * farbige Hervorhebung der Tags im Notizzettel (Obsidian-Stil). Nur das `#tag`
 * selbst ist ein Tag-Segment; führender Whitespace bleibt Normaltext.
 */
export function splitTagSegments(content: string): TagSegment[] {
  if (!content) return []
  const segments: TagSegment[] = []
  let cursor = 0
  for (const match of content.matchAll(TAG_PATTERN)) {
    const lead = match[1] ?? ''
    const matchStart = match.index ?? 0
    const tagStart = matchStart + lead.length
    if (tagStart > cursor) segments.push({ text: content.slice(cursor, tagStart), isTag: false })
    const tagText = content.slice(tagStart, matchStart + match[0].length)
    segments.push({ text: tagText, isTag: true })
    cursor = matchStart + match[0].length
  }
  if (cursor < content.length) segments.push({ text: content.slice(cursor), isTag: false })
  return segments
}

/**
 * Ermittelt Tags, die gemeinsam mit `activeTag` in denselben Video-Notizen
 * auftauchen. Pro Notiz zählt ein verwandter Tag nur einmal.
 */
export function collectRelatedTags(
  rows: Array<{ tags: string[] }>,
  activeTag: string,
  limit = 8,
): RelatedTagStats[] {
  const activeKey = activeTag.trim().toLowerCase()
  if (!activeKey) return []

  const counts = new Map<string, RelatedTagStats>()
  for (const row of rows) {
    const hasActiveTag = row.tags.some(tag => tag.trim().toLowerCase() === activeKey)
    if (!hasActiveTag) continue

    const seenInRow = new Set<string>()
    for (const rawTag of row.tags) {
      const tag = rawTag.trim()
      const key = tag.toLowerCase()
      if (!tag || key === activeKey || seenInRow.has(key)) continue
      seenInRow.add(key)

      const existing = counts.get(key)
      if (existing) existing.count += 1
      else counts.set(key, { tag, count: 1 })
    }
  }

  return Array.from(counts.values())
    .sort((a, b) => (b.count - a.count) || a.tag.localeCompare(b.tag))
    .slice(0, limit)
}
