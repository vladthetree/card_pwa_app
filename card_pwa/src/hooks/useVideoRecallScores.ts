/**
 * AI_CONTEXT:
 * Role: LocalStorage-backed per-video recall-check score history plus the derived "understood?" verdict.
 * Used by: VideoRecallCheck (records each finished run, shows the verdict) and VideosView (verdict badge per video).
 * Important: Purely informational — must never touch FSRS/recordReview; it complements the subjective
 *            per-objective confidence with an objective per-video measurement.
 */
import { useCallback, useState } from 'react'

/**
 * Bewertungssystem für den Abruf-Check: Jedes abgeschlossene Quiz wird pro
 * Video (Playlist-Index) gespeichert. Aus der Historie leiten wir eine
 * Empfehlung ab, ob das Video verstanden wurde:
 *
 *  - `understood` : letzter Lauf ≥ 80 % bei ≥ 4 Fragen — und der Lauf davor
 *                   war keine klare Bruchlandung (< 50 %). Ein einzelner
 *                   Glückslauf direkt nach einem schwachen soll noch nicht
 *                   „verstanden" heißen.
 *  - `almost`     : 50–79 %, oder ≥ 80 % mit zu wenigen Fragen/nach einem
 *                   schwachen Vorlauf — noch einmal prüfen.
 *  - `review`     : < 50 % — Video erneut ansehen.
 *  - `unknown`    : noch kein Abruf-Check gemacht.
 *
 * Die Selbsteinschätzung pro Objective (useMesserVideoProgress) bleibt
 * unangetastet: Sie ist subjektiv und objective-weit, das hier ist die
 * objektive Messung pro Video.
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

export type RecallScoreMap = Record<string, RecallRunResult[]>

const RECALL_SCORES_STORAGE_KEY = 'card-pwa-messer-recall-scores'
/** Pro Video nur die letzten Läufe behalten — Historie, kein Log. */
const MAX_RUNS_PER_VIDEO = 5
/** Ab so vielen Fragen gilt ein Lauf als aussagekräftig für „verstanden". */
const MIN_MEANINGFUL_TOTAL = 4

export function videoScoreKey(videoIndex: number): string {
  return String(videoIndex).padStart(3, '0')
}

function isValidRun(value: unknown): value is RecallRunResult {
  const run = value as Partial<RecallRunResult> | null
  return (
    typeof run?.known === 'number' &&
    typeof run?.total === 'number' &&
    run.total > 0 &&
    run.known >= 0 &&
    run.known <= run.total
  )
}

/** Pure Parse-Logik (ohne Browser-APIs, daher direkt testbar). */
export function parseRecallScores(raw: string | null | undefined): RecallScoreMap {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const map: RecallScoreMap = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!/^\d{3}$/.test(key) || !Array.isArray(value)) continue
      const runs = value.filter(isValidRun).map(run => ({
        known: run.known,
        total: run.total,
        at: typeof run.at === 'number' ? run.at : 0,
      }))
      if (runs.length > 0) map[key] = runs.slice(-MAX_RUNS_PER_VIDEO)
    }
    return map
  } catch {
    return {}
  }
}

export function readRecallScores(): RecallScoreMap {
  if (typeof window === 'undefined') return {}
  try {
    return parseRecallScores(window.localStorage.getItem(RECALL_SCORES_STORAGE_KEY))
  } catch {
    return {}
  }
}

function persistRecallScores(map: RecallScoreMap): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(RECALL_SCORES_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Speicher voll / privater Modus — Verlauf lebt dann nur im Speicher.
  }
}

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

export function useVideoRecallScores() {
  const [scores, setScores] = useState<RecallScoreMap>(readRecallScores)

  const recordRun = useCallback((videoIndex: number, known: number, total: number) => {
    if (total <= 0 || known < 0 || known > total) return
    setScores(prev => {
      const key = videoScoreKey(videoIndex)
      const runs = [...(prev[key] ?? []), { known, total, at: Date.now() }].slice(-MAX_RUNS_PER_VIDEO)
      const next = { ...prev, [key]: runs }
      persistRecallScores(next)
      return next
    })
  }, [])

  return { scores, recordRun }
}
