import { useCallback, useEffect, useState } from 'react'
import type { HomeDashboardMode } from '../../components/home/HomeStatsSection'
import { STORAGE_KEYS } from '../../constants/appIdentity'
import type { Deck, ShuffleCollection } from '../../types'
import { createDeck, deleteDeck, deleteShuffleCollection } from '../../db/queries'
import { exportDbBackupAsCsv, exportDbBackupAsTxt } from '../../utils/dbBackup'
import { subscribeToWebPushNotifications } from '../../services/webPush'

export interface HomeConfirmModalState {
  title: string
  message: string
  confirmLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void
}

interface HomeDeckCreateStrings {
  deck_name_empty: string
  deck_name_exists: string
  save_failed: string
}

export function readInitialDashboardMode(): HomeDashboardMode {
  if (typeof window === 'undefined') return 'kpi'
  const stored = window.localStorage.getItem(STORAGE_KEYS.homeDashboardMode)
  if (stored === 'heatmap' || stored === 'life' || stored === 'pilot') return stored
  return window.localStorage.getItem(STORAGE_KEYS.homeShowHeatmap) === '1' ? 'heatmap' : 'kpi'
}

export function persistDashboardMode(mode: HomeDashboardMode): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEYS.homeDashboardMode, mode)
  window.localStorage.setItem(STORAGE_KEYS.homeShowHeatmap, mode === 'heatmap' ? '1' : '0')
}

export function readInitialShuffleOnlyMode(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(STORAGE_KEYS.homeShuffleOnlyMode) === '1'
}

export function persistShuffleOnlyMode(value: boolean): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEYS.homeShuffleOnlyMode, value ? '1' : '0')
}

