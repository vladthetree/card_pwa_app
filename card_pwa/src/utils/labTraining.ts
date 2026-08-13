/**
 * AI_CONTEXT: Utility module for lab Training; provides pure helpers for scheduling, parsing, scoring, tags, video notes, backup, or app data transformations.
 */
import { STORAGE_KEYS } from '../constants/appIdentity'
import { readStringSetFromStorage, persistStringSetToStorage } from './localStorageSet'

/**
 * Labs-Training — Fortschritt der generierten Uebungs-Labs. Persistiert werden
 * die kanonischen Inhalts-Signaturen (`utils/labGenerator.ts`), bewusst
 * getrennt vom GESCHAFFT-Fortschritt der kuratierten Szenarien
 * (`labProgress.ts`), damit die belegte "x / 100"-Pill sauber bleibt.
 * Geloeste Signaturen werden beim Generieren ausgeschlossen (Anti-Dopplung).
 */

/** Schutz vor unbegrenztem Wachstum; aelteste Eintraege fliegen zuerst raus. */
const MAX_STORED_SIGNATURES = 2000

export function readTrainingSolved(): Set<string> {
  return readStringSetFromStorage(STORAGE_KEYS.labsTrainingSolved)
}

export function persistTrainingSolved(signature: string): Set<string> {
  const solved = readTrainingSolved()
  solved.add(signature)
  persistStringSetToStorage(STORAGE_KEYS.labsTrainingSolved, solved, { max: MAX_STORED_SIGNATURES })
  return solved
}
