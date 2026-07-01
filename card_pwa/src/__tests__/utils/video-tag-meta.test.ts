/**
 * AI_CONTEXT: Vitest coverage for the pure per-tag stats aggregation (computeVideoTagStats);
 * protects single-pass counting, alias resolution, and archive handling from regressions.
 */
import { describe, it, expect } from 'vitest'
import { computeVideoTagStats, type VideoTagStatsInput } from '../../utils/videoTagStats'

function meta(partial: Partial<VideoTagStatsInput['metas'][number]> & { tagId: string }) {
  return {
    label: partial.tagId,
    aliases: [],
    pinned: false,
    color: null,
    archived: false,
    ...partial,
  }
}

describe('computeVideoTagStats', () => {
  it('zählt Notizen, Karten, Zeitmarken, Fragen und Kartenideen pro Tag', () => {
    const stats = computeVideoTagStats({
      notes: [
        { content: '#crypto Grundlagen\n? Was ist AES?\nKarte: AES erklären\n@01:30 Block', tags: ['crypto'] },
        { content: '#crypto und #pki zusammen\n? Wofür CA?', tags: ['crypto', 'pki'] },
      ],
      metas: [meta({ tagId: 'crypto', label: 'Crypto' })],
      cards: [{ tags: ['crypto'] }, { tags: ['Crypto'] }, { tags: ['unrelated'] }],
    })

    const crypto = stats.find(s => s.tagId === 'crypto')
    expect(crypto).toBeDefined()
    expect(crypto?.label).toBe('Crypto') // Meta-Label gewinnt über die Notiz-Schreibweise
    expect(crypto?.noteCount).toBe(2)
    expect(crypto?.cardCount).toBe(2) // case-insensitiv über die kanonische Tag-ID
    expect(crypto?.timestampCount).toBe(1)
    expect(crypto?.questionCount).toBe(2)
    expect(crypto?.cardIdeaCount).toBe(1)
    expect(crypto?.relatedCount).toBe(1) // kommt einmal mit #pki vor
  })

  it('löst Aliase auf den Haupt-Tag auf und bündelt die Zählung dort', () => {
    const stats = computeVideoTagStats({
      notes: [
        { content: '#zero-trust Modell', tags: ['zero-trust'] },
        { content: '#zt Wiederholung', tags: ['zt'] },
      ],
      metas: [meta({ tagId: 'zero-trust', label: 'Zero Trust', aliases: ['zt'] })],
      cards: [{ tags: ['zt'] }],
    })

    expect(stats).toHaveLength(1)
    const zt = stats[0]
    expect(zt.tagId).toBe('zero-trust')
    expect(zt.noteCount).toBe(2) // beide Notizen zählen unter dem Haupt-Tag
    expect(zt.cardCount).toBe(1)
  })

  it('blendet archivierte Tags aus, lässt deren Inhalte aber unberührt', () => {
    const stats = computeVideoTagStats({
      notes: [{ content: '#old und #new', tags: ['old', 'new'] }],
      metas: [meta({ tagId: 'old', archived: true }), meta({ tagId: 'new' })],
      cards: [],
    })

    expect(stats.map(s => s.tagId)).toEqual(['new'])
  })

  it('sortiert gepinnte Tags zuerst, danach alphabetisch nach Label', () => {
    const stats = computeVideoTagStats({
      notes: [{ content: '#alpha #beta #gamma', tags: ['alpha', 'beta', 'gamma'] }],
      metas: [
        meta({ tagId: 'alpha', label: 'Alpha' }),
        meta({ tagId: 'beta', label: 'Beta', pinned: true }),
        meta({ tagId: 'gamma', label: 'Gamma' }),
      ],
      cards: [],
    })

    expect(stats.map(s => s.tagId)).toEqual(['beta', 'alpha', 'gamma'])
  })

  it('zeigt Metadaten-only Tags ohne Inhalt mit Null-Counts', () => {
    const stats = computeVideoTagStats({
      notes: [],
      metas: [meta({ tagId: 'planned', label: 'Planned' })],
      cards: [],
    })

    expect(stats).toEqual([
      expect.objectContaining({ tagId: 'planned', noteCount: 0, cardCount: 0, relatedCount: 0 }),
    ])
  })
})
