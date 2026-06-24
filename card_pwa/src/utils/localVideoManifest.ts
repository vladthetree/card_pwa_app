/**
 * Lokale Professor-Messer-Videos (selbst gehostet auf dem Pi statt YouTube-Embed).
 *
 * Die heruntergeladenen Dateien folgen dem Schema
 *   `NNN - D.O - Titel - CompTIA … SY0-701.mp4`
 * (z. B. `003 - 1.2 - The CIA Triad - CompTIA Security+ SY0-701.mp4`).
 * Daraus leiten wir Index, Objective-Code, Domain und einen sauberen Titel ab.
 * Der Server liefert nur die Dateiliste (`readdir`); die Strukturierung passiert
 * hier client-seitig, damit sie ohne Server-Build testbar bleibt.
 */

export interface LocalVideoMeta {
  /** Laufende Nummer aus dem Dateinamen (Playlist-Reihenfolge). */
  index: number
  /** Objective-Code, z. B. "1.2". */
  objective: string
  /** Domain 1–5 (erste Ziffer des Objective-Codes). */
  domain: number
  /** Bereinigter Titel ohne den "- CompTIA …"-Suffix. */
  title: string
  /** Originaldateiname (für die Medien-URL). */
  file: string
}

const FILENAME_PATTERN = /^(\d+)\s*-\s*([1-5]\.\d{1,2})\s*-\s*(.+?)\s*\.mp4$/i
const COURSE_SUFFIX = /\s*-\s*CompTIA.*$/i

/** Parst einen Dateinamen; liefert null für Dateien ohne Objective-Code (z. B. Intro). */
export function parseLocalVideoFilename(file: string): LocalVideoMeta | null {
  const match = FILENAME_PATTERN.exec(file)
  if (!match) return null

  const index = Number(match[1])
  const objective = match[2]
  const domain = Number(objective.split('.')[0])
  const title = match[3].replace(COURSE_SUFFIX, '').trim()

  if (!Number.isFinite(index) || !Number.isFinite(domain) || !title) return null

  return { index, objective, domain, title, file }
}

/**
 * Baut aus einer Dateiliste die sortierte Video-Liste (nach Playlist-Index).
 * Nicht passende Dateien (Intro, Logs) werden ausgefiltert.
 */
export function buildLocalVideoManifest(files: string[]): LocalVideoMeta[] {
  return files
    .map(parseLocalVideoFilename)
    .filter((entry): entry is LocalVideoMeta => entry !== null)
    .sort((a, b) => a.index - b.index)
}

/** Gruppiert die Videos nach Objective-Code (Reihenfolge bleibt erhalten). */
export function groupLocalVideosByObjective(videos: LocalVideoMeta[]): Map<string, LocalVideoMeta[]> {
  const byObjective = new Map<string, LocalVideoMeta[]>()
  for (const video of videos) {
    const bucket = byObjective.get(video.objective)
    if (bucket) bucket.push(video)
    else byObjective.set(video.objective, [video])
  }
  return byObjective
}

/** Medien-URL für den In-App-Player. Pfad wird vom Pi-Server mit Range ausgeliefert. */
export function localVideoUrl(file: string): string {
  return `/media/messer/${encodeURIComponent(file)}`
}
