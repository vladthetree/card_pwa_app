/**
 * AI_CONTEXT: Utility module for lab Progress; provides pure helpers for scheduling, parsing, scoring, tags, video notes, backup, or app data transformations.
 */
import { STORAGE_KEYS } from '../constants/appIdentity'
import { readStringSetFromStorage, persistStringSetToStorage } from './localStorageSet'

/**
 * Labs — "GESCHAFFT"-Fortschritt (Beleg: Liste `…23.38.26.jpeg`, Pill "4 / 71"
 * + GESCHAFFT-Badge). Persistenz lokal via localStorage; bewusst getrennt von
 * den FSRS-Lerndaten (Labs sind Szenarien, keine Karten).
 */

export function readCompletedLabs(): Set<string> {
  return readStringSetFromStorage(STORAGE_KEYS.labsCompleted)
}

export function persistCompletedLab(scenarioId: string): Set<string> {
  const completed = readCompletedLabs()
  completed.add(scenarioId)
  persistStringSetToStorage(STORAGE_KEYS.labsCompleted, completed)
  return completed
}
