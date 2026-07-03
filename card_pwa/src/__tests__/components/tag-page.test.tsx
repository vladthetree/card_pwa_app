/**
 * AI_CONTEXT: Vitest coverage for the tag page (TagCollectionPanel) — verifies the
 * meta header (label/description/pin/aliases), the segmented toolbar with derived
 * counts (timestamps/questions extracted from notes), the video-note rows, and the
 * related-tags strip. Rendered via static markup (no jsdom); async card loading and
 * segment switching are state-driven and covered elsewhere.
 */
import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const NOTES = [
  { profileId: 'p1', objective: '1.2', content: '#zero-trust @03:42 Kernidee\n? Warum Perimeter tot?', tags: ['zero-trust'] },
]

vi.mock('../../hooks/useVideoNotes', () => ({
  useNotesByTag: () => NOTES,
  useRelatedVideoNoteTags: () => [{ tag: 'pki', count: 2 }],
}))

vi.mock('../../hooks/useVideoTags', () => ({
  useVideoTag: () => ({
    profileId: 'p1',
    tagId: 'zero-trust',
    label: 'Zero Trust',
    aliases: ['zt'],
    description: 'Perimeter ist tot',
    color: '#22d3ee',
    icon: null,
    pinned: true,
    archived: false,
    createdAt: 0,
    updatedAt: 0,
  }),
}))

vi.mock('../../hooks/useMesserVideoProgress', async importOriginal => {
  const actual = await importOriginal<typeof import('../../hooks/useMesserVideoProgress')>()
  return { ...actual, useMesserVideoProgress: () => ({ progress: {} }) }
})

import TagCollectionPanel from '../../components/videos/TagCollectionPanel'

function render(): string {
  return renderToStaticMarkup(
    createElement(TagCollectionPanel, {
      profileId: 'p1',
      tag: 'zero-trust',
      language: 'de',
      onClose: () => {},
      onOpenObjective: () => {},
      onOpenObjectiveAtTime: () => {},
      onOpenTag: () => {},
    }),
  )
}

describe('TagCollectionPanel (tag page)', () => {
  it('zeigt den Meta-Header: Label, Beschreibung und Aliase', () => {
    const html = render()
    expect(html).toContain('#Zero Trust')
    expect(html).toContain('Perimeter ist tot')
    expect(html).toContain('Aliase')
    expect(html).toContain('zt')
  })

  it('rendert alle Segmente mit abgeleiteten Counts (Zeitmarke + Frage extrahiert)', () => {
    const html = render()
    for (const seg of ['all', 'videos', 'cards', 'timestamps', 'questions', 'cardIdeas']) {
      expect(html).toContain(`data-testid="tag-segment-${seg}"`)
    }
    // 1 Zeitmarke, 1 Frage, 0 Kartenideen aus der Notiz extrahiert
    expect(html).toMatch(/tag-segment-timestamps[\s\S]{0,300}?>1</)
    expect(html).toMatch(/tag-segment-questions[\s\S]{0,300}?>1</)
    expect(html).toMatch(/tag-segment-cardIdeas[\s\S]{0,300}?>0</)
  })

  it('zeigt Video-Notiz-Zeile und verwandte Tags', () => {
    const html = render()
    expect(html).toContain('data-testid="tag-panel-objective-1.2"')
    expect(html).toContain('data-testid="tag-panel-related-pki"')
  })
})
