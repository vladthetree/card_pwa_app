import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Deck, ShuffleCollection } from '../../types'

const deck: Deck = {
  id: 'deck-1',
  name: 'Alpha Deck',
  total: 10,
  new: 2,
  learning: 3,
  due: 5,
}

const shuffleCollection: ShuffleCollection = {
  id: 'shuffle-1',
  name: 'Mixed Stack',
  deckIds: ['deck-1'],
  createdAt: 1,
  updatedAt: 1,
}

const captured = vi.hoisted(() => ({
  toolbarProps: null as Record<string, unknown> | null,
  deckListProps: null as Record<string, unknown> | null,
  shuffleSectionProps: null as Record<string, unknown> | null,
}))

vi.mock('../../hooks/useCardDb', () => ({
  useDecks: () => ({ decks: [deck], loading: false, error: null, reload: vi.fn() }),
  useShuffleCollections: () => ({ collections: [shuffleCollection] }),
  useStats: () => ({ stats: {} }),
  useGamificationProfile: () => ({ profile: {} }),
}))

vi.mock('../../contexts/SettingsContext', () => ({
  STRINGS: {
    de: {
      install: 'Installieren',
      install_question: 'Question',
      install_manual_hint_ios: 'ios',
      install_manual_hint: 'manual',
      close: 'Close',
      settings: 'Settings',
      faq: 'FAQ',
    },
  },
  useSettings: () => ({
    settings: {
      language: 'de',
      shuffleModeEnabled: true,
      showBuildVersion: false,
      studyCardLimit: 50,
      nextDayStartsAt: 4,
      dailyReminderEnabled: false,
      dailyReminderTime: '20:00',
    },
    profile: null,
  }),
}))

vi.mock('../../hooks/usePwaInstall', () => ({
  usePwaInstall: () => ({
    canInstall: false,
    isInstalled: true,
    hasNativePrompt: false,
    isIos: false,
    isInstalling: false,
    install: vi.fn(),
  }),
}))

vi.mock('../../hooks/useServerHeartbeat', () => ({
  useServerHeartbeat: () => ({ isConnected: true }),
}))

vi.mock('../../hooks/home/useHomeDerivedData', () => ({
  useHomeDerivedData: () => ({
    deckOptions: [{ id: 'deck-1', name: 'Alpha Deck' }],
    deckScheduleOverview: {
      'deck-1': {
        today: { total: 5, new: 2, review: 3 },
        tomorrow: { total: 4, new: 1, review: 3 },
      },
    },
    deckTagIndex: { 'deck-1': ['network'] },
    futureForecast: [{ dayStartMs: 1, count: 2 }],
    futureForecastLoading: true,
    syncedDeckIds: ['deck-1'],
    shuffleSummaries: {
      'shuffle-1': {
        selectedCount: 7,
        inScopeDecks: 1,
        outOfScopeDecks: 0,
      },
    },
  }),
}))

vi.mock('../../hooks/home/useHomeViewController', () => ({
  useHomeViewController: () => ({
    showCreateCard: true,
    showCreateDeckModal: true,
    newDeckName: 'Alpha',
    createDeckError: null,
    isCreatingDeck: false,
    showSettings: true,
    showFaq: true,
    showInstallHintModal: true,
    showImport: true,
    showExportModal: true,
    isExporting: false,
    selectedDeckId: 'all',
    showFutureForecast: true,
    metricsDeck: deck,
    metricsShuffleCollection: shuffleCollection,
    cardsDeck: deck,
    editingShuffleCollection: shuffleCollection,
    showShuffleCollectionModal: true,
    confirmModal: {
      title: 'Confirm',
      message: 'Message',
      onConfirm: vi.fn(),
    },
    notificationPermission: 'default',
    dashboardMode: 'kpi',
    showShuffleOnly: false,
    setNewDeckName: vi.fn(),
    setSelectedDeckId: vi.fn(),
    setDashboardMode: vi.fn(),
    toggleShuffleOnly: vi.fn(),
    openCreateCard: vi.fn(),
    closeCreateCard: vi.fn(),
    openCreateDeckModal: vi.fn(),
    closeCreateDeckModal: vi.fn(),
    openSettings: vi.fn(),
    closeSettings: vi.fn(),
    openFaq: vi.fn(),
    closeFaq: vi.fn(),
    closeInstallHintModal: vi.fn(),
    openImport: vi.fn(),
    closeImport: vi.fn(),
    openExport: vi.fn(),
    closeExport: vi.fn(),
    openFutureForecast: vi.fn(),
    closeFutureForecast: vi.fn(),
    openMetricsDeck: vi.fn(),
    closeMetricsDeck: vi.fn(),
    openMetricsShuffleCollection: vi.fn(),
    closeMetricsShuffleCollection: vi.fn(),
    openCardsDeck: vi.fn(),
    closeCardsDeck: vi.fn(),
    openCreateShuffleCollection: vi.fn(),
    openEditShuffleCollection: vi.fn(),
    closeShuffleCollectionModal: vi.fn(),
    confirmAction: vi.fn(),
    cancelConfirmModal: vi.fn(),
    handleInstall: vi.fn(),
    requestNotificationPermission: vi.fn(),
    handleDelete: vi.fn(),
    handleDeleteShuffleCollection: vi.fn(),
    handleCreateDeck: vi.fn(),
    handleExportTxt: vi.fn(),
    handleExportCsv: vi.fn(),
  }),
}))

