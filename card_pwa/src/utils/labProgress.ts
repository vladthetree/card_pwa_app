/**
 * AI_CONTEXT: Utility module for lab Progress; provides pure helpers for scheduling, parsing, scoring, tags, video notes, backup, or app data transformations.
 */
import { STORAGE_KEYS } from '../constants/appIdentity'

/**
 * Labs — "GESCHAFFT"-Fortschritt (Beleg: Liste `…23.38.26.jpeg`, Pill "4 / 71"
 * + GESCHAFFT-Badge). Persistenz lokal via localStorage; bewusst getrennt von
 * den FSRS-Lerndaten (Labs sind Szenarien, keine Karten).
 */

export function readCompletedLabs(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.labsCompleted)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

export function persistCompletedLab(scenarioId: string): Set<string> {
  const completed = readCompletedLabs()
  completed.add(scenarioId)
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEYS.labsCompleted, JSON.stringify(Array.from(completed)))
    } catch {
      // localStorage voll/blockiert: Fortschritt geht nur für diese Session verloren.
    }
  }
  return completed
}
