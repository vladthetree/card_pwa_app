/**
 * AI_CONTEXT: Vitest coverage for video note render segments; protects the #tag/[[link]] highlight overlay and caret-offset split from regressions.
 */
import { describe, expect, it } from 'vitest'
import { buildRenderSegments, splitSegmentsAtOffset } from '../../utils/videoNoteRender'

describe('buildRenderSegments', () => {
  it('markiert #tags und [[links]] getrennt vom Normaltext', () => {
    expect(buildRenderSegments('Notiz #crypto zu [[1.2]] hier')).toEqual([
      { text: 'Notiz ', kind: 'text' },
      { text: '#crypto', kind: 'tag' },
      { text: ' zu ', kind: 'text' },
      { text: '[[1.2]]', kind: 'link' },
      { text: ' hier', kind: 'text' },
    ])
  })

  it('liefert ein einzelnes Textsegment ohne Tags/Links', () => {
    expect(buildRenderSegments('nur Text')).toEqual([{ text: 'nur Text', kind: 'text' }])
  })
})

describe('splitSegmentsAtOffset', () => {
  const segments = buildRenderSegments('vor #tag nach')

  it('teilt innerhalb eines Textsegments', () => {
    const { before, after } = splitSegmentsAtOffset(segments, 2)
    expect(before).toEqual([{ text: 'vo', kind: 'text' }])
    expect(after).toEqual([{ text: 'r ', kind: 'text' }, { text: '#tag', kind: 'tag' }, { text: ' nach', kind: 'text' }])
  })

  it('teilt mitten in einem Tag-Segment (Cursor beim Tippen des Tags)', () => {
    // 'vor #ta|g nach' — Cursor nach 'ta', also Offset 7 ('vor #ta'.length)
    const { before, after } = splitSegmentsAtOffset(segments, 7)
    expect(before).toEqual([{ text: 'vor ', kind: 'text' }, { text: '#ta', kind: 'tag' }])
    expect(after).toEqual([{ text: 'g', kind: 'tag' }, { text: ' nach', kind: 'text' }])
  })

  it('Offset 0 legt alles nach after', () => {
    const { before, after } = splitSegmentsAtOffset(segments, 0)
    expect(before).toEqual([])
    expect(after).toEqual(segments)
  })

  it('Offset am Ende legt alles nach before', () => {
    const total = segments.reduce((sum, seg) => sum + seg.text.length, 0)
    const { before, after } = splitSegmentsAtOffset(segments, total)
    expect(before).toEqual(segments)
    expect(after).toEqual([])
  })

  it('Segmentgrenze exakt am Offset bleibt sauber getrennt', () => {
    // 'vor '.length === 4 — genau die Grenze zwischen Text- und Tag-Segment.
    const { before, after } = splitSegmentsAtOffset(segments, 4)
    expect(before).toEqual([{ text: 'vor ', kind: 'text' }])
    expect(after).toEqual([{ text: '#tag', kind: 'tag' }, { text: ' nach', kind: 'text' }])
  })
})
