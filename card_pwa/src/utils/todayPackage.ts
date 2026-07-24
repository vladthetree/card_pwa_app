/**
 * AI_CONTEXT:
 * Role: Pure logic for the "Heute-Paket" guided daily path (today's course video,
 *       completion pointer, exam-countdown pacing) — no browser/DB access except
 *       the small localStorage pointer helpers.
 * Used by: useTodayPackage (Home) and HomeTodayPackageTile.
 * Important: The package NEVER touches scheduling — the cards step runs through the
 *            normal StudyView/recordReview flow; recall checks stay self-assessment.
 */
import type { LocalVideoMeta } from './localVideoManifest'
import type { RecallRunResult } from '../hooks/useVideoRecallScores'
import { STORAGE_KEYS } from '../constants/appIdentity'
import { parseLocalExamDate } from './examDate'

/** Persistierter Fortschritt: das zuletzt vollständig abgeschlossene Paket. */
export interface TodayPackagePointer {
  /** Playlist-Index des zuletzt abgeschlossenen Videos (0 = noch keins). */
  lastCompletedIndex: number
  /** Zeitstempel des Abschlusses (Date.now()). */
  lastCompletedAt: number
  /** Playlist-Index des aktuell angebotenen Pakets. */
  activeIndex: number
  /** Ab diesem Zeitpunkt zaehlen Signale fuer das aktuelle Paket. */
  activeStartedAt: number
  /** Feste Kartenmenge dieses Pakets; null = beim naechsten Laden festlegen. */
  activeCardIds: string[] | null
  /** Eigenes Kartenlimit, mit dem activeCardIds gebildet wurde.
   *  null migriert alte Pakete und erzwingt eine einmalige Neuberechnung. */
  activeCardLimit: number | null
}

const EMPTY_POINTER: TodayPackagePointer = {
  lastCompletedIndex: 0,
  lastCompletedAt: 0,
  activeIndex: 0,
  activeStartedAt: 0,
  activeCardIds: null,
  activeCardLimit: null,
}

/** Pure Parse-Logik (ohne Browser-APIs, daher direkt testbar). */
export function parseTodayPackagePointer(raw: string | null | undefined): TodayPackagePointer {
  if (!raw) return EMPTY_POINTER
  try {
    const parsed = JSON.parse(raw) as Partial<TodayPackagePointer> | null
    const lastCompletedIndex = Number(parsed?.lastCompletedIndex)
    const lastCompletedAt = Number(parsed?.lastCompletedAt)
    const activeIndex = Number(parsed?.activeIndex)
    const activeStartedAt = Number(parsed?.activeStartedAt)
    const activeCardIds = Array.isArray(parsed?.activeCardIds)
      ? parsed.activeCardIds.filter((id): id is string => typeof id === 'string')
      : null
    const rawActiveCardLimit = Number(parsed?.activeCardLimit)
    const activeCardLimit = parsed?.activeCardLimit !== null && Number.isFinite(rawActiveCardLimit)
      ? Math.max(0, Math.floor(rawActiveCardLimit))
      : null
    return {
      lastCompletedIndex: Number.isFinite(lastCompletedIndex) ? Math.max(0, Math.floor(lastCompletedIndex)) : 0,
      lastCompletedAt: Number.isFinite(lastCompletedAt) ? Math.max(0, lastCompletedAt) : 0,
      activeIndex: Number.isFinite(activeIndex) ? Math.max(0, Math.floor(activeIndex)) : 0,
      activeStartedAt: Number.isFinite(activeStartedAt) ? Math.max(0, activeStartedAt) : 0,
      activeCardIds,
      activeCardLimit,
    }
  } catch {
    return EMPTY_POINTER
  }
}

export function readTodayPackagePointer(): TodayPackagePointer {
  if (typeof window === 'undefined') return EMPTY_POINTER
  try {
    return parseTodayPackagePointer(window.localStorage.getItem(STORAGE_KEYS.todayPackagePointer))
  } catch {
    return EMPTY_POINTER
  }
}

export function persistTodayPackagePointer(pointer: TodayPackagePointer): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEYS.todayPackagePointer, JSON.stringify(pointer))
  } catch {
    // Speicher voll / privater Modus — der Zeiger lebt dann nur im Speicher.
  }
}

/** Pure Parse-Logik für die persistierte Videokatalog-Dateiliste. */
export function parseVideoCatalogFiles(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((file): file is string => typeof file === 'string')
  } catch {
    return []
  }
}

/** Zuletzt erfolgreich geladene Katalog-Dateiliste — hält das Heute-Paket offline verfügbar. */
export function readCachedVideoCatalogFiles(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return parseVideoCatalogFiles(window.localStorage.getItem(STORAGE_KEYS.videoCatalog))
  } catch {
    return []
  }
}

export function persistVideoCatalogFiles(files: string[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEYS.videoCatalog, JSON.stringify(files))
  } catch {
    // Speicher voll / privater Modus — dann gibt es nur den Netz-Katalog.
  }
}

/**
 * Das nächste Kurs-Video in Playlist-Reihenfolge nach dem zuletzt
 * abgeschlossenen Paket. Fehlt der Zeiger, ist es das erste Video;
 * ist der Kurs durch, null.
 */
export function pickTodayVideo(videos: LocalVideoMeta[], lastCompletedIndex: number): LocalVideoMeta | null {
  for (const video of videos) {
    if (video.index > lastCompletedIndex) return video
  }
  return null
}

/** Wurde für dieses Video seit `sinceMs` ein Abruf-Check abgeschlossen? */
export function hasRecallRunSince(runs: RecallRunResult[] | undefined, sinceMs: number): boolean {
  if (!runs || runs.length === 0) return false
  return runs.some(run => run.at >= sinceMs)
}

export interface ExamPacing {
  /** Volle Tage bis zur Prüfung (>= 1, sonst null). */
  daysLeft: number
  /** Nötiges Tempo, um bis dahin durch alle neuen Karten zu kommen. */
  newCardsPerDay: number
  /** Nötiges Tempo, um bis dahin alle restlichen Kurs-Videos zu sehen. */
  videosPerDay: number
}

/** Volle verbleibende Kalendertage bis zum Prüfungstermin. */
export function computeExamDaysLeft(examDateIso: string | null, nowMs = Date.now()): number | null {
  const examDate = parseLocalExamDate(examDateIso)
  if (!examDate) return null
  const examMs = examDate.getTime()
  const daysLeft = Math.ceil((examMs - nowMs) / 86_400_000)
  return daysLeft > 0 ? daysLeft : null
}

/**
 * Ruhige Tempo-Rechnung für den Prüfungs-Countdown: Restmenge / Resttage.
 * Kein Schuld-Framing — bei erreichtem/überschrittenem Termin gibt es nichts
 * mehr zu takten (null → Zeile wird ausgeblendet).
 */
export function computeExamPacing(input: {
  examDateIso: string | null
  remainingNewCards: number
  remainingVideos: number
  nowMs?: number
}): ExamPacing | null {
  const daysLeft = computeExamDaysLeft(input.examDateIso, input.nowMs)
  if (daysLeft === null) return null
  return {
    daysLeft,
    newCardsPerDay: Math.ceil(Math.max(0, input.remainingNewCards) / daysLeft),
    videosPerDay: Math.ceil(Math.max(0, input.remainingVideos) / daysLeft),
  }
}
