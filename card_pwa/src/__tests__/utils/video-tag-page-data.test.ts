/**
 * AI_CONTEXT: Vitest coverage for the pure tag-page section aggregation
 * (buildTagPageSections) — protects timestamp text extraction, question/card-idea
 * parsing, source-objective tagging, and objective-aware sorting from regressions.
 */
import { describe, it, expect } from 'vitest'
import { buildTagPageSections } from '../../utils/videoTagPageData'

describe('buildTagPageSections', () => {
  it('extrahiert Zeitmarken mit Folgetext und normalisiertem Token', () => {
    const { timestamps } = buildTagPageSections([
      { objective: '1.2', content: '@03:42 Zero Trust Kernidee\nweiterer Text' },
    ])
    expect(timestamps).toEqual([
      { objective: '1.2', seconds: 222, token: '03:42', label: 'Zero Trust Kernidee' },
    ])
  })

  it('extrahiert Fragen und Kartenideen mit Quell-Objective', () => {
    const { questions, cardIdeas } = buildTagPageSections([
      { objective: '1.4', content: '? Was ist AES?\nKarte: AES in eigenen Worten' },
    ])
    expect(questions).toEqual([{ objective: '1.4', text: 'Was ist AES?' }])
    expect(cardIdeas).toEqual([{ objective: '1.4', text: 'AES in eigenen Worten' }])
  })

  it('sortiert Zeitmarken nach Objective (numerisch) und Sekunde', () => {
    const { timestamps } = buildTagPageSections([
      { objective: '1.10', content: '@00:30 spät' },
      { objective: '1.2', content: '@02:00 b\n@00:10 a' },
    ])
    expect(timestamps.map(t => `${t.objective}@${t.seconds}`)).toEqual([
      '1.2@10',
      '1.2@120',
      '1.10@30',
    ])
  })

  it('übernimmt den video-gebundenen Index bei Mehr-Video-Objectives', () => {
    const { timestamps } = buildTagPageSections([
      { objective: '1.2', content: '@v7:00:30 Zero Trust' },
    ])
    expect(timestamps).toEqual([
      { objective: '1.2', seconds: 30, token: '00:30', label: 'Zero Trust', videoIndex: 7 },
    ])
  })

  it('liefert leere Segmente ohne Signale', () => {
    expect(buildTagPageSections([{ objective: '1.1', content: 'nur Prosa ohne alles' }])).toEqual({
      timestamps: [],
      questions: [],
      cardIdeas: [],
    })
  })
})
