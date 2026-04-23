import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  createDeck,
  deleteDeck,
  deleteShuffleCollection,
  fetchDeckCards,
  getDeckScheduleOverview,
  getFutureDueForecast,
} from '../db/queries'
import { useDecks, useGamificationProfile, useShuffleCollections, useStats } from '../hooks/useCardDb'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { useServerHeartbeat } from '../hooks/useServerHeartbeat'
import { STRINGS, useSettings } from '../contexts/SettingsContext'
import { exportDbBackupAsCsv, exportDbBackupAsTxt, listDecksForBackup } from '../utils/dbBackup'
import CreateCardModal from './CreateCardModal.tsx'
import SettingsModal from './SettingsModal.tsx'
import FaqModal from './FaqModal.tsx'
import FutureForecastModal from './FutureForecastModal.tsx'
import ImportView from './ImportView.tsx'
import ConfirmModal from './ConfirmModal.tsx'
import InstallHintModal from './InstallHintModal.tsx'
import type { Deck, DeckScheduleOverview, ShuffleCollection } from '../types'
import { STORAGE_KEYS } from '../constants/appIdentity'
import { UI_TOKENS } from '../constants/ui'
import { DeckMetricsModal } from './DeckMetricsModal'
import { subscribeToWebPushNotifications } from '../services/webPush'
import { formatBuildVersionTitle, formatServiceWorkerVersionLabel } from '../utils/buildInfo'
import { HomeHeaderBar } from './home/HomeHeaderBar'
import { HomeStatsSection, type HomeDashboardMode } from './home/HomeStatsSection'
import { HomeDeckToolbar } from './home/HomeDeckToolbar'
import { HomeDeckListSection } from './home/HomeDeckListSection'
import { HomeCreateDeckModal } from './home/HomeCreateDeckModal'
import { HomeExportModal } from './home/HomeExportModal'
import { HomeDeckCardsModal } from './home/HomeDeckCardsModal'
import { HomeShuffleCollectionModal } from './home/HomeShuffleCollectionModal'
import { HomeShuffleSection } from './home/HomeShuffleSection'
import { useHomeDeckFilters } from '../hooks/home/useHomeDeckFilters'
import { useHomeStorageEstimate } from '../hooks/home/useHomeStorageEstimate'
import { buildSelectedShuffleCards } from '../services/ShuffleSessionManager'
import { getSyncedDeckIds } from '../services/syncedDeckScope'
import { ArrowLeft } from 'lucide-react'

