/**
 * AI_CONTEXT:
 * Role: LocalStorage-backed progress model for Professor Messer objectives: watched plus self-rated confidence gaps/ok/solid.
 * Used by: VideosView status chips and VideoRecallCheck confidence suggestions.
 * Important: This fights passive-watching fluency illusion; opening a video only marks watched, solid requires active confidence input.
 */
import { useCallback, useState } from 'react'

/**
 * Lernfortschritt je Professor-Messer-Objective.
 *
 * Lernpsychologischer Hintergrund: Das frühere binäre „GESEHEN" wurde bereits
 * beim Öffnen gesetzt — also durch bloße Exposition, nicht durch Wissen. Das
 * ist die klassische „illusion of fluency". Wir trennen deshalb zwei Dinge:
 *
 *  - `watched`     : Video wurde geöffnet (neutrale Information).
 *  - `confidence`  : selbsteingeschätztes Können nach aktivem Abruf
 *                    (Lücken / Okay / Sicher) — die eigentlich aussagekräftige
 *                    Größe. Erst „solid" verdient die grüne Markierung.
 *
 * Speicherung gerätelokal in localStorage unter demselben Schlüssel wie zuvor;
 * das alte Array-Format (`["1.1", …]`) wird transparent migriert.
 */

export type VideoConfidence = 'gaps' | 'ok' | 'solid'

export interface MesserVideoProgress {
  watched: boolean
  confidence: VideoConfidence | null
  updatedAt: number
}

export type MesserVideoProgressMap = Record<string, MesserVideoProgress>

const VIDEO_STATUS_STORAGE_KEY = 'card-pwa-messer-video-status'

/** Selbsteinschätzungs-Status eines Videos als stabiles Token (entkoppelt von der Darstellung). */
export type VideoStatus = 'open' | 'watched' | 'gaps' | 'ok' | 'solid'

function isConfidence(value: unknown): value is VideoConfidence {
  return value === 'gaps' || value === 'ok' || value === 'solid'
}

/**
 * Pure Parse-/Migrationslogik (ohne Browser-APIs, daher direkt testbar).
 * Akzeptiert das Legacy-Array (v1) und das aktuelle Objektformat.
 */
export function parseVideoProgress(raw: string | null | undefined): MesserVideoProgressMap {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)

    // Legacy v1: Array von Objective-IDs, die als „gesehen" galten.
    if (Array.isArray(parsed)) {
      const map: MesserVideoProgressMap = {}
      for (const id of parsed) {
        if (typeof id === 'string') map[id] = { watched: true, confidence: null, updatedAt: 0 }
      }
      return map
    }

    if (parsed && typeof parsed === 'object') {
      const map: MesserVideoProgressMap = {}
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        const entry = value as Partial<MesserVideoProgress> | null
        map[key] = {
          watched: entry?.watched === true,
          confidence: isConfidence(entry?.confidence) ? entry.confidence : null,
          updatedAt: typeof entry?.updatedAt === 'number' ? entry.updatedAt : 0,
        }
      }
      return map
    }

    return {}
  } catch {
    return {}
  }
}

export function readVideoProgress(): MesserVideoProgressMap {
  if (typeof window === 'undefined') return {}
  try {
    return parseVideoProgress(window.localStorage.getItem(VIDEO_STATUS_STORAGE_KEY))
  } catch {
    return {}
  }
}

/**
 * Kern-Entscheidung gegen die Fluency-Illusion: bloßes Schauen ergibt nur
 * `watched` (neutral); die Konfidenz-Stufen verdienen das eigene Token erst nach
 * aktivem Abruf. Confidence schlägt `watched`.
 */
export function resolveVideoStatus(entry: MesserVideoProgress | undefined): VideoStatus {
  if (entry?.confidence) return entry.confidence
  if (entry?.watched) return 'watched'
  return 'open'
}

/** Leitet aus dem Abruf-Check-Score eine vorgeschlagene Selbsteinschätzung ab. */
export function suggestConfidence(known: number, total: number): VideoConfidence {
  if (total <= 0) return 'ok'
  const ratio = known / total
  if (ratio >= 0.8) return 'solid'
  if (ratio >= 0.5) return 'ok'
  return 'gaps'
}

function persist(map: MesserVideoProgressMap): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(VIDEO_STATUS_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Speicher voll / privat — Fortschritt bleibt dann nur im Speicher.
  }
}

const EMPTY_ENTRY: MesserVideoProgress = { watched: false, confidence: null, updatedAt: 0 }

export function useMesserVideoProgress() {
  const [progress, setProgress] = useState<MesserVideoProgressMap>(readVideoProgress)

  const markWatched = useCallback((objective: string) => {
    setProgress(prev => {
      if (prev[objective]?.watched) return prev
      const existing = prev[objective] ?? EMPTY_ENTRY
      const next = { ...prev, [objective]: { ...existing, watched: true, updatedAt: Date.now() } }
      persist(next)
      return next
    })
  }, [])

  const setConfidence = useCallback((objective: string, confidence: VideoConfidence | null) => {
    setProgress(prev => {
      const existing = prev[objective] ?? EMPTY_ENTRY
      const next = {
        ...prev,
        [objective]: { ...existing, watched: true, confidence, updatedAt: Date.now() },
      }
      persist(next)
      return next
    })
  }, [])

  return { progress, markWatched, setConfidence }
}
