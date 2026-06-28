/**
 * AI_CONTEXT: Vitest coverage for video playback; protects utils behavior from regressions in the learning PWA.
 */
import { describe, it, expect } from 'vitest'
import {
  parsePlaybackState,
  computeResume,
  DEFAULT_PLAYBACK_RATE,
  MIN_RESUME_SEC,
  END_MARGIN_SEC,
} from '../../utils/videoPlayback'

/**
 * Wiedergabe-Zustand der Messer-Videos. Parse- und Resume-Logik sind pure
 * Funktionen (kein localStorage), damit sie ohne Browser deterministisch
 * testbar sind. Resume merkt sich die Position pro Video gerätelokal.
 */

describe('parsePlaybackState — Speicherformat', () => {
  it('liefert für leere/fehlende Eingaben den Default', () => {
    expect(parsePlaybackState(null)).toEqual({ positions: {}, rate: DEFAULT_PLAYBACK_RATE })
    expect(parsePlaybackState('')).toEqual({ positions: {}, rate: DEFAULT_PLAYBACK_RATE })
  })

  it('liefert bei kaputtem JSON den Default statt zu werfen', () => {
    expect(parsePlaybackState('{nope')).toEqual({ positions: {}, rate: DEFAULT_PLAYBACK_RATE })
  })

  it('übernimmt gültige Positionen und Rate', () => {
    const raw = JSON.stringify({ positions: { 'a.mp4': 42, 'b.mp4': 120 }, rate: 1.5 })
    expect(parsePlaybackState(raw)).toEqual({ positions: { 'a.mp4': 42, 'b.mp4': 120 }, rate: 1.5 })
  })

  it('verwirft nicht-positive oder ungültige Positionen', () => {
    const raw = JSON.stringify({ positions: { ok: 10, zero: 0, neg: -5, nan: 'x' }, rate: 1 })
    expect(parsePlaybackState(raw).positions).toEqual({ ok: 10 })
  })

  it('begrenzt unplausible Raten und fällt sonst auf den Default zurück', () => {
    expect(parsePlaybackState(JSON.stringify({ rate: 99 })).rate).toBe(4)
    expect(parsePlaybackState(JSON.stringify({ rate: 0 })).rate).toBe(0.25)
    expect(parsePlaybackState(JSON.stringify({ rate: 'fast' })).rate).toBe(DEFAULT_PLAYBACK_RATE)
  })
})

describe('computeResume — Fortsetzungspunkt', () => {
  it('springt nicht zurück, solange unter der Mindestposition', () => {
    expect(computeResume(MIN_RESUME_SEC - 1, 600)).toBe(0)
  })

  it('startet von vorn, wenn praktisch zu Ende gesehen', () => {
    expect(computeResume(600 - END_MARGIN_SEC + 1, 600)).toBe(0)
  })

  it('setzt mitten im Video an der gespeicherten Position fort', () => {
    expect(computeResume(300, 600)).toBe(300)
  })

  it('toleriert unbekannte Dauer (NaN) und nutzt die Position', () => {
    expect(computeResume(300, NaN)).toBe(300)
  })
})
