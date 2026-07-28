/**
 * AI_CONTEXT:
 * Role: Controller hook for HomeView UI state: modals, deck creation/deletion, export, notifications, dashboard mode, shuffle state, and confirmations.
 * Used by: HomeView as the imperative action/state hub.
 * Important: Keep business side effects here when they are home-specific; shared data loading belongs in useHomeDerivedData or db/queries.
 */
import { useCallback, useEffect, useState } from 'react'
import type { HomeDashboardMode } from '../../components/home/HomeStatsSection'
import type { Deck, ShuffleCollection } from '../../types'
import { useHomeExport } from './useHomeExport'
import { useHomeDialogs, type HomeConfirmModalState } from './useHomeDialogs'
import { useDeckCommands } from './useDeckCommands'
import { useShuffleCollectionCommands } from './useShuffleCollectionCommands'
import { usePwaInstallActions } from './usePwaInstallActions'
import {
  persistDashboardMode,
  persistShuffleOnlyMode,
  readInitialDashboardMode,
  readInitialShuffleOnlyMode,
} from './homeControllerHelpers'

export {
  persistDashboardMode,
  persistShuffleOnlyMode,
  readInitialDashboardMode,
  readInitialShuffleOnlyMode,
  submitHomeDeckCreation,
} from './homeControllerHelpers'

export type { HomeConfirmModalState } from './useHomeDialogs'

