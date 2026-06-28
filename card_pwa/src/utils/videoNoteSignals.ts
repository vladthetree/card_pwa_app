/**
 * AI_CONTEXT:
 * Role: Lightweight extractor for zettel-style signals in freeform video notes: questions, card ideas, and memory cues.
 * Used by: VideoNotesPanel to surface structure without forcing a template.
 * Important: This is intentionally heuristic and plain-text based; keep it forgiving and avoid introducing a rigid note schema here.
 */
/**
 * Lightweight structure extraction for freeform video notes. The note stays a
 * plain notepad, but the UI can surface useful "zettel" traces without forcing
 * a rigid template or another table.
 */

export interface VideoNoteSignalSummary {
  questions: string[]
  cardIdeas: string[]
  cues: string[]
}

type SignalBucket = keyof VideoNoteSignalSummary

const EMPTY_SUMMARY: VideoNoteSignalSummary = {
  questions: [],
  cardIdeas: [],
  cues: [],
}

function stripListMarker(line: string): string {
  return line
    .trim()
    .replace(/^[-*]\s+\[[ xX]\]\s+/, '')
    .replace(/^[-*]\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .trim()
}

function pushUnique(target: string[], value: string, limit: number): void {
  const text = value.trim()
  if (!text || target.length >= limit) return
  const key = text.toLowerCase()
  if (target.some(existing => existing.toLowerCase() === key)) return
  target.push(text)
}

function classifyLine(line: string): { bucket: SignalBucket; text: string } | null {
  const normalized = stripListMarker(line)
  if (!normalized) return null

  const prefixed = normalized.match(/^(frage|question|\?)\s*[:\-]?\s*(.+)$/i)
  if (prefixed?.[2]) return { bucket: 'questions', text: prefixed[2] }
  if (normalized.endsWith('?')) return { bucket: 'questions', text: normalized }

  const card = normalized.match(/^(karte|card|qa|q\/a|lernkarte)\s*[:\-]\s*(.+)$/i)
  if (card?.[2]) return { bucket: 'cardIdeas', text: card[2] }

  const cue = normalized.match(/^(merke|merksatz|remember|cue|note|!)\s*[:\-]?\s*(.+)$/i)
  if (cue?.[2]) return { bucket: 'cues', text: cue[2] }

  return null
}

export function summarizeVideoNoteSignals(content: string, limitPerBucket = 3): VideoNoteSignalSummary {
  if (!content.trim()) return EMPTY_SUMMARY

  const summary: VideoNoteSignalSummary = {
    questions: [],
    cardIdeas: [],
    cues: [],
  }

  for (const rawLine of content.split(/\r?\n/)) {
    const signal = classifyLine(rawLine)
    if (!signal) continue
    pushUnique(summary[signal.bucket], signal.text, limitPerBucket)
  }

  return summary
}

export function countVideoNoteSignals(summary: VideoNoteSignalSummary): number {
  return summary.questions.length + summary.cardIdeas.length + summary.cues.length
}
