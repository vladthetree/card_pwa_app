/**
 * AI_CONTEXT:
 * Role: Pure cursor-aware helper for suggesting and inserting existing #tags while editing a video note.
 * Used by: VideoNotesPanel autocomplete UI.
 * Important: It replaces only the draft token at the cursor when possible and formats inserted tags through toInlineTag.
 */
import { normalizeTagId, toInlineTag } from './tagIdentity'

/**
 * Empfehlungen aus bestehenden Tags bei der Tag-Vergabe (Notizzettel).
 * Reine Funktion: schließt bereits gesetzte Tags aus, filtert nach Eingabe
 * (Teilstring, Groß-/Kleinschreibung egal) und begrenzt die Anzahl.
 */

const TAG_DRAFT_PATTERN = /(^|\s)#([\p{L}\p{N}_-]*)$/u
const WORDISH_START_PATTERN = /^[\p{L}\p{N}_#-]/u

export interface TagDraft {
  start: number
  end: number
  query: string
}

export function filterTagSuggestions(
  allTags: string[],
  currentTags: string[],
  input: string,
  limit = 8,
): string[] {
  const taken = new Set(currentTags.map(normalizeTagId).filter(Boolean))
  const query = normalizeTagId(input)
  const result: string[] = []
  for (const tag of allTags) {
    const tagId = normalizeTagId(tag)
    if (!tagId || taken.has(tagId)) continue
    if (query !== '' && !tagId.includes(query)) continue
    result.push(tag)
    if (result.length >= limit) break
  }
  return result
}

/** Erkennt den unvollständigen `#tag` direkt links vom Cursor. */
export function findTagDraftAtCursor(content: string, cursor: number): TagDraft | null {
  const safeCursor = Math.max(0, Math.min(cursor, content.length))
  const beforeCursor = content.slice(0, safeCursor)
  const match = beforeCursor.match(TAG_DRAFT_PATTERN)
  if (!match || match.index === undefined) return null
  const leadingWhitespace = match[1] ?? ''
  const start = match.index + leadingWhitespace.length
  return {
    start,
    end: safeCursor,
    query: match[2] ?? '',
  }
}

/**
 * Fügt einen vorgeschlagenen Tag an der Cursorposition ein. Wenn links vom
 * Cursor gerade `#cr` steht, wird nur dieser Entwurf ersetzt; sonst wird der Tag
 * als neuer Token mit passendem Abstand eingefügt.
 */
export function insertSuggestedTag(
  content: string,
  cursor: number,
  tag: string,
): { content: string; cursor: number } {
  const inlineTag = toInlineTag(tag)
  if (!inlineTag) return { content, cursor: Math.max(0, Math.min(cursor, content.length)) }

  const safeCursor = Math.max(0, Math.min(cursor, content.length))
  const token = `#${inlineTag}`
  const draft = findTagDraftAtCursor(content, safeCursor)

  if (draft) {
    const after = content.slice(draft.end)
    const trailing = after.length === 0 || WORDISH_START_PATTERN.test(after) ? ' ' : ''
    const next = `${content.slice(0, draft.start)}${token}${trailing}${after}`
    return { content: next, cursor: draft.start + token.length + trailing.length }
  }

  const before = content.slice(0, safeCursor)
  const after = content.slice(safeCursor)
  const leading = before.length > 0 && !/\s$/.test(before) ? ' ' : ''
  const trailing = after.length === 0 || WORDISH_START_PATTERN.test(after) ? ' ' : ''
  const next = `${before}${leading}${token}${trailing}${after}`
  return { content: next, cursor: before.length + leading.length + token.length + trailing.length }
}
