import { STORAGE_KEYS } from '../constants/appIdentity'

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
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.labsTrainingSolved)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((sig): sig is string => typeof sig === 'string'))
  } catch {
    return new Set()
  }
}

export function persistTrainingSolved(signature: string): Set<string> {
  const solved = readTrainingSolved()
  solved.add(signature)
  if (typeof window !== 'undefined') {
    try {
      const entries = Array.from(solved).slice(-MAX_STORED_SIGNATURES)
      window.localStorage.setItem(STORAGE_KEYS.labsTrainingSolved, JSON.stringify(entries))
    } catch {
      // localStorage voll/blockiert: Fortschritt geht nur für diese Session verloren.
    }
  }
  return solved
}
