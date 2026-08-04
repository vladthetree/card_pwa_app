/**
 * AI_CONTEXT:
 * Role: Pure rendering-segment helpers for the video note editor's #tag/[[link]] highlight overlay and caret-anchored autocomplete popover.
 * Used by: VideoNotesPanel (backdrop highlight + tag-suggestion popover positioning).
 * Important: DB/React-free so the offset math (used to anchor the popover to the caret) stays isolated and testable.
 */
import { splitTagSegments } from './videoTags'
import { splitLinkSegments } from './videoLinks'

export type RenderSegment = { text: string; kind: 'text' | 'tag' | 'link' }

/**
 * Vereint Tag- und Wiki-Link-Hervorhebung zu einer Segmentliste für das
 * Backdrop-Overlay: erst nach `#tags` trennen, Resttext nach `[[links]]`.
 */
export function buildRenderSegments(content: string): RenderSegment[] {
  const out: RenderSegment[] = []
  for (const seg of splitTagSegments(content)) {
    if (seg.isTag) {
      out.push({ text: seg.text, kind: 'tag' })
      continue
    }
    for (const piece of splitLinkSegments(seg.text)) {
      out.push({ text: piece.text, kind: piece.isLink ? 'link' : 'text' })
    }
  }
  return out
}

/**
 * Teilt eine Segmentliste an einem Zeichen-Offset (z. B. der Cursorposition) in
 * `before`/`after`. Damit lässt sich zwischen beiden ein unsichtbarer Marker
 * einfügen, um die reale Bildschirmposition des Cursors zu messen (Popover-
 * Ankerung fürs Tag-Autocomplete — funktioniert identisch auf allen Plattformen,
 * weil sie am tatsächlich gerenderten Layout misst statt es nachzubauen).
 */
export function splitSegmentsAtOffset(
  segments: RenderSegment[],
  offset: number,
): { before: RenderSegment[]; after: RenderSegment[] } {
  const before: RenderSegment[] = []
  const after: RenderSegment[] = []
  let consumed = 0
  for (const seg of segments) {
    const start = consumed
    const end = consumed + seg.text.length
    consumed = end
    if (end <= offset) {
      before.push(seg)
      continue
    }
    if (start >= offset) {
      after.push(seg)
      continue
    }
    const cut = offset - start
    before.push({ ...seg, text: seg.text.slice(0, cut) })
    after.push({ ...seg, text: seg.text.slice(cut) })
  }
  return { before, after }
}