export async function submitHomeDeckCreation(
  deckName: string,
  strings: HomeDeckCreateStrings,
  createDeckFn: typeof createDeck = createDeck,
): Promise<{ ok: boolean; error: string | null }> {
  const trimmed = deckName.trim()
  if (!trimmed) {
    return { ok: false, error: strings.deck_name_empty }
  }

  const result = await createDeckFn(trimmed)
  if (!result.ok) {
    const isDuplicate = result.error?.toLowerCase().includes('already exists') ?? false
    return {
      ok: false,
      error: isDuplicate ? strings.deck_name_exists : (result.error ?? strings.save_failed),
    }
  }

  return { ok: true, error: null }
}

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
} {
  const { t, settings, reload, hasNativePrompt, install } = input
  const [showCreateCard, setShowCreateCard] = useState(false)
  const [showCreateDeckModal, setShowCreateDeckModal] = useState(false)
  const [newDeckName, setNewDeckName] = useState('')
  const [createDeckError, setCreateDeckError] = useState<string | null>(null)
  const [isCreatingDeck, setIsCreatingDeck] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showFaq, setShowFaq] = useState(false)
  const [showInstallHintModal, setShowInstallHintModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [selectedDeckId, setSelectedDeckId] = useState<'all' | string>('all')
  const [showFutureForecast, setShowFutureForecast] = useState(false)
  const [metricsDeck, setMetricsDeck] = useState<Deck | null>(null)
  const [metricsShuffleCollection, setMetricsShuffleCollection] = useState<ShuffleCollection | null>(null)
  const [cardsDeck, setCardsDeck] = useState<Deck | null>(null)
  const [editingShuffleCollection, setEditingShuffleCollection] = useState<ShuffleCollection | null>(null)
  const [showShuffleCollectionModal, setShowShuffleCollectionModal] = useState(false)
  const [confirmModal, setConfirmModal] = useState<HomeConfirmModalState | null>(null)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof Notification === 'undefined') return 'unsupported'
    return Notification.permission
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

  const handleInstall = useCallback(async () => {
    if (hasNativePrompt) {
      await install()
      return
    }
    setShowInstallHintModal(true)
  }, [hasNativePrompt, install])

  const requestNotificationPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return

    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)

      if (permission === 'granted') {
        void subscribeToWebPushNotifications(settings.language, {
          enabled: settings.dailyReminderEnabled,
          time: settings.dailyReminderTime,
        })
      }
    } catch {
      // no-op: permission prompt is best effort
    }
  }, [settings.dailyReminderEnabled, settings.dailyReminderTime, settings.language])

  const handleDelete = useCallback((deckId: string, name: string) => {
    setConfirmModal({
      title: t.deck_delete_title,
      message: t.delete_deck_confirm.replace('{name}', name),
      confirmLabel: t.yes_delete,
      variant: 'danger',
      onConfirm: () => {
        void (async () => {
          await deleteDeck(deckId)
          await reload()
        })()
      },
    })
  }, [reload, t.deck_delete_title, t.delete_deck_confirm, t.yes_delete])

  const handleDeleteShuffleCollection = useCallback((collection: ShuffleCollection) => {
    setConfirmModal({
      title: settings.language === 'de' ? 'Shuffle-Sammlung löschen' : 'Delete shuffle collection',
      message: settings.language === 'de'
        ? `Soll "${collection.name}" wirklich gelöscht werden?`
        : `Do you really want to delete "${collection.name}"?`,
      confirmLabel: settings.language === 'de' ? 'Ja, löschen' : 'Yes, delete',
      variant: 'danger',
      onConfirm: () => {
        void deleteShuffleCollection(collection.id)
      },
    })
  }, [settings.language])

  const handleCreateDeck = useCallback(async () => {
    setIsCreatingDeck(true)
    const result = await submitHomeDeckCreation(newDeckName, {
      deck_name_empty: t.deck_name_empty,
      deck_name_exists: t.deck_name_exists,
      save_failed: t.save_failed,
    })
    setIsCreatingDeck(false)

    if (!result.ok) {
      setCreateDeckError(result.error)
      return
    }

    setCreateDeckError(null)
    setShowCreateDeckModal(false)
    setNewDeckName('')
    await reload()
  }, [newDeckName, reload, t.deck_name_empty, t.deck_name_exists, t.save_failed])

  const selectedDeckIds = selectedDeckId === 'all' ? undefined : [selectedDeckId]

  const handleExportTxt = useCallback(async () => {
    try {
      setIsExporting(true)
      await exportDbBackupAsTxt({ deckIds: selectedDeckIds })
      setShowExportModal(false)
    } finally {
      setIsExporting(false)
    }
  }, [selectedDeckIds])

  const handleExportCsv = useCallback(async () => {
    try {
      setIsExporting(true)
      await exportDbBackupAsCsv({ deckIds: selectedDeckIds })
      setShowExportModal(false)
    } finally {
      setIsExporting(false)
    }
  }, [selectedDeckIds])

  return {
    showCreateCard,
    showCreateDeckModal,
    newDeckName,
    createDeckError,
    isCreatingDeck,
    showSettings,
    showFaq,
    showInstallHintModal,
    showImport,
    showExportModal,
    isExporting,
    selectedDeckId,
    showFutureForecast,
    metricsDeck,
    metricsShuffleCollection,
    cardsDeck,
    editingShuffleCollection,
    showShuffleCollectionModal,
    confirmModal,
    notificationPermission,
    dashboardMode,
    showShuffleOnly,
    setNewDeckName,
    setSelectedDeckId,
    setDashboardMode,
    toggleShuffleOnly: () => setShowShuffleOnly(current => !current),
    openCreateCard: () => setShowCreateCard(true),
    closeCreateCard: () => setShowCreateCard(false),
    openCreateDeckModal: () => {
      setNewDeckName('')
      setCreateDeckError(null)
      setShowCreateDeckModal(true)
    },
    closeCreateDeckModal: () => setShowCreateDeckModal(false),
    openSettings: () => setShowSettings(true),
    closeSettings: () => setShowSettings(false),
    openFaq: () => setShowFaq(true),
    closeFaq: () => setShowFaq(false),
    closeInstallHintModal: () => setShowInstallHintModal(false),
    openImport: () => setShowImport(true),
    closeImport: () => setShowImport(false),
    openExport: () => setShowExportModal(true),
    closeExport: () => setShowExportModal(false),
    openFutureForecast: () => setShowFutureForecast(true),
    closeFutureForecast: () => setShowFutureForecast(false),
    openMetricsDeck: setMetricsDeck,
    closeMetricsDeck: () => setMetricsDeck(null),
    openMetricsShuffleCollection: setMetricsShuffleCollection,
    closeMetricsShuffleCollection: () => setMetricsShuffleCollection(null),
    openCardsDeck: setCardsDeck,
    closeCardsDeck: () => setCardsDeck(null),
    openCreateShuffleCollection: () => {
      setEditingShuffleCollection(null)
      setShowShuffleCollectionModal(true)
    },
    openEditShuffleCollection: (collection: ShuffleCollection) => {
      setEditingShuffleCollection(collection)
      setShowShuffleCollectionModal(true)
    },
    closeShuffleCollectionModal: () => {
      setShowShuffleCollectionModal(false)
      setEditingShuffleCollection(null)
    },
    confirmAction: () => {
      confirmModal?.onConfirm()
      setConfirmModal(null)
    },
    cancelConfirmModal: () => setConfirmModal(null),
    handleInstall,
    requestNotificationPermission,
    handleDelete,
    handleDeleteShuffleCollection,
    handleCreateDeck,
    handleExportTxt,
    handleExportCsv,
  }
}