interface Props {
  mode?: 'default' | 'shuffle-manage'
  onBackHome?: () => void
  onStartStudy: (deck: Deck) => void
  onStartShuffleStudy: (collection: ShuffleCollection) => void
  onOpenShuffleManager?: () => void
}
export default function HomeView({
  mode = 'default',
  onBackHome,
  onStartStudy,
  onStartShuffleStudy,
  onOpenShuffleManager,
}: Props) {
  const { decks, loading, error, reload } = useDecks()
  const { collections: shuffleCollections } = useShuffleCollections()
  const { settings, profile } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const { stats } = useStats(settings.nextDayStartsAt, settings.studyCardLimit)
  const { profile: gamificationProfile } = useGamificationProfile(settings.nextDayStartsAt)
  const t = STRINGS[settings.language]
  const { canInstall, isInstalled, hasNativePrompt, isIos, isInstalling, install } = usePwaInstall()
  const { isConnected } = useServerHeartbeat(settings.language)
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
  const [deckOptions, setDeckOptions] = useState<Array<{ id: string; name: string }>>([])
  const [selectedDeckId, setSelectedDeckId] = useState<'all' | string>('all')
  const [deckScheduleOverview, setDeckScheduleOverview] = useState<Record<string, DeckScheduleOverview>>({})
  const [deckTagIndex, setDeckTagIndex] = useState<Record<string, string[]>>({})
  const [showFutureForecast, setShowFutureForecast] = useState(false)
  const [futureForecast, setFutureForecast] = useState<Array<{ dayStartMs: number; count: number }>>([])
  const [futureForecastLoading, setFutureForecastLoading] = useState(false)
  const [metricsDeck, setMetricsDeck] = useState<Deck | null>(null)
  const [cardsDeck, setCardsDeck] = useState<Deck | null>(null)
  const [shuffleSummaries, setShuffleSummaries] = useState<Record<string, { selectedCount: number; inScopeDecks: number; outOfScopeDecks: number }>>({})
  const [syncedDeckIds, setSyncedDeckIds] = useState<string[]>([])
  const [editingShuffleCollection, setEditingShuffleCollection] = useState<ShuffleCollection | null>(null)
  const [showShuffleCollectionModal, setShowShuffleCollectionModal] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{
    title: string
    message: string
    confirmLabel?: string
    variant?: 'danger' | 'default'
    onConfirm: () => void
  } | null>(null)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof Notification === 'undefined') return 'unsupported'
    return Notification.permission
  })
  const [dashboardMode, setDashboardMode] = useState<HomeDashboardMode>(() => {
    if (typeof window === 'undefined') return 'kpi'
    const stored = window.localStorage.getItem(STORAGE_KEYS.homeDashboardMode)
    if (stored === 'heatmap' || stored === 'life' || stored === 'pilot') return stored
    return window.localStorage.getItem(STORAGE_KEYS.homeShowHeatmap) === '1' ? 'heatmap' : 'kpi'
  })
  const {
    deckSearchQuery,
    setDeckSearchQuery,
    deckSortMode,
    setDeckSortMode,
    filteredDecks,
    visibleDecks,
  } = useHomeDeckFilters({
    decks,
    deckTagIndex,
    deckScheduleOverview,
    language: settings.language,
  })
  const {
    storageUsedBytes,
    storageQuotaBytes,
    storageEstimateUnavailable,
  } = useHomeStorageEstimate()
  const buildVersionLabel = useMemo(() => formatServiceWorkerVersionLabel(), [])
  const buildVersionTitle = useMemo(() => formatBuildVersionTitle(), [])
  const isShuffleManageMode = mode === 'shuffle-manage'

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.homeDashboardMode, dashboardMode)
    window.localStorage.setItem(STORAGE_KEYS.homeShowHeatmap, dashboardMode === 'heatmap' ? '1' : '0')
  }, [dashboardMode])

  useEffect(() => {
    if (!navigator.serviceWorker?.controller) return
    navigator.serviceWorker.controller.postMessage({
      type: 'PREFETCH_URLS',
      urls: ['/', '/index.html', '/manifest.json', '/pwa-icons/icon-192.png'],
    })
  }, [])

  useEffect(() => {
    if (!showExportModal) return
    void listDecksForBackup().then(setDeckOptions)
  }, [showExportModal])

  useEffect(() => {
    if (!showFutureForecast) return
    let cancelled = false

    setFutureForecastLoading(true)

    const loadForecast = async () => {
      try {
        const data = await getFutureDueForecast(15, settings.nextDayStartsAt)
        if (!cancelled) setFutureForecast(data)
      } finally {
        if (!cancelled) setFutureForecastLoading(false)
      }
    }

    void loadForecast()
    return () => {
      cancelled = true
    }
  }, [showFutureForecast, settings.nextDayStartsAt])

  useEffect(() => {
    let cancelled = false

    const resolveUserId = profile?.mode === 'linked' ? profile.userId : undefined
    const loadSyncedScope = async () => {
      const ids = await getSyncedDeckIds(resolveUserId)
      if (!cancelled) setSyncedDeckIds(ids)
    }

    void loadSyncedScope()

    return () => {
      cancelled = true
    }
  }, [decks, profile?.mode, profile?.userId])

  useEffect(() => {
    let cancelled = false

    const resolveUserId = profile?.mode === 'linked' ? profile.userId : undefined

    const loadShuffleSummaries = async () => {
      if (shuffleCollections.length === 0) {
        setShuffleSummaries({})
        return
      }

      const syncedScope = new Set(await getSyncedDeckIds(resolveUserId))
      const entries = await Promise.all(
        shuffleCollections.map(async collection => {
          const selectedCards = await buildSelectedShuffleCards(collection, {
            userId: resolveUserId,
            maxCards: settings.studyCardLimit,
            nextDayStartsAt: settings.nextDayStartsAt,
          })
          const inScopeDecks = collection.deckIds.filter(deckId => syncedScope.has(deckId)).length
          return [
            collection.id,
            {
              selectedCount: selectedCards.length,
              inScopeDecks,
              outOfScopeDecks: Math.max(0, collection.deckIds.length - inScopeDecks),
            },
          ] as const
        }),
      )

      if (!cancelled) {
        setShuffleSummaries(Object.fromEntries(entries))
      }
    }

    void loadShuffleSummaries()
    return () => {
      cancelled = true
    }
  }, [profile?.mode, profile?.userId, settings.nextDayStartsAt, settings.studyCardLimit, shuffleCollections])

  useEffect(() => {
    let cancelled = false

    const loadSchedule = async () => {
      if (decks.length === 0) {
        setDeckScheduleOverview({})
        return
      }

      const overview = await getDeckScheduleOverview(
        decks.map(deck => deck.id),
        settings.studyCardLimit,
        settings.nextDayStartsAt
      )

      if (!cancelled) {
        setDeckScheduleOverview(overview)
      }
    }

    void loadSchedule()
    return () => {
      cancelled = true
    }
  }, [decks, settings.studyCardLimit, settings.nextDayStartsAt])

  useEffect(() => {
    let cancelled = false

    const loadDeckTags = async () => {
      if (decks.length === 0) {
        setDeckTagIndex({})
        return
      }

      const entries = await Promise.all(
        decks.map(async deck => {
          const cards = await fetchDeckCards(deck.id)
          const tags = Array.from(
            new Set(
              cards
                .flatMap(card => card.tags)
                .map(tag => tag.trim().toLowerCase())
                .filter(Boolean)
            )
          )
          return [deck.id, tags] as const
        })
      )

      if (!cancelled) {
        setDeckTagIndex(Object.fromEntries(entries))
      }
    }

    void loadDeckTags()

    return () => {
      cancelled = true
    }
  }, [decks])

  const requestNotificationPermission = async () => {
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
  }

  const handleDelete = (deckId: string, name: string) => {
    setConfirmModal({
      title: t.deck_delete_title,
      message: t.delete_deck_confirm.replace('{name}', name),
      confirmLabel: t.yes_delete,
      variant: 'danger',
      onConfirm: async () => {
        await deleteDeck(deckId)
        reload()
      },
    })
  }

  const handleInstall = async () => {
    if (hasNativePrompt) {
      await install()
      return
    }

    setShowInstallHintModal(true)
  }

  const openCreateShuffleCollection = () => {
    setEditingShuffleCollection(null)
    setShowShuffleCollectionModal(true)
  }

  const openEditShuffleCollection = (collection: ShuffleCollection) => {
    setEditingShuffleCollection(collection)
    setShowShuffleCollectionModal(true)
  }

  const handleDeleteShuffleCollection = (collection: ShuffleCollection) => {
    setConfirmModal({
      title: settings.language === 'de' ? 'Shuffle-Sammlung löschen' : 'Delete shuffle collection',
      message: settings.language === 'de'
        ? `Soll "${collection.name}" wirklich gelöscht werden?`
        : `Do you really want to delete "${collection.name}"?`,
      confirmLabel: settings.language === 'de' ? 'Ja, löschen' : 'Yes, delete',
      variant: 'danger',
      onConfirm: async () => {
        await deleteShuffleCollection(collection.id)
      },
    })
  }

  const selectedDeckIds = selectedDeckId === 'all' ? undefined : [selectedDeckId]

  const handleExportTxt = async () => {
    try {
      setIsExporting(true)
      await exportDbBackupAsTxt({ deckIds: selectedDeckIds })
      setShowExportModal(false)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportCsv = async () => {
    try {
      setIsExporting(true)
      await exportDbBackupAsCsv({ deckIds: selectedDeckIds })
      setShowExportModal(false)
    } finally {
      setIsExporting(false)
    }
  }

  const handleCreateDeck = async () => {
    const trimmed = newDeckName.trim()
    if (!trimmed) {
      setCreateDeckError(t.deck_name_empty)
      return
    }

    setCreateDeckError(null)
    setIsCreatingDeck(true)
    const result = await createDeck(trimmed)
    setIsCreatingDeck(false)

    if (!result.ok) {
      const isDuplicate = result.error?.toLowerCase().includes('already exists') ?? false
      setCreateDeckError(isDuplicate ? t.deck_name_exists : (result.error ?? t.save_failed))
      return
    }

    setShowCreateDeckModal(false)
    setNewDeckName('')
    await reload()
  }

  const renderHeaderBar = () => (
    <HomeHeaderBar
      t={t}
      language={settings.language}
      canInstall={canInstall}
      isInstalled={isInstalled}
      isInstalling={isInstalling}
      isConnected={isConnected}
      notificationPermission={notificationPermission}
      storageEstimateUnavailable={storageEstimateUnavailable}
      storageUsedBytes={storageUsedBytes}
      storageQuotaBytes={storageQuotaBytes}
      onInstall={() => { void handleInstall() }}
      onRequestNotificationPermission={() => { void requestNotificationPermission() }}
      onShowSettings={() => setShowSettings(true)}
      onShowFaq={() => setShowFaq(true)}
    />
  )

  return (
    <div className={`${UI_TOKENS.layout.homeMaxWidth} mx-auto flex h-[100dvh] flex-col overflow-hidden px-3 sm:px-4`}>
      <div className="relative z-20 flex-shrink-0 pt-2.5 sm:pt-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-2 md:hidden"
        >
          {renderHeaderBar()}
        </motion.div>

        <div className="grid gap-2 sm:gap-3 md:min-h-[140px]">
          <div className="w-full min-w-0 flex flex-col gap-3">
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="hidden md:block"
            >
              {renderHeaderBar()}
            </motion.div>

            <HomeStatsSection
              t={t}
              language={settings.language}
              mode={dashboardMode}
              stats={stats}
              gameOfLifeViewMode={settings.gameOfLifeViewMode}
              gameOfLifeAnimationSpeed={settings.gameOfLifeAnimationSpeed}
              gamificationProfile={gamificationProfile}
              onOpenFutureForecast={() => {
                setFutureForecastLoading(true)
                setShowFutureForecast(true)
              }}
            />
          </div>
        </div>
      </div>{/* /top-static-section */}

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        {!isShuffleManageMode && (
          <>
            <HomeDeckToolbar
              t={t}
              language={settings.language}
              deckSearchQuery={deckSearchQuery}
              deckSortMode={deckSortMode}
              dashboardMode={dashboardMode}
              onDeckSearchQueryChange={setDeckSearchQuery}
              onDeckSortModeChange={setDeckSortMode}
              onDashboardModeChange={setDashboardMode}
              onReload={reload}
              onCreateDeck={() => {
                setNewDeckName('')
                setCreateDeckError(null)
                setShowCreateDeckModal(true)
              }}
              onCreateCard={() => setShowCreateCard(true)}
              onImport={() => setShowImport(true)}
              onExport={() => setShowExportModal(true)}
            />
          </>
        )}

        {settings.shuffleModeEnabled && isShuffleManageMode && (
          <div className="mb-3 rounded-[28px] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.18em] text-amber-200/75">
                  {settings.language === 'de' ? 'Shuffle-Verwaltung' : 'Shuffle manager'}
                </div>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  {settings.language === 'de' ? 'Sammlungen pflegen und direkt starten' : 'Maintain and launch collections'}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-white/55">
                  {settings.language === 'de'
                    ? 'Hier bearbeitest du deck-übergreifende Lernmischungen. Bewertungen bleiben weiterhin im jeweiligen Ursprungsdeck.'
                    : 'Maintain your cross-deck study mixes here. Reviews still flow back to each source deck.'}
                </p>
              </div>
              {onBackHome && (
                <button
                  type="button"
                  onClick={onBackHome}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeft size={14} />
                  {settings.language === 'de' ? 'Zur Startseite' : 'Back home'}
                </button>
              )}
            </div>
          </div>
        )}

        {settings.shuffleModeEnabled && (
          <HomeShuffleSection
            language={settings.language}
            collections={shuffleCollections}
            summaries={shuffleSummaries}
            onStartShuffleStudy={onStartShuffleStudy}
            onCreateCollection={openCreateShuffleCollection}
            onEditCollection={openEditShuffleCollection}
            onDeleteCollection={handleDeleteShuffleCollection}
            onManageCollections={onOpenShuffleManager}
            isManagerView={isShuffleManageMode}
          />
        )}

        {!settings.shuffleModeEnabled && isShuffleManageMode && (
          <div className="rounded-[28px] border border-dashed border-white/12 bg-black/20 px-4 py-8 text-center">
            <p className="text-sm text-white/55">
              {settings.language === 'de'
                ? 'Der Shuffle-Modus ist aktuell in den Einstellungen deaktiviert.'
                : 'Shuffle mode is currently disabled in settings.'}
            </p>
            {onBackHome && (
              <button
                type="button"
                onClick={onBackHome}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft size={14} />
                {settings.language === 'de' ? 'Zur Startseite' : 'Back home'}
              </button>
            )}
          </div>
        )}

        {!isShuffleManageMode && (
          <HomeDeckListSection
            t={t}
            language={settings.language}
            error={error}
            loading={loading}
            decks={decks}
            filteredDecks={filteredDecks}
            visibleDecks={visibleDecks}
            deckScheduleOverview={deckScheduleOverview}
            onReload={reload}
            onShowImport={() => setShowImport(true)}
            onStartStudy={onStartStudy}
            onDelete={handleDelete}
            onShowMetrics={setMetricsDeck}
            onManageCards={setCardsDeck}
          />
        )}
      </div>{/* /decks-section */}

      {settings.showBuildVersion && (
        <div className="pointer-events-none mt-2 mb-1 flex justify-end pr-1">
          <span
            title={buildVersionTitle}
            className="text-[10px] font-mono tracking-[0.12em] text-white/18 select-none"
          >
            {buildVersionLabel}
          </span>
        </div>
      )}

      <AnimatePresence initial={false}>
        <FutureForecastModal
          isOpen={showFutureForecast}
          language={settings.language}
          loading={futureForecastLoading}
          forecast={futureForecast}
          onClose={() => setShowFutureForecast(false)}
        />

        {cardsDeck && (
          <HomeDeckCardsModal
            deck={cardsDeck}
            language={settings.language}
            onClose={() => setCardsDeck(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {metricsDeck && (
          <DeckMetricsModal
            deck={metricsDeck}
            language={settings.language}
            onClose={() => setMetricsDeck(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        <InstallHintModal
          isOpen={showInstallHintModal}
          title={t.install}
          subtitle={t.install_question}
          hintText={isIos ? t.install_manual_hint_ios : t.install_manual_hint}
          closeLabel={t.close}
          onClose={() => setShowInstallHintModal(false)}
        />

        <HomeCreateDeckModal
          isOpen={showCreateDeckModal}
          t={t}
          prefersReducedMotion={prefersReducedMotion}
          newDeckName={newDeckName}
          createDeckError={createDeckError}
          isCreatingDeck={isCreatingDeck}
          onClose={() => setShowCreateDeckModal(false)}
          onNewDeckNameChange={setNewDeckName}
          onSubmit={() => { void handleCreateDeck() }}
        />
      </AnimatePresence>

      <AnimatePresence initial={false}>
        <HomeExportModal
          isOpen={showExportModal}
          t={t}
          prefersReducedMotion={prefersReducedMotion}
          selectedDeckId={selectedDeckId}
          deckOptions={deckOptions}
          isExporting={isExporting}
          onClose={() => setShowExportModal(false)}
          onSelectedDeckIdChange={setSelectedDeckId}
          onExportTxt={() => { void handleExportTxt() }}
          onExportCsv={() => { void handleExportCsv() }}
        />
      </AnimatePresence>

      <AnimatePresence initial={false}>
        <HomeShuffleCollectionModal
          isOpen={showShuffleCollectionModal}
          language={settings.language}
          prefersReducedMotion={prefersReducedMotion}
          decks={decks}
          syncedDeckIds={syncedDeckIds}
          studyCardLimit={settings.studyCardLimit}
          nextDayStartsAt={settings.nextDayStartsAt}
          linkedUserId={profile?.mode === 'linked' ? profile.userId : undefined}
          collection={editingShuffleCollection}
          onClose={() => {
            setShowShuffleCollectionModal(false)
            setEditingShuffleCollection(null)
          }}
          onSaved={() => {
            void reload()
          }}
        />
      </AnimatePresence>

      {showCreateCard && <CreateCardModal onClose={() => setShowCreateCard(false)} />}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <FaqModal isOpen={showFaq} onClose={() => setShowFaq(false)} />
      <ImportView isOpen={showImport} onClose={() => setShowImport(false)} />

      <ConfirmModal
        isOpen={confirmModal !== null}
        title={confirmModal?.title ?? ''}
        message={confirmModal?.message ?? ''}
        confirmLabel={confirmModal?.confirmLabel}
        variant={confirmModal?.variant}
        onConfirm={() => {
          confirmModal?.onConfirm()
          setConfirmModal(null)
        }}
        onCancel={() => setConfirmModal(null)}
      />
    </div>
  )
}
