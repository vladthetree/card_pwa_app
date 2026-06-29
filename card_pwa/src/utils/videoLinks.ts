/**
 * AI_CONTEXT:
 * Role: Pure parser for Obsidian-style `[[wikilinks]]` in video notes — extraction, segmentation for highlighting, and target matching.
 * Used by: VideoNotesPanel highlighting + link/backlink chips, videoNotes backlink query.
 * Important: Link targets are usually objective codes ("1.2"); keep this DB/React-free and match via normalizeLinkTarget (trim + collapse whitespace + lowercase).
 */
/**
 * Wiki-Links für Video-Notizen. Im Notiztext als `[[Ziel]]` gesetzt — das Ziel
 * ist in der Regel ein Objective-Code (z. B. `[[1.2]]`), kann aber auch ein
 * freier Begriff sein. Wie die Tags ist dies bewusst ein reiner Plaintext-Parser
 * (kein DB-/React-Import), damit er isoliert testbar bleibt und dieselbe
 * Overlay-Hervorhebung wie `#tags` bedienen kann.
 */

// `[[Ziel]]` — beliebiger Inhalt außer Klammern/Zeilenumbruch; greift nicht über
// Zeilen hinweg und nicht über `]]` hinaus.
const WIKILINK_PATTERN = /\[\[([^[\]\n]+)\]\]/g

/** Kanonisches Link-Ziel für Vergleiche: getrimmt, Whitespace zusammengefasst,
 *  klein. `[[ 1.2 ]]` matcht damit Objective `1.2`. */
export function normalizeLinkTarget(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

/** Prüft, ob zwei Link-Ziele dasselbe meinen (beide nicht leer). */
export function linkTargetsMatch(a: string, b: string): boolean {
  const left = normalizeLinkTarget(a)
  const right = normalizeLinkTarget(b)
  return left !== '' && left === right
}

/**
 * Alle `[[Ziel]]`-Ziele aus einem Notiztext (ohne Klammern), dedupliziert über
 * `normalizeLinkTarget` (erste Schreibweise gewinnt), Reihenfolge des Auftretens.
 */
export function extractLinks(content: string): string[] {
  if (!content) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const match of content.matchAll(WIKILINK_PATTERN)) {
    const raw = (match[1] ?? '').trim()
    if (!raw) continue
    const key = normalizeLinkTarget(raw)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(raw)
  }
  return result
}

export interface LinkSegment {
  text: string
  isLink: boolean
  /** Bei `isLink`: das Ziel ohne `[[ ]]`. */
  target?: string
}

/**
 * Zerlegt einen Textabschnitt in Normaltext- und `[[Link]]`-Segmente — für die
 * farbige Hervorhebung der Links im Notizzettel. Das ganze `[[Ziel]]` (inkl.
 * Klammern) ist ein Link-Segment; leere `[[]]` bleiben Normaltext.
 */
export function splitLinkSegments(content: string): LinkSegment[] {
  if (!content) return []
  const segments: LinkSegment[] = []
  let cursor = 0
  for (const match of content.matchAll(WIKILINK_PATTERN)) {
    const raw = (match[1] ?? '').trim()
    if (!raw) continue
    const matchStart = match.index ?? 0
    if (matchStart > cursor) segments.push({ text: content.slice(cursor, matchStart), isLink: false })
    segments.push({ text: match[0], isLink: true, target: raw })
    cursor = matchStart + match[0].length
  }
  if (cursor < content.length) segments.push({ text: content.slice(cursor), isLink: false })
  return segments
}
