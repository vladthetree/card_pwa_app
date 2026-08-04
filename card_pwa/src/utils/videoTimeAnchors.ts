/**
 * AI_CONTEXT:
 * Role: Pure parser/formatter for @MM:SS and @H:MM:SS anchors embedded in video-note plain text.
 * Used by: VideoNotesPanel for inserting current time and by VideosView/MesserVideoPlayer for seek requests.
 * Important: Time anchors are derived from text, not stored as separate rows; preserve tolerant parsing but reject invalid minute/second ranges.
 */
/**
 * Zeitmarken in Video-Notizen. Sichtbare Syntax: `@03:42` oder `@1:02:03`.
 * Die Notiz bleibt Freitext, aber die App kann daraus klickbare Video-Anker
 * ableiten.
 *
 * Ein Objective kann mehrere Videos haben (z. B. 1.2 mit 7 Videos), aber nur
 * EINE geteilte Notiz — ohne Video-Bindung würde ein Klick auf `@03:42` immer
 * im gerade offenen Video seeken, auch wenn die Marke beim Schauen eines
 * ANDEREN Videos derselben Gruppe gesetzt wurde. Deshalb optionaler
 * `v<index>:`-Präfix: `@v7:03:42`. Nur eingefügt, wenn das Objective wirklich
 * mehrere Videos hat (siehe `buildVideoTimeToken`) — bei Single-Video-
 * Objectives bleibt die Syntax unverändert `@03:42`. Alte, unpräfixte Anker
 * bleiben gültig (kein videoIndex → Aufrufer fällt auf das aktuell offene
 * Video zurück).
 */

const TIME_ANCHOR_PATTERN = /(^|\s)@(?:v(\d+):)?(\d{1,3}:\d{2}(?::\d{2})?)(?=$|\s|[.,;:!?])/g

export interface VideoTimeAnchor {
  token: string
  seconds: number
  start: number
  end: number
  /** Video-`index`, wenn die Marke mit `@v<index>:…` an ein bestimmtes Video
   *  innerhalb eines Mehr-Video-Objectives gebunden ist; sonst `undefined`. */
  videoIndex?: number
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

export function formatVideoTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60

  if (hours > 0) return `${hours}:${pad2(minutes)}:${pad2(seconds)}`
  return `${pad2(minutes)}:${pad2(seconds)}`
}

export function parseVideoTimeToken(raw: string): number | null {
  const token = raw.trim().replace(/^@/, '')
  if (!token) return null

  const parts = token.split(':')
  if (parts.length !== 2 && parts.length !== 3) return null
  if (!parts.every(part => /^\d+$/.test(part))) return null

  const values = parts.map(Number)
  if (values.some(value => !Number.isFinite(value))) return null

  if (parts.length === 2) {
    const [minutes, seconds] = values
    if (seconds >= 60) return null
    return minutes * 60 + seconds
  }

  const [hours, minutes, seconds] = values
  if (minutes >= 60 || seconds >= 60) return null
  return hours * 3600 + minutes * 60 + seconds
}

export function extractVideoTimeAnchors(content: string): VideoTimeAnchor[] {
  if (!content) return []
  const anchors: VideoTimeAnchor[] = []

  for (const match of content.matchAll(TIME_ANCHOR_PATTERN)) {
    const lead = match[1] ?? ''
    const videoIndexRaw = match[2]
    const value = match[3] ?? ''
    const seconds = parseVideoTimeToken(value)
    if (seconds === null) continue

    const matchStart = match.index ?? 0
    const start = matchStart + lead.length
    const videoPrefix = videoIndexRaw !== undefined ? `v${videoIndexRaw}:` : ''
    const token = `@${videoPrefix}${value}`
    anchors.push({
      token,
      seconds,
      start,
      end: start + token.length,
      ...(videoIndexRaw !== undefined ? { videoIndex: Number(videoIndexRaw) } : {}),
    })
  }

  return anchors
}

/** Baut das Zeitmarken-Token zum Einfügen. `videoIndex` nur setzen, wenn das
 *  Objective mehrere Videos hat — sonst bleibt die Syntax `@mm:ss` unverändert. */
export function buildVideoTimeToken(totalSeconds: number, videoIndex?: number): string {
  const time = formatVideoTime(totalSeconds)
  return videoIndex === undefined ? `@${time}` : `@v${videoIndex}:${time}`
}
