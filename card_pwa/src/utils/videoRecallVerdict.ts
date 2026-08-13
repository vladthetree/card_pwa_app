/**
 * AI_CONTEXT: Utility module for videoRecallVerdict; derives the "understood?"
 * verdict for a video from its recall-check run history. Pure, no I/O —
 * re-exported by hooks/useVideoRecallScores.ts, which owns the localStorage
 * persistence and the React hook around it.
 */

export interface RecallRunResult {
  /** Aus dem Gedächtnis gewusste Fragen. */
  known: number
  /** Fragen im Durchlauf. */
  total: number
  /** Zeitstempel (Date.now()). */
  at: number
}

export type VideoRecallVerdict = 'understood' | 'almost' | 'review' | 'unknown'

/** Ab so vielen Fragen gilt ein Lauf als aussagekräftig für „verstanden". */
const MIN_MEANINGFUL_TOTAL = 4

/**
 * Empfehlung aus der Lauf-Historie (letzter Lauf zählt, der davor dämpft):
 * „verstanden" verlangt einen belastbaren letzten Lauf UND keinen klaren
 * Einbruch direkt davor — gegen die Illusion eines einzelnen Glückslaufs.
 */
export function computeRecallVerdict(runs: RecallRunResult[] | undefined): VideoRecallVerdict {
  if (!runs || runs.length === 0) return 'unknown'
  const last = runs[runs.length - 1]
  const ratio = last.known / last.total
  if (ratio < 0.5) return 'review'
  if (ratio < 0.8) return 'almost'
  if (last.total < MIN_MEANINGFUL_TOTAL) return 'almost'
  const previous = runs.length > 1 ? runs[runs.length - 2] : null
  if (previous && previous.known / previous.total < 0.5) return 'almost'
  return 'understood'
}
