import type { LocalVideoMeta } from './localVideoManifest'

/**
 * Reine Logik für den (plattformunabhängigen) Offline-Download ganzer Kapitel.
 * Bewusst frei von Browser-APIs, damit Auswahl und Fortschritts-Aggregation
 * deterministisch testbar sind; der Hook kümmert sich nur um fetch/IndexedDB.
 */

export interface DownloadStateSnapshot {
  /** Bereits offline gespeicherte Dateien. */
  downloaded: Set<string>
  /** Aktuell in der Warteschlange. */
  queued: Set<string>
  /** Gerade laufender Download (oder null). */
  active: string | null
}

/**
 * Wählt aus Kandidaten genau die Dateien, die neu eingereiht werden müssen:
 * weder schon gespeichert, noch eingereiht, noch gerade aktiv — und ohne
 * Duplikate innerhalb der Auswahl.
 */
export function selectDownloadsToEnqueue(
  candidates: LocalVideoMeta[],
  state: DownloadStateSnapshot,
): LocalVideoMeta[] {
  const seen = new Set<string>()
  const result: LocalVideoMeta[] = []
  for (const meta of candidates) {
    if (state.downloaded.has(meta.file)) continue
    if (state.queued.has(meta.file)) continue
    if (meta.file === state.active) continue
    if (seen.has(meta.file)) continue
    seen.add(meta.file)
    result.push(meta)
  }
  return result
}

export interface DownloadProgressItem {
  downloaded: boolean
  progress?: number
  queued?: boolean
}

export interface DownloadSummary {
  total: number
  done: number
  /** Noch nicht gespeichert und (noch) nicht in der Warteschlange/aktiv. */
  pendingCount: number
  /** Mindestens ein Video lädt gerade oder wartet. */
  active: boolean
}

/** Aggregierter Offline-Status einer Gruppe (z. B. eines Kapitels/einer Domain). */
export function summarizeDownloads(items: DownloadProgressItem[]): DownloadSummary {
  let done = 0
  let pendingCount = 0
  let active = false
  for (const item of items) {
    if (item.downloaded) {
      done += 1
    } else if (item.progress !== undefined || item.queued) {
      active = true
    } else {
      pendingCount += 1
    }
  }
  return { total: items.length, done, pendingCount, active }
}