vi.mock('../../hooks/home/useHomeDeckFilters', () => ({
  useHomeDeckFilters: () => ({
    deckSearchQuery: '',
    setDeckSearchQuery: vi.fn(),
    deckSortMode: 'name',
    setDeckSortMode: vi.fn(),
    filteredDecks: [deck],
    visibleDecks: [deck],
  }),
}))

vi.mock('../../hooks/home/useHomeStorageEstimate', () => ({
  useHomeStorageEstimate: () => ({
    storageUsedBytes: null,
    storageQuotaBytes: null,
    storageEstimateUnavailable: true,
  }),
}))

vi.mock('../../components/home/HomeHeaderBar', () => ({
  HomeHeaderBar: (props: Record<string, unknown>) => <div data-test="header">{String(props.language)}</div>,
}))

vi.mock('../../components/home/HomeStatsSection', () => ({
  HomeStatsSection: () => <div data-test="stats">stats</div>,
}))

vi.mock('../../components/home/HomeDeckToolbar', () => ({
  HomeDeckToolbar: (props: Record<string, unknown>) => {
    captured.toolbarProps = props
    return <div data-test="toolbar">toolbar</div>
  },
}))

vi.mock('../../components/home/HomeDeckListSection', () => ({
  HomeDeckListSection: (props: Record<string, unknown>) => {
    captured.deckListProps = props
    return <div data-test="deck-list">deck-list</div>
  },
}))

vi.mock('../../components/home/HomeShuffleSection', () => ({
  HomeShuffleSection: (props: Record<string, unknown>) => {
    captured.shuffleSectionProps = props
    return <div data-test="shuffle-section">shuffle-section</div>
  },
}))

vi.mock('../../components/home/HomeCreateDeckModal', () => ({
  HomeCreateDeckModal: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div>create-deck-modal</div> : null,
}))

vi.mock('../../components/home/HomeExportModal', () => ({
  HomeExportModal: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div>export-modal</div> : null,
}))

vi.mock('../../components/home/HomeDeckCardsModal', () => ({
  HomeDeckCardsModal: () => <div>deck-cards-modal</div>,
}))

vi.mock('../../components/home/HomeShuffleCollectionModal', () => ({
  HomeShuffleCollectionModal: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div>shuffle-collection-modal</div> : null,
}))

vi.mock('../../components/CreateCardModal.tsx', () => ({
  default: () => <div>create-card-modal</div>,
}))

vi.mock('../../components/SettingsModal.tsx', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div>settings-modal</div> : null,
}))

vi.mock('../../components/FaqModal.tsx', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div>faq-modal</div> : null,
}))

vi.mock('../../components/FutureForecastModal.tsx', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div>future-forecast-modal</div> : null,
}))

vi.mock('../../components/ImportView.tsx', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div>import-view</div> : null,
}))

vi.mock('../../components/ConfirmModal.tsx', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div>confirm-modal</div> : null,
}))

vi.mock('../../components/InstallHintModal.tsx', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div>install-hint-modal</div> : null,
}))

vi.mock('../../components/DeckMetricsModal.tsx', () => ({
  DeckMetricsModal: () => <div>deck-metrics-modal</div>,
}))

vi.mock('../../components/ShuffleMetricsModal.tsx', () => ({
  ShuffleMetricsModal: () => <div>shuffle-metrics-modal</div>,
}))

describe('HomeView shell wiring', () => {
  it('passes derived and controller data into the shell and defers lazy modals', async () => {
    const { default: HomeView } = await import('../../components/HomeView')
    const html = renderToStaticMarkup(
      <HomeView
        onStartStudy={() => undefined}
        onStartShuffleStudy={() => undefined}
      />,
    )

    expect(html).toContain('toolbar')
    expect(html).toContain('deck-list')
    expect(html).not.toContain('create-card-modal')
    expect(html).not.toContain('settings-modal')
    expect(html).not.toContain('faq-modal')
    expect(html).not.toContain('future-forecast-modal')
    expect(html).not.toContain('export-modal')
    expect(captured.toolbarProps?.showShuffleOnly).toBe(false)
    expect(captured.deckListProps?.deckScheduleOverview).toEqual({
      'deck-1': {
        today: { total: 5, new: 2, review: 3 },
        tomorrow: { total: 4, new: 1, review: 3 },
      },
    })
    expect(captured.deckListProps?.shuffleSummaries).toEqual({
      'shuffle-1': {
        selectedCount: 7,
        inScopeDecks: 1,
        outOfScopeDecks: 0,
      },
    })
  })
})