export function useHomeViewController(input: {
  t: Record<string, string>
  settings: {
    language: 'de' | 'en'
    dailyReminderEnabled: boolean
    dailyReminderTime: string
  }
  reload: () => Promise<unknown> | unknown
  hasNativePrompt: boolean
  install: () => Promise<unknown>
  /** ?view=import / launchQueue: token-getriggerte ImportModal-Öffnung. */
  importRequest?: { token: number; file: File | null } | null
}): {
  showCreateCard: boolean
  showCreateDeckModal: boolean
  newDeckName: string
  createDeckError: string | null
  isCreatingDeck: boolean
  showSettings: boolean
  showFaq: boolean
  showInstallHintModal: boolean
  showImport: boolean
  /** Vorab geladene Datei aus dem File-Handler (launchQueue), sonst null. */
  importFile: File | null
  showExportModal: boolean
  isExporting: boolean
  selectedDeckId: 'all' | string
  showFutureForecast: boolean
  metricsDeck: Deck | null
  metricsShuffleCollection: ShuffleCollection | null
  cardsDeck: Deck | null
  editingShuffleCollection: ShuffleCollection | null
  showShuffleCollectionModal: boolean
  confirmModal: HomeConfirmModalState | null
  notificationPermission: NotificationPermission | 'unsupported'
  dashboardMode: HomeDashboardMode
  showShuffleOnly: boolean
  setNewDeckName: (value: string) => void
  setSelectedDeckId: (value: 'all' | string) => void
  setDashboardMode: (value: HomeDashboardMode) => void
  toggleShuffleOnly: () => void
  openCreateCard: () => void
  closeCreateCard: () => void
  openCreateDeckModal: () => void
  closeCreateDeckModal: () => void
  openSettings: () => void
  closeSettings: () => void
  openFaq: () => void
  closeFaq: () => void
  closeInstallHintModal: () => void
  openImport: () => void
  closeImport: () => void
  openExport: () => void
  closeExport: () => void
  openFutureForecast: () => void
  closeFutureForecast: () => void
  openMetricsDeck: (deck: Deck | null) => void
  closeMetricsDeck: () => void
  openMetricsShuffleCollection: (collection: ShuffleCollection | null) => void
  closeMetricsShuffleCollection: () => void
  openCardsDeck: (deck: Deck | null) => void
  closeCardsDeck: () => void
  openCreateShuffleCollection: () => void
  openEditShuffleCollection: (collection: ShuffleCollection) => void
  closeShuffleCollectionModal: () => void
  confirmAction: () => void
  cancelConfirmModal: () => void
  handleInstall: () => Promise<void>
  requestNotificationPermission: () => Promise<void>
  handleDelete: (deckId: string, name: string) => void
  handleDeleteShuffleCollection: (collection: ShuffleCollection) => void
  handleCreateDeck: () => Promise<void>
  handleExportTxt: () => Promise<void>
  handleExportCsv: () => Promise<void>
  handleExportJson: () => Promise<void>
} {
  const { t, settings, reload, hasNativePrompt, install } = input
  const dialogs = useHomeDialogs(input.importRequest)
  const [selectedDeckId, setSelectedDeckId] = useState<'all' | string>('all')
  const {
    isExporting,
    exportTxt,
    exportCsv,
    exportJson,
  } = useHomeExport(selectedDeckId)
  const deckCommands = useDeckCommands({
    t,
    reload,
    setConfirmModal: dialogs.setConfirmModal,
    closeCreateDeckModal: () => dialogs.setShowCreateDeckModal(false),
  })
  const shuffleCommands = useShuffleCollectionCommands({
    language: settings.language,
    setConfirmModal: dialogs.setConfirmModal,
  })
  const pwaActions = usePwaInstallActions({
    settings,
    hasNativePrompt,
    install,
    openInstallHintModal: () => dialogs.setShowInstallHintModal(true),
  })
  const [dashboardMode, setDashboardMode] = useState<HomeDashboardMode>(readInitialDashboardMode)
  const [showShuffleOnly, setShowShuffleOnly] = useState<boolean>(readInitialShuffleOnlyMode)

  useEffect(() => {
    persistDashboardMode(dashboardMode)
  }, [dashboardMode])

  useEffect(() => {
    persistShuffleOnlyMode(showShuffleOnly)
  }, [showShuffleOnly])

  useEffect(() => {
    if (!navigator.serviceWorker?.controller) return
    navigator.serviceWorker.controller.postMessage({
      type: 'PREFETCH_URLS',
      urls: ['/', '/index.html', '/manifest.json', '/pwa-icons/icon-192.png'],
    })
  }, [])

  const handleExportTxt = useCallback(async () => {
    await exportTxt(() => dialogs.setShowExportModal(false))
  }, [exportTxt])

  const handleExportCsv = useCallback(async () => {
    await exportCsv(() => dialogs.setShowExportModal(false))
  }, [exportCsv])

  const handleExportJson = useCallback(async () => {
    await exportJson(() => dialogs.setShowExportModal(false))
  }, [exportJson])

  return {
    showCreateCard: dialogs.showCreateCard,
    showCreateDeckModal: dialogs.showCreateDeckModal,
    newDeckName: deckCommands.newDeckName,
    createDeckError: deckCommands.createDeckError,
    isCreatingDeck: deckCommands.isCreatingDeck,
    showSettings: dialogs.showSettings,
    showFaq: dialogs.showFaq,
    showInstallHintModal: dialogs.showInstallHintModal,
    showImport: dialogs.showImport,
    importFile: dialogs.importFile,
    showExportModal: dialogs.showExportModal,
    isExporting,
    selectedDeckId,
    showFutureForecast: dialogs.showFutureForecast,
    metricsDeck: dialogs.metricsDeck,
    metricsShuffleCollection: dialogs.metricsShuffleCollection,
    cardsDeck: dialogs.cardsDeck,
    editingShuffleCollection: dialogs.editingShuffleCollection,
    showShuffleCollectionModal: dialogs.showShuffleCollectionModal,
    confirmModal: dialogs.confirmModal,
    notificationPermission: pwaActions.notificationPermission,
    dashboardMode,
    showShuffleOnly,
    setNewDeckName: deckCommands.setNewDeckName,
    setSelectedDeckId,
    setDashboardMode,
    toggleShuffleOnly: () => setShowShuffleOnly(current => !current),
    openCreateCard: dialogs.openCreateCard,
    closeCreateCard: dialogs.closeCreateCard,
    openCreateDeckModal: () => deckCommands.openCreateDeckModal(() => dialogs.setShowCreateDeckModal(true)),
    closeCreateDeckModal: () => dialogs.setShowCreateDeckModal(false),
    openSettings: dialogs.openSettings,
    closeSettings: dialogs.closeSettings,
    openFaq: dialogs.openFaq,
    closeFaq: dialogs.closeFaq,
    closeInstallHintModal: dialogs.closeInstallHintModal,
    openImport: dialogs.openImport,
    closeImport: dialogs.closeImport,
    openExport: dialogs.openExport,
    closeExport: dialogs.closeExport,
    openFutureForecast: dialogs.openFutureForecast,
    closeFutureForecast: dialogs.closeFutureForecast,
    openMetricsDeck: dialogs.openMetricsDeck,
    closeMetricsDeck: dialogs.closeMetricsDeck,
    openMetricsShuffleCollection: dialogs.openMetricsShuffleCollection,
    closeMetricsShuffleCollection: dialogs.closeMetricsShuffleCollection,
    openCardsDeck: dialogs.openCardsDeck,
    closeCardsDeck: dialogs.closeCardsDeck,
    openCreateShuffleCollection: dialogs.openCreateShuffleCollection,
    openEditShuffleCollection: dialogs.openEditShuffleCollection,
    closeShuffleCollectionModal: dialogs.closeShuffleCollectionModal,
    confirmAction: dialogs.confirmAction,
    cancelConfirmModal: dialogs.cancelConfirmModal,
    handleInstall: pwaActions.handleInstall,
    requestNotificationPermission: pwaActions.requestNotificationPermission,
    handleDelete: deckCommands.handleDelete,
    handleDeleteShuffleCollection: shuffleCommands.handleDeleteShuffleCollection,
    handleCreateDeck: deckCommands.handleCreateDeck,
    handleExportTxt,
    handleExportCsv,
    handleExportJson,
  }
}
