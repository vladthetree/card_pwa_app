import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { HomeDeckListSection } from '../../components/home/HomeDeckListSection'
import type { Deck, DeckScheduleOverview, ShuffleCollection } from '../../types'

const t = {
  retry: 'Retry',
  no_decks: 'No decks',
  import_now: 'Import now',
}

const deck: Deck = {
  id: 'deck-1',
  name: 'Alpha Deck',
  total: 10,
  new: 2,
  learning: 3,
  due: 5,
}

const schedule: Record<string, DeckScheduleOverview> = {
  'deck-1': {
    today: { total: 5, new: 2, review: 3 },
    tomorrow: { total: 4, new: 1, review: 3 },
  },
}

const shuffleCollection: ShuffleCollection = {
  id: 'shuffle-1',
  name: 'Mixed Stack',
  deckIds: ['deck-1'],
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

function renderSection(showShuffleOnly: boolean): string {
  return renderToStaticMarkup(
    <HomeDeckListSection
      t={t}
      language="de"
      error={null}
      loading={false}
      decks={[deck]}
      filteredDecks={[deck]}
      visibleDecks={[deck]}
      deckScheduleOverview={schedule}
      shuffleModeEnabled
      showShuffleOnly={showShuffleOnly}
      shuffleCollections={[shuffleCollection]}
      shuffleSummaries={{
        'shuffle-1': {
          selectedCount: 7,
          inScopeDecks: 1,
          outOfScopeDecks: 0,
        },
      }}
      onReload={() => undefined}
      onShowImport={() => undefined}
      onStartStudy={() => undefined}
      onStartShuffleStudy={() => undefined}
      onEditShuffleCollection={() => undefined}
      onDeleteShuffleCollection={() => undefined}
      onShowShuffleMetrics={() => undefined}
      onDelete={() => undefined}
      onShowMetrics={() => undefined}
      onManageCards={() => undefined}
    />,
  )
}

describe('HomeDeckListSection shuffle/deck switch', () => {
  it('shows only regular decks when shuffle-only mode is disabled', () => {
    const html = renderSection(false)
    expect(html).toContain('Alpha Deck')
    expect(html).not.toContain('Mixed Stack')
  })

  it('shows only shuffle decks when shuffle-only mode is enabled', () => {
    const html = renderSection(true)
    expect(html).toContain('Mixed Stack')
    expect(html).toContain('Virtuelles Deck')
    expect(html).not.toContain('Alpha Deck')
  })
})
