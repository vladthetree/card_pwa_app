import { lazy, Suspense, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useDecks, useGamificationProfile, useShuffleCollections, useStats } from '../hooks/useCardDb'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { useServerHeartbeat } from '../hooks/useServerHeartbeat'
import { STRINGS, useSettings } from '../contexts/SettingsContext'
import type { Deck, ShuffleCollection } from '../types'
import { UI_TOKENS } from '../constants/ui'
import { formatBuildVersionTitle, formatServiceWorkerVersionLabel } from '../utils/buildInfo'
import { HomeHeaderBar } from './home/HomeHeaderBar'
import { HomeStatsSection } from './home/HomeStatsSection'
import { HomeDeckToolbar } from './home/HomeDeckToolbar'
import { HomeDeckListSection } from './home/HomeDeckListSection'
import { HomeShuffleSection } from './home/HomeShuffleSection'
import { useHomeDeckFilters } from '../hooks/home/useHomeDeckFilters'
import { useHomeStorageEstimate } from '../hooks/home/useHomeStorageEstimate'
import { useHomeDerivedData } from '../hooks/home/useHomeDerivedData'
import { useHomeViewController } from '../hooks/home/useHomeViewController'
import { flattenDeckTree } from '../utils/securityDeckHierarchy'

const CreateCardModal = lazy(() => import('./CreateCardModal.tsx'))
const SettingsModal = lazy(() => import('./SettingsModal.tsx'))
const FaqModal = lazy(() => import('./FaqModal.tsx'))
const FutureForecastModal = lazy(() => import('./FutureForecastModal.tsx'))
const ImportView = lazy(() => import('./ImportView.tsx'))
const ConfirmModal = lazy(() => import('./ConfirmModal.tsx'))
const InstallHintModal = lazy(() => import('./InstallHintModal.tsx'))
const DeckMetricsModal = lazy(() => import('./DeckMetricsModal').then(module => ({ default: module.DeckMetricsModal })))
const ShuffleMetricsModal = lazy(() => import('./ShuffleMetricsModal').then(module => ({ default: module.ShuffleMetricsModal })))
const HomeCreateDeckModal = lazy(() => import('./home/HomeCreateDeckModal').then(module => ({ default: module.HomeCreateDeckModal })))
const HomeExportModal = lazy(() => import('./home/HomeExportModal').then(module => ({ default: module.HomeExportModal })))
const HomeDeckCardsModal = lazy(() => import('./home/HomeDeckCardsModal').then(module => ({ default: module.HomeDeckCardsModal })))
const HomeShuffleCollectionModal = lazy(() => import('./home/HomeShuffleCollectionModal').then(module => ({ default: module.HomeShuffleCollectionModal })))

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
  const { storageUsedBytes, storageQuotaBytes, storageEstimateUnavailable } = useHomeStorageEstimate()
  const buildVersionLabel = useMemo(() => formatServiceWorkerVersionLabel(), [])
  const buildVersionTitle = useMemo(() => formatBuildVersionTitle(), [])
  const isShuffleManageMode = mode === 'shuffle-manage'
  const allDecks = useMemo(() => flattenDeckTree(decks), [decks])

  const controller = useHomeViewController({
    t,
    settings: {
      language: settings.language,
      dailyReminderEnabled: settings.dailyReminderEnabled,
      dailyReminderTime: settings.dailyReminderTime,
    },
    reload,
    hasNativePrompt,
    install,
  })

  const derivedData = useHomeDerivedData({
    decks,
    shuffleCollections,
    profileMode: profile?.mode,
    profileUserId: profile?.userId,
    studyCardLimit: settings.studyCardLimit,
    nextDayStartsAt: settings.nextDayStartsAt,
    showFutureForecast: controller.showFutureForecast,
    showExportModal: controller.showExportModal,
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
    deckTagIndex: derivedData.deckTagIndex,
    deckScheduleOverview: derivedData.deckScheduleOverview,
    language: settings.language,
  })

  const renderHeaderBar = () => (
    <HomeHeaderBar
      t={t}
      language={settings.language}
      canInstall={canInstall}
      isInstalled={isInstalled}
      isInstalling={isInstalling}
      isConnected={isConnected}
      notificationPermission={controller.notificationPermission}
      storageEstimateUnavailable={storageEstimateUnavailable}
      storageUsedBytes={storageUsedBytes}
      storageQuotaBytes={storageQuotaBytes}
      onInstall={() => { void controller.handleInstall() }}
      onRequestNotificationPermission={() => { void controller.requestNotificationPermission() }}
      onShowSettings={controller.openSettings}
      onShowFaq={controller.openFaq}
    />
  )

  return (
    <div className={`${UI_TOKENS.layout.homeMaxWidth} mx-auto flex h-full min-h-0 w-full flex-col overflow-hidden px-3 sm:px-4`}>
      <div className="relative z-20 flex-shrink-0 pt-safe-2 sm:pt-safe-4">
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
              mode={controller.dashboardMode}
              stats={stats}
              gamificationProfile={gamificationProfile}
              onOpenFutureForecast={controller.openFutureForecast}
            />
          </div>
        </div>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        {!isShuffleManageMode && (
          <HomeDeckToolbar
            t={t}
            language={settings.language}
            shuffleModeEnabled={settings.shuffleModeEnabled}
            showShuffleOnly={controller.showShuffleOnly}
            deckSearchQuery={deckSearchQuery}
            deckSortMode={deckSortMode}
            dashboardMode={controller.dashboardMode}
            onDeckSearchQueryChange={setDeckSearchQuery}
            onDeckSortModeChange={setDeckSortMode}
            onToggleShuffleOnly={controller.toggleShuffleOnly}
            onDashboardModeChange={controller.setDashboardMode}
            onReload={reload}
            onCreateDeck={controller.openCreateDeckModal}
            onCreateVirtualDeck={controller.openCreateShuffleCollection}
            onCreateCard={controller.openCreateCard}
            onImport={controller.openImport}
            onExport={controller.openExport}
          />
        )}

        {settings.shuffleModeEnabled && isShuffleManageMode && (
          <div className="mb-3 ds-card p-4 sm:p-5">
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
                  className="inline-flex items-center gap-2 rounded-[12px] border border-[#18181b] bg-[#0c0c0c] px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-[#3f3f46] hover:bg-[#111] hover:text-white"
                >
                  <ArrowLeft size={14} />
                  {settings.language === 'de' ? 'Zur Startseite' : 'Back home'}
                </button>
              )}
            </div>
          </div>
        )}

        {settings.shuffleModeEnabled && isShuffleManageMode && (
          <HomeShuffleSection
            language={settings.language}
            collections={shuffleCollections}
            summaries={derivedData.shuffleSummaries}
            onStartShuffleStudy={onStartShuffleStudy}
            onCreateCollection={controller.openCreateShuffleCollection}
            onEditCollection={controller.openEditShuffleCollection}
            onDeleteCollection={controller.handleDeleteShuffleCollection}
            onShowMetrics={controller.openMetricsShuffleCollection}
            onManageCollections={onOpenShuffleManager}
            isManagerView={isShuffleManageMode}
          />
        )}

        {!settings.shuffleModeEnabled && isShuffleManageMode && (
          <div className="rounded-[14px] border border-dashed border-[#18181b] bg-[#0a0a0a] px-4 py-8 text-center shadow-card">
            <p className="text-sm text-white/55">
              {settings.language === 'de'
                ? 'Der Shuffle-Modus ist aktuell in den Einstellungen deaktiviert.'
                : 'Shuffle mode is currently disabled in settings.'}
            </p>
            {onBackHome && (
              <button
                type="button"
                onClick={onBackHome}
                className="mt-4 inline-flex items-center gap-2 rounded-[12px] border border-[#18181b] bg-[#0c0c0c] px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-[#3f3f46] hover:bg-[#111] hover:text-white"
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
            deckScheduleOverview={derivedData.deckScheduleOverview}
            shuffleModeEnabled={settings.shuffleModeEnabled}
            showShuffleOnly={controller.showShuffleOnly}
            shuffleCollections={shuffleCollections}
            shuffleSummaries={derivedData.shuffleSummaries}
            onReload={reload}
            onShowImport={controller.openImport}
            onStartStudy={onStartStudy}
            onStartShuffleStudy={onStartShuffleStudy}
            onEditShuffleCollection={controller.openEditShuffleCollection}
            onDeleteShuffleCollection={controller.handleDeleteShuffleCollection}
            onShowShuffleMetrics={controller.openMetricsShuffleCollection}
            onDelete={controller.handleDelete}
            onShowMetrics={controller.openMetricsDeck}
            onManageCards={controller.openCardsDeck}
          />
        )}
      </div>

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

      <Suspense fallback={null}>
        <AnimatePresence initial={false}>
          {controller.showFutureForecast && (
            <FutureForecastModal
              isOpen
              language={settings.language}
              loading={derivedData.futureForecastLoading}
              forecast={derivedData.futureForecast}
              onClose={controller.closeFutureForecast}
            />
          )}

          {controller.cardsDeck && (
            <HomeDeckCardsModal
              deck={controller.cardsDeck}
              language={settings.language}
              onClose={controller.closeCardsDeck}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {controller.metricsDeck && (
            <DeckMetricsModal
              deck={controller.metricsDeck}
              language={settings.language}
              onClose={controller.closeMetricsDeck}
            />
          )}
          {controller.metricsShuffleCollection && (
            <ShuffleMetricsModal
              collection={controller.metricsShuffleCollection}
              decks={allDecks}
              language={settings.language}
              onClose={controller.closeMetricsShuffleCollection}
            />
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {controller.showInstallHintModal && (
            <InstallHintModal
              isOpen
              title={t.install}
              subtitle={t.install_question}
              hintText={isIos ? t.install_manual_hint_ios : t.install_manual_hint}
              closeLabel={t.close}
              onClose={controller.closeInstallHintModal}
            />
          )}

          {controller.showCreateDeckModal && (
            <HomeCreateDeckModal
              isOpen
              t={t}
              prefersReducedMotion={prefersReducedMotion}
              newDeckName={controller.newDeckName}
              createDeckError={controller.createDeckError}
              isCreatingDeck={controller.isCreatingDeck}
              onClose={controller.closeCreateDeckModal}
              onNewDeckNameChange={controller.setNewDeckName}
              onSubmit={() => { void controller.handleCreateDeck() }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {controller.showExportModal && (
            <HomeExportModal
              isOpen
              t={t}
              prefersReducedMotion={prefersReducedMotion}
              selectedDeckId={controller.selectedDeckId}
              deckOptions={derivedData.deckOptions}
              isExporting={controller.isExporting}
              onClose={controller.closeExport}
              onSelectedDeckIdChange={controller.setSelectedDeckId}
              onExportTxt={() => { void controller.handleExportTxt() }}
              onExportCsv={() => { void controller.handleExportCsv() }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {controller.showShuffleCollectionModal && (
            <HomeShuffleCollectionModal
              isOpen
              language={settings.language}
              prefersReducedMotion={prefersReducedMotion}
              decks={allDecks}
              syncedDeckIds={derivedData.syncedDeckIds}
              studyCardLimit={settings.studyCardLimit}
              nextDayStartsAt={settings.nextDayStartsAt}
              linkedUserId={profile?.mode === 'linked' ? profile.userId : undefined}
              collection={controller.editingShuffleCollection}
              onClose={controller.closeShuffleCollectionModal}
              onSaved={() => {
                void reload()
              }}
            />
          )}
        </AnimatePresence>

        {controller.showCreateCard && <CreateCardModal onClose={controller.closeCreateCard} />}
        {controller.showSettings && <SettingsModal isOpen onClose={controller.closeSettings} />}
        {controller.showFaq && <FaqModal isOpen onClose={controller.closeFaq} />}
        {controller.showImport && <ImportView isOpen onClose={controller.closeImport} />}

        {controller.confirmModal !== null && (
          <ConfirmModal
            isOpen
            title={controller.confirmModal.title}
            message={controller.confirmModal.message}
            confirmLabel={controller.confirmModal.confirmLabel}
            variant={controller.confirmModal.variant}
            onConfirm={controller.confirmAction}
            onCancel={controller.cancelConfirmModal}
          />
        )}
      </Suspense>
    </div>
  )
}
