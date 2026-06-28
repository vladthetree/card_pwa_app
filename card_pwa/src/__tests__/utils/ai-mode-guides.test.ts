/**
 * AI_CONTEXT: Vitest coverage for ai mode guides; protects utils behavior from regressions in the learning PWA.
 */
import { describe, it, expect } from 'vitest'
import { AI_MODE_GUIDES, SOURCES, getSource, getModeGuide } from '../../data/aiModeGuides'

/**
 * Quellenpflicht der KI-Anleitung (Nutzer-Vorgabe 2026-06-10): Jede Behauptung
 * in data/aiModeGuides.ts muss nachweisbar belegt sein — entweder durch eine
 * verifizierte Forschungsquelle (SOURCES) oder eine App-Logik-Referenz.
 * Dieser Test macht unbelegte Regeln zum Build-Fehler.
 */

describe('aiModeGuides — Quellen-Registry', () => {
  it('Quellen-IDs sind eindeutig', () => {
    const ids = SOURCES.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('jede Quelle hat Autoren, Jahr, Titel, Container, URL und Kernbefund', () => {
    for (const source of SOURCES) {
      expect(source.authors.length, source.id).toBeGreaterThan(5)
      expect(source.year, source.id).toBeGreaterThanOrEqual(2006)
      expect(source.year, source.id).toBeLessThanOrEqual(2026)
      expect(source.title.length, source.id).toBeGreaterThan(10)
      expect(source.container.length, source.id).toBeGreaterThan(5)
      expect(source.url.startsWith('https://'), source.id).toBe(true)
      expect(source.finding.length, source.id).toBeGreaterThan(30)
    }
  })

  it('Peer-Review-Quellen tragen eine DOI (einzige Ausnahme: Buchkapitel Bjork & Bjork 2011)', () => {
    for (const source of SOURCES) {
      if (source.id === 'bjork-bjork-2011') continue
      expect(source.doi, source.id).toBeTruthy()
    }
  })
})

describe('aiModeGuides — Belegpflicht je Modus', () => {
  const sourceIds = new Set(SOURCES.map(s => s.id))

  it('deckt alle Lernmodi der App ab (M1, M2, M3, Shuffle, Labs + Fokus, Daily Quest)', () => {
    const modeIds = AI_MODE_GUIDES.map(g => g.modeId)
    expect(new Set(modeIds).size).toBe(modeIds.length)
    for (const required of ['m1-flip', 'm2-drag-match', 'm3-free-recall', 'shuffle', 'labs', 'fokus-modus', 'daily-quest'] as const) {
      expect(modeIds, required).toContain(required)
    }
  })

  it('jede referenzierte Quellen-ID existiert in der Registry', () => {
    for (const guide of AI_MODE_GUIDES) {
      const referenced = [
        ...guide.researchBasis.flatMap(claim => claim.sourceIds),
        ...guide.dos.flatMap(rule => rule.sourceIds ?? []),
        ...guide.donts.flatMap(rule => rule.sourceIds ?? []),
      ]
      for (const id of referenced) {
        expect(sourceIds.has(id), `${guide.modeId}: unbekannte Quelle '${id}'`).toBe(true)
      }
    }
  })

  it('jede Forschungs-Behauptung nennt mindestens eine Quelle', () => {
    for (const guide of AI_MODE_GUIDES) {
      expect(guide.researchBasis.length, guide.modeId).toBeGreaterThan(0)
      for (const claim of guide.researchBasis) {
        expect(claim.sourceIds.length, `${guide.modeId}: '${claim.claim.slice(0, 40)}…'`).toBeGreaterThan(0)
      }
    }
  })

  it('jedes Do/Don\'t ist belegt — per Forschungsquelle oder App-Logik-Referenz', () => {
    for (const guide of AI_MODE_GUIDES) {
      expect(guide.dos.length, guide.modeId).toBeGreaterThan(0)
      expect(guide.donts.length, guide.modeId).toBeGreaterThan(0)
      for (const rule of [...guide.dos, ...guide.donts]) {
        const hasResearch = (rule.sourceIds?.length ?? 0) > 0
        const hasAppLogic = Boolean(rule.appLogic && rule.appLogic.includes('src/'))
        expect(hasResearch || hasAppLogic, `${guide.modeId}: unbelegte Regel '${rule.text.slice(0, 50)}…'`).toBe(true)
      }
    }
  })

  it('jeder Modus belegt seine App-Logik mit Repo-Referenzen', () => {
    for (const guide of AI_MODE_GUIDES) {
      expect(guide.appLogic.length, guide.modeId).toBeGreaterThan(0)
      expect(guide.appLogic.some(ref => ref.includes('src/')), guide.modeId).toBe(true)
    }
  })

  it('die fünf Karten-/Szenario-Modi verweisen auf ihre Autoren-Doku in docs/', () => {
    for (const modeId of ['m1-flip', 'm2-drag-match', 'm3-free-recall', 'shuffle', 'labs'] as const) {
      expect(getModeGuide(modeId)?.authoringDoc, modeId).toMatch(/^docs\/.+\.md$/)
    }
  })
})

describe('aiModeGuides — Zugriffsfunktionen', () => {
  it('getSource/getModeGuide liefern registrierte Einträge', () => {
    expect(getSource('rowland-2014')?.container).toContain('Psychological Bulletin')
    expect(getModeGuide('m2-drag-match')?.name).toContain('Drag-Match')
    expect(getSource('gibt-es-nicht')).toBeUndefined()
  })
})
