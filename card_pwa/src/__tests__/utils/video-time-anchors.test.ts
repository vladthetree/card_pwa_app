/**
 * AI_CONTEXT: Vitest coverage for video time anchors; protects utils behavior from regressions in the learning PWA.
 */
import { describe, expect, it } from 'vitest'
import { buildVideoTimeToken, extractVideoTimeAnchors, formatVideoTime, parseVideoTimeToken } from '../../utils/videoTimeAnchors'

describe('videoTimeAnchors', () => {
  it('formatiert Sekunden als sichtbare Video-Zeitmarken', () => {
    expect(formatVideoTime(0)).toBe('00:00')
    expect(formatVideoTime(222)).toBe('03:42')
    expect(formatVideoTime(3723)).toBe('1:02:03')
    expect(formatVideoTime(NaN)).toBe('00:00')
  })

  it('parst MM:SS und HH:MM:SS Tokens', () => {
    expect(parseVideoTimeToken('03:42')).toBe(222)
    expect(parseVideoTimeToken('@03:42')).toBe(222)
    expect(parseVideoTimeToken('1:02:03')).toBe(3723)
  })

  it('verwirft ungueltige Zeiten', () => {
    expect(parseVideoTimeToken('03:99')).toBeNull()
    expect(parseVideoTimeToken('1:60:00')).toBeNull()
    expect(parseVideoTimeToken('abc')).toBeNull()
  })

  it('extrahiert Zeitanker mit Positionen aus Freitext', () => {
    expect(extractVideoTimeAnchors('Start @03:42 #pki\nSpaeter @1:02:03.')).toEqual([
      { token: '@03:42', seconds: 222, start: 6, end: 12 },
      { token: '@1:02:03', seconds: 3723, start: 26, end: 34 },
    ])
  })

  it('ignoriert Tokens mitten im Wort', () => {
    expect(extractVideoTimeAnchors('abc@03:42 aber @04:00')).toEqual([
      { token: '@04:00', seconds: 240, start: 15, end: 21 },
    ])
  })

  it('erkennt video-gebundene Zeitanker (@v<index>:mm:ss) bei Mehr-Video-Objectives', () => {
    expect(extractVideoTimeAnchors('Siehe @v7:03:42 dazu')).toEqual([
      { token: '@v7:03:42', seconds: 222, start: 6, end: 15, videoIndex: 7 },
    ])
  })

  it('baut das Einfüge-Token mit und ohne Video-Bindung', () => {
    expect(buildVideoTimeToken(222)).toBe('@03:42')
    expect(buildVideoTimeToken(222, 7)).toBe('@v7:03:42')
  })
})
