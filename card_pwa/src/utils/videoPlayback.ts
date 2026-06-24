/**
 * Gerätelokaler Wiedergabe-Zustand der Professor-Messer-Videos:
 *  - `positions` : zuletzt gesehene Sekunde **pro Datei** (Resume-Punkt)
 *  - `rate`      : zuletzt gewählte Abspielgeschwindigkeit (global)
 *
 * Bewusst getrennt vom Lern-/Konfidenz-Fortschritt ([[useMesserVideoProgress]]),
 * weil dieser pro *Objective* zählt, die Position aber pro *Video* gilt.
 * Die Parse-/Resume-Logik ist als pure Funktion ausgelegt (kein localStorage),
 * damit sie ohne Browser deterministisch testbar ist.
 */

export const PLAYBACK_STORAGE_KEY = 'card-pwa-messer-video-playback'

/** Resume erst ab dieser Mindestposition — darunter lohnt das Zurückspringen nicht. */
export const MIN_RESUME_SEC = 5
/** So nah am Ende gilt das Video als „durch" und startet wieder von vorn. */
export const END_MARGIN_SEC = 15

export const PLAYBACK_RATES = [1, 1.25, 1.5, 1.75, 2] as const
export const DEFAULT_PLAYBACK_RATE = 1

export interface PlaybackState {
  positions: Record<string, number>
  rate: number
}

function clampRate(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_PLAYBACK_RATE
  return Math.min(4, Math.max(0.25, value))
}

/** Tolerante Parse-Logik: akzeptiert Teil-/Altdaten und füllt fehlende Felder auf. */
export function parsePlaybackState(raw: string | null | undefined): PlaybackState {
  const empty: PlaybackState = { positions: {}, rate: DEFAULT_PLAYBACK_RATE }
  if (!raw) return empty
  try {
    const parsed = JSON.parse(raw) as Partial<PlaybackState> | null
    if (!parsed || typeof parsed !== 'object') return empty

    const positions: Record<string, number> = {}
    if (parsed.positions && typeof parsed.positions === 'object') {
      for (const [file, sec] of Object.entries(parsed.positions)) {
        if (typeof sec === 'number' && Number.isFinite(sec) && sec > 0) positions[file] = sec
      }
    }
    return { positions, rate: clampRate(parsed.rate) }
  } catch {
    return empty
  }
}

/**
 * Bestimmt den Punkt, ab dem fortgesetzt werden soll. Liefert `0`, wenn das
 * Video praktisch noch nicht oder bereits zu Ende gesehen wurde.
 */
export function computeResume(positionSec: number, durationSec: number): number {
  if (!Number.isFinite(positionSec) || positionSec < MIN_RESUME_SEC) return 0
  if (Number.isFinite(durationSec) && durationSec > 0 && positionSec > durationSec - END_MARGIN_SEC) return 0
  return positionSec
}

function readState(): PlaybackState {
  if (typeof window === 'undefined') return { positions: {}, rate: DEFAULT_PLAYBACK_RATE }
  try {
    return parsePlaybackState(window.localStorage.getItem(PLAYBACK_STORAGE_KEY))
  } catch {
    return { positions: {}, rate: DEFAULT_PLAYBACK_RATE }
  }
}

function writeState(state: PlaybackState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PLAYBACK_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Speicher voll / privat — Position bleibt dann nur für diese Sitzung.
  }
}

/** Resume-Position für eine Datei (oder 0). */
export function getResumePosition(file: string): number {
  return readState().positions[file] ?? 0
}

/** Speichert die aktuelle Position; nahe Ende/Anfang wird der Eintrag entfernt. */
export function saveResumePosition(file: string, positionSec: number, durationSec: number): void {
  const state = readState()
  if (computeResume(positionSec, durationSec) > 0) {
    state.positions[file] = Math.floor(positionSec)
  } else {
    delete state.positions[file]
  }
  writeState(state)
}

export function clearResumePosition(file: string): void {
  const state = readState()
  if (state.positions[file] === undefined) return
  delete state.positions[file]
  writeState(state)
}

export function getPlaybackRate(): number {
  return readState().rate
}

export function savePlaybackRate(rate: number): void {
  const state = readState()
  state.rate = clampRate(rate)
  writeState(state)
}
