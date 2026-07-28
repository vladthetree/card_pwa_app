/**
 * AI_CONTEXT:
 * Role: Home dialog visibility and active-record state. Keeps modal state
 * separate from DB write commands and export/PWA side effects.
 */
import { useEffect, useState } from 'react'
import { STORAGE_KEYS } from '../../constants/appIdentity'
import type { Deck, ShuffleCollection } from '../../types'

export interface HomeConfirmModalState {
  title: string
  message: string
  confirmLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void
}

export function useHomeDialogs(importRequest?: { token: number; file: File | null } | null) {
  const [showCreateCard, setShowCreateCard] = useState(false)
  const [showCreateDeckModal, setShowCreateDeckModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showFaq, setShowFaq] = useState(false)
  const [showInstallHintModal, setShowInstallHintModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showFutureForecast, setShowFutureForecast] = useState(false)
  const [metricsDeck, setMetricsDeck] = useState<Deck | null>(null)
  const [metricsShuffleCollection, setMetricsShuffleCollection] = useState<ShuffleCollection | null>(null)
  const [cardsDeck, setCardsDeck] = useState<Deck | null>(null)
  const [editingShuffleCollection, setEditingShuffleCollection] = useState<ShuffleCollection | null>(null)
  const [showShuffleCollectionModal, setShowShuffleCollectionModal] = useState(false)
  const [confirmModal, setConfirmModal] = useState<HomeConfirmModalState | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)

  const importRequestToken = importRequest?.token ?? 0
  const importRequestFile = importRequest?.file ?? null
  useEffect(() => {
    if (importRequestToken <= 0) return
    setImportFile(importRequestFile)
    setShowImport(true)
  }, [importRequestToken, importRequestFile])

  const closeImport = () => {
    setShowImport(false)
    setImportFile(null)
    try {
      sessionStorage.removeItem(STORAGE_KEYS.pendingImportRequest)
    } catch { /* best effort */ }
  }

  return {
    showCreateCard,
    showCreateDeckModal,
    showSettings,
    showFaq,
    showInstallHintModal,
    showImport,
    importFile,
    showExportModal,
    showFutureForecast,
    metricsDeck,
    metricsShuffleCollection,
    cardsDeck,
    editingShuffleCollection,
    showShuffleCollectionModal,
    confirmModal,
    setShowCreateDeckModal,
    setShowInstallHintModal,
    setShowExportModal,
    setConfirmModal,
    openCreateCard: () => setShowCreateCard(true),
    closeCreateCard: () => setShowCreateCard(false),
    openSettings: () => setShowSettings(true),
    closeSettings: () => setShowSettings(false),
    openFaq: () => setShowFaq(true),
    closeFaq: () => setShowFaq(false),
    closeInstallHintModal: () => setShowInstallHintModal(false),
    openImport: () => setShowImport(true),
    closeImport,
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
  }
}

