import { describe, it, expect } from 'vitest'
import { selectDownloadsToEnqueue, summarizeDownloads } from '../../utils/videoDownloadQueue'
import type { LocalVideoMeta } from '../../utils/localVideoManifest'

/**
 * Plattformunabhängiger Kapitel-Download: die Auswahl der wirklich neu zu
 * ladenden Dateien und die Fortschritts-Aggregation sind reine Logik (kein
 * fetch/IndexedDB) und hier deterministisch getestet.
 */

function meta(file: string): LocalVideoMeta {
  const m = /([1-5]\.\d{1,2})/.exec(file)
  const objective = m ? m[1] : '1.1'
  return { index: 0, objective, domain: Number(objective[0]), title: file, file }
}

const emptyState = { downloaded: new Set<string>(), queued: new Set<string>(), active: null }

describe('selectDownloadsToEnqueue', () => {
  it('nimmt bei leerem Zustand alle Kandidaten', () => {
    const candidates = [meta('a.mp4'), meta('b.mp4')]
    expect(selectDownloadsToEnqueue(candidates, emptyState).map(m => m.file)).toEqual(['a.mp4', 'b.mp4'])
  })

  it('überspringt bereits gespeicherte, eingereihte und aktive Dateien', () => {
    const candidates = [meta('a.mp4'), meta('b.mp4'), meta('c.mp4'), meta('d.mp4')]
    const result = selectDownloadsToEnqueue(candidates, {
      downloaded: new Set(['a.mp4']),
      queued: new Set(['b.mp4']),
      active: 'c.mp4',
    })
    expect(result.map(m => m.file)).toEqual(['d.mp4'])
  })

  it('entfernt Duplikate innerhalb der Auswahl', () => {
    const candidates = [meta('a.mp4'), meta('a.mp4'), meta('b.mp4')]
    expect(selectDownloadsToEnqueue(candidates, emptyState).map(m => m.file)).toEqual(['a.mp4', 'b.mp4'])
  })

  it('gibt eine leere Liste zurück, wenn nichts Neues zu laden ist', () => {
    const candidates = [meta('a.mp4')]
    expect(selectDownloadsToEnqueue(candidates, { downloaded: new Set(['a.mp4']), queued: new Set(), active: null })).toEqual([])
  })
})

describe('summarizeDownloads', () => {
  it('zählt geladen / offen und erkennt laufende Aktivität', () => {
    const summary = summarizeDownloads([
      { downloaded: true },
      { downloaded: false, progress: 0.4 }, // aktiv
      { downloaded: false, queued: true },  // wartet → aktiv
      { downloaded: false },                // offen
      { downloaded: false },                // offen
    ])
    expect(summary).toEqual({ total: 5, done: 1, pendingCount: 2, active: true })
  })

  it('meldet keine Aktivität, wenn alles geladen oder offen ist', () => {
    const summary = summarizeDownloads([{ downloaded: true }, { downloaded: false }])
    expect(summary).toEqual({ total: 2, done: 1, pendingCount: 1, active: false })
  })

  it('behandelt die leere Gruppe', () => {
    expect(summarizeDownloads([])).toEqual({ total: 0, done: 0, pendingCount: 0, active: false })
  })
})
