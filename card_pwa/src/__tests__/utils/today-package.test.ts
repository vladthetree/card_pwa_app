/**
 * AI_CONTEXT: Vitest coverage for the Heute-Paket pure logic (pointer parsing,
 * today-video selection, recall-run recency, exam pacing); protects utils behavior
 * from regressions in the learning PWA.
 */
import { describe, expect, it } from 'vitest'
import {
  computeExamPacing,
  hasRecallRunSince,
  parseTodayPackagePointer,
  pickTodayVideo,
} from '../../utils/todayPackage'
import type { LocalVideoMeta } from '../../utils/localVideoManifest'

function video(index: number, objective = '1.1'): LocalVideoMeta {
  return { index, objective, domain: Number(objective.split('.')[0]), title: `Video ${index}`, file: `${index}.mp4` }
}

describe('parseTodayPackagePointer', () => {
  it('liefert den Leerstand für fehlende/kaputte Werte', () => {
    expect(parseTodayPackagePointer(null)).toEqual({ lastCompletedIndex: 0, lastCompletedAt: 0 })
    expect(parseTodayPackagePointer('not-json')).toEqual({ lastCompletedIndex: 0, lastCompletedAt: 0 })
    expect(parseTodayPackagePointer('{"lastCompletedIndex":"x"}')).toEqual({ lastCompletedIndex: 0, lastCompletedAt: 0 })
  })

  it('parst einen gespeicherten Zeiger', () => {
    expect(parseTodayPackagePointer('{"lastCompletedIndex":12,"lastCompletedAt":1000}'))
      .toEqual({ lastCompletedIndex: 12, lastCompletedAt: 1000 })
  })

  it('klemmt negative Werte auf 0', () => {
    expect(parseTodayPackagePointer('{"lastCompletedIndex":-3,"lastCompletedAt":-1}'))
      .toEqual({ lastCompletedIndex: 0, lastCompletedAt: 0 })
  })
})

describe('pickTodayVideo', () => {
  const catalog = [video(1), video(2), video(5)]

  it('startet ohne Fortschritt beim ersten Video', () => {
    expect(pickTodayVideo(catalog, 0)?.index).toBe(1)
  })

  it('liefert das nächste Video nach dem zuletzt abgeschlossenen', () => {
    expect(pickTodayVideo(catalog, 1)?.index).toBe(2)
    // Lücken in der Playlist-Nummerierung werden übersprungen.
    expect(pickTodayVideo(catalog, 2)?.index).toBe(5)
    expect(pickTodayVideo(catalog, 3)?.index).toBe(5)
  })

  it('liefert null, wenn der Kurs durch ist', () => {
    expect(pickTodayVideo(catalog, 5)).toBeNull()
    expect(pickTodayVideo([], 0)).toBeNull()
  })
})

describe('hasRecallRunSince', () => {
  it('erkennt nur Läufe ab dem Stichtag', () => {
    const runs = [
      { known: 3, total: 5, at: 1_000 },
      { known: 4, total: 5, at: 2_000 },
    ]
    expect(hasRecallRunSince(runs, 1_500)).toBe(true)
    expect(hasRecallRunSince(runs, 2_001)).toBe(false)
    expect(hasRecallRunSince(undefined, 0)).toBe(false)
    expect(hasRecallRunSince([], 0)).toBe(false)
  })
})

describe('computeExamPacing', () => {
  const nowMs = Date.parse('2026-07-10T12:00:00')

  it('liefert null ohne Termin oder bei kaputtem Datum', () => {
    expect(computeExamPacing({ examDateIso: null, remainingNewCards: 100, remainingVideos: 10, nowMs })).toBeNull()
    expect(computeExamPacing({ examDateIso: 'quatsch', remainingNewCards: 100, remainingVideos: 10, nowMs })).toBeNull()
  })

  it('liefert null, wenn der Termin erreicht oder vorbei ist (kein Schuld-Framing)', () => {
    expect(computeExamPacing({ examDateIso: '2026-07-10', remainingNewCards: 100, remainingVideos: 10, nowMs })).toBeNull()
    expect(computeExamPacing({ examDateIso: '2026-06-01', remainingNewCards: 100, remainingVideos: 10, nowMs })).toBeNull()
  })

  it('rechnet Restmenge / Resttage (aufgerundet)', () => {
    const pacing = computeExamPacing({ examDateIso: '2026-08-09', remainingNewCards: 774, remainingVideos: 121, nowMs })
    // 2026-08-09 00:00 liegt 29,5 Tage nach dem 10.07. 12:00 → 30 Resttage.
    expect(pacing).toEqual({ daysLeft: 30, newCardsPerDay: 26, videosPerDay: 5 })
  })

  it('geht mit leeren Restmengen ruhig um', () => {
    const pacing = computeExamPacing({ examDateIso: '2026-08-09', remainingNewCards: 0, remainingVideos: 0, nowMs })
    expect(pacing?.newCardsPerDay).toBe(0)
    expect(pacing?.videosPerDay).toBe(0)
  })
})
