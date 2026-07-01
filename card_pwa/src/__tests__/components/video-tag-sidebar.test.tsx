/**
 * AI_CONTEXT: Vitest coverage for the video tag sidebar — pure search filtering
 * (filterVideoTagStats) plus render structure (pinned section, counts, active
 * outline, empty/sheet variants) via static markup (no jsdom in the repo, so
 * interaction is exercised through the pure filter fn).
 */
import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { filterVideoTagStats, type VideoTagStat } from '../../utils/videoTagStats'

function stat(partial: Partial<VideoTagStat> & { tagId: string }): VideoTagStat {
  return {
    label: partial.tagId,
    pinned: false,
    color: null,
    noteCount: 0,
    cardCount: 0,
    timestampCount: 0,
    questionCount: 0,
    cardIdeaCount: 0,
    relatedCount: 0,
    ...partial,
  }
}

const STATS: VideoTagStat[] = [
  stat({ tagId: 'zero-trust', label: 'Zero Trust', pinned: true, noteCount: 3, cardCount: 2 }),
  stat({ tagId: 'crypto', label: 'Crypto', noteCount: 5, cardCount: 1 }),
  stat({ tagId: 'pki', label: 'PKI', noteCount: 1 }),
]

// Non-empty stats für die Render-Tests; die Suche ist im Render-Pfad State,
// darum wird sie separat über die reine Funktion geprüft.
vi.mock('../../hooks/useVideoTags', () => ({
  useVideoTagStats: () => STATS,
}))

import VideoTagSidebar from '../../components/videos/VideoTagSidebar'

type Props = Parameters<typeof VideoTagSidebar>[0]

function render(props: Partial<Props> = {}): string {
  return renderToStaticMarkup(
    createElement(VideoTagSidebar, {
      profileId: 'p1',
      language: 'de',
      activeTag: 'crypto',
      onOpenTag: () => {},
      variant: 'panel',
      ...props,
    } as Props),
  )
}

describe('filterVideoTagStats', () => {
  it('findet über Label und kanonische ID (Teilstring, case-insensitiv)', () => {
    expect(filterVideoTagStats(STATS, 'crypt').map(s => s.tagId)).toEqual(['crypto'])
    expect(filterVideoTagStats(STATS, 'PKI').map(s => s.tagId)).toEqual(['pki'])
    // "zero trust" (Space) findet den kanonischen `zero-trust`
    expect(filterVideoTagStats(STATS, 'zero trust').map(s => s.tagId)).toEqual(['zero-trust'])
  })

  it('leere/whitespace Eingabe lässt die Liste unverändert (gleiche Referenz)', () => {
    expect(filterVideoTagStats(STATS, '   ')).toBe(STATS)
  })

  it('ohne Treffer leere Liste', () => {
    expect(filterVideoTagStats(STATS, 'xyz')).toEqual([])
  })
})

describe('VideoTagSidebar (render)', () => {
  it('zeigt alle Tags mit Counts und einen eigenen Pinned-Abschnitt', () => {
    const html = render()
    expect(html).toContain('Zero Trust')
    expect(html).toContain('Crypto')
    expect(html).toContain('PKI')
    expect(html).toContain('Angeheftet') // Pinned-Abschnitt-Überschrift
    expect(html).toContain('Alle Tags')
    expect(html).toContain('data-testid="video-tag-row-crypto"')
  })

  it('markiert den aktiven Tag mit aria-current', () => {
    const html = render({ activeTag: 'crypto' })
    expect(html).toMatch(/video-tag-row-crypto"[^>]*aria-current="true"/)
    // nicht-aktive Tags tragen kein aria-current
    expect(html).not.toMatch(/video-tag-row-pki"[^>]*aria-current/)
  })

  it('Sheet-Variante rendert einen Schließen-Button', () => {
    const html = render({ variant: 'sheet', onClose: () => {} })
    expect(html).toContain('data-testid="video-tag-sidebar-close"')
  })
})
