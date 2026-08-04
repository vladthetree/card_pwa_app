/**
 * AI_CONTEXT:
 * Role: Pure aggregation of the Obsidian-like tag page's derived sections — timestamps, open questions, and card ideas — across all video notes carrying one tag.
 * Used by: TagCollectionPanel (the tag page) via useMemo; kept DB/React-free so it stays unit-testable.
 * Important: Reuses extractVideoTimeAnchors + summarizeVideoNoteSignals rather than re-parsing note text; every entry keeps its source objective so the UI can link back.
 */
import { extractVideoTimeAnchors, formatVideoTime } from './videoTimeAnchors'
import { summarizeVideoNoteSignals } from './videoNoteSignals'

/** Eine Zeitmarke aus einer Notiz, verortet an ihrem Objective. */
export interface TagTimestamp {
  objective: string
  seconds: number
  /** Normalisierte Anzeige (MM:SS / H:MM:SS). */
  token: string
  /** Freitext direkt nach der Zeitmarke (Rest der Zeile). */
  label: string
  /** Video-`index` bei Mehr-Video-Objectives (`@v<index>:mm:ss`); `undefined`
   *  bei unpräfixten/alten Ankern — der Aufrufer fällt dann auf ein
   *  Standard-Video des Objectives zurück (siehe VideosView.openObjectiveAtTime). */
  videoIndex?: number
}

/** Eine extrahierte Zeile (Frage oder Kartenidee) mit ihrer Quelle. */
export interface TagNoteSignal {
  objective: string
  text: string
}

export interface TagPageSections {
  timestamps: TagTimestamp[]
  questions: TagNoteSignal[]
  cardIdeas: TagNoteSignal[]
}

/** Objective-Codes wie "1.2", "1.10" numerisch korrekt sortieren. */
function compareObjective(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  if (Number.isNaN(pa[0]) || Number.isNaN(pb[0])) return a.localeCompare(b)
  return pa[0] - pb[0] || (pa[1] ?? 0) - (pb[1] ?? 0) || a.localeCompare(b)
}

/**
 * Sammelt Zeitmarken, offene Fragen und Kartenideen aus allen Notizen eines Tags
 * in einem Durchlauf. Zeitmarken werden nach Objective und Sekunde sortiert,
 * Fragen/Kartenideen nach Objective.
 */
export function buildTagPageSections(notes: Array<{ objective: string; content: string }>): TagPageSections {
  const timestamps: TagTimestamp[] = []
  const questions: TagNoteSignal[] = []
  const cardIdeas: TagNoteSignal[] = []

  for (const note of notes) {
    for (const anchor of extractVideoTimeAnchors(note.content)) {
      const rest = note.content
        .slice(anchor.end)
        .split('\n')[0]
        .replace(/^[\s.,;:!?–—-]+/, '')
        .trim()
      timestamps.push({
        objective: note.objective,
        seconds: anchor.seconds,
        token: formatVideoTime(anchor.seconds),
        label: rest,
        ...(anchor.videoIndex !== undefined ? { videoIndex: anchor.videoIndex } : {}),
      })
    }

    const signals = summarizeVideoNoteSignals(note.content, Number.MAX_SAFE_INTEGER)
    for (const text of signals.questions) questions.push({ objective: note.objective, text })
    for (const text of signals.cardIdeas) cardIdeas.push({ objective: note.objective, text })
  }

  timestamps.sort((a, b) => compareObjective(a.objective, b.objective) || a.seconds - b.seconds)
  questions.sort((a, b) => compareObjective(a.objective, b.objective))
  cardIdeas.sort((a, b) => compareObjective(a.objective, b.objective))

  return { timestamps, questions, cardIdeas }
}
