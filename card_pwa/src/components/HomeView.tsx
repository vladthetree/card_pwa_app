/**
 * AI_CONTEXT:
 * Role: Main dashboard/controller view for decks, tags, shuffle collections, stats, exports, imports, settings, daily quest, labs, and videos entry points.
 * Used by: App.tsx for the home and shuffle-management modes.
 * Important: Most state is delegated to hooks/home/*; keep this file as orchestration/glue, not raw data-query logic.
 */
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from '../ui/motion'
import { ArrowLeft, Play } from 'lucide-react'
import { useDecks, useGamificationProfile, useShuffleCollections, useStats } from '../hooks/useCardDb'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { useServerHeartbeat } from '../hooks/useServerHeartbeat'
import { STRINGS, useSettings } from '../contexts/SettingsContext'
import type { Card, Deck, ShuffleCollection } from '../types'
import { UI_TOKENS } from '../constants/ui'
import { HomeHeaderBar } from './home/HomeHeaderBar'
import { HomeStatsSection } from './home/HomeStatsSection'
import { HomeDeckToolbar } from './home/HomeDeckToolbar'
import { HomeDeckListSection } from './home/HomeDeckListSection'
import { HomeShuffleSection } from './home/HomeShuffleSection'
import { HomeBottomBar } from './home/HomeBottomBar'
import { HomeTagBrowseSection } from './home/HomeTagBrowseSection'
import { HomeTodayPackageTile } from './home/HomeTodayPackageTile'
import { useTagCardIndex } from '../hooks/home/useTagCardIndex'
import { useHomeDeckFilters } from '../hooks/home/useHomeDeckFilters'
import { useHomeStorageEstimate } from '../hooks/home/useHomeStorageEstimate'
import { useHomeDerivedData } from '../hooks/home/useHomeDerivedData'
import { useHomeViewController } from '../hooks/home/useHomeViewController'
import { useTodayPackage } from '../hooks/home/useTodayPackage'
import { computeExamPacing } from '../utils/todayPackage'
import { flattenDeckTree } from '../utils/securityDeckHierarchy'
import { isReviewDeck } from '../utils/reviewDecks'
import { pickDailyQuestCards } from '../db/queries'

const CreateCardModal = lazy(() => import('./CreateCardModal.tsx'))
const SettingsModal = lazy(() => import('./SettingsModal.tsx'))
const FaqModal = lazy(() => import('./FaqModal.tsx'))
const FutureForecastModal = lazy(() => import('./FutureForecastModal.tsx'))
const ImportModal = lazy(() => import('./ImportModal.tsx'))
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
  onStartTagStudy?: (tag: string, cards: Card[]) => void
  onStartShuffleStudy: (collection: ShuffleCollection) => void
  onOpenShuffleManager?: () => void
  /** Daily Quest (Pilot-Kachel): gemischte Session über mehrere Decks. */
  onStartDailyQuest?: (cards: Card[]) => void
  /** Labs (Ansichten-Menü, Beleg `…23.40.53.jpeg`). */
  onOpenLabs?: () => void
  /** Lernvideos (Professor Messer) — eigene Ansicht, im Ansichten-Menü. */
  onOpenVideos?: () => void
  /** Heute-Paket: bestimmtes Kurs-Video direkt öffnen (openRecall = zum Check). */
  onOpenVideoAtIndex?: (videoIndex: number, openRecall: boolean) => void
  /** Unterbrochene Session für die „Weiterlernen“-Kachel (null = keine). */
  resumeSession?: { deckName: string; remaining: number } | null
  onResumeSession?: () => void
  /** ?view=import / launchQueue: öffnet das ImportModal (file = vorgeladene Datei). */
  importRequest?: { token: number; file: File | null } | null
}

type HomeTab = 'decks' | 'tags'

export default function HomeView({
  mode = 'default',
  onBackHome,
  onStartStudy,
  onStartTagStudy,
  onStartShuffleStudy,
  onOpenShuffleManager,
  onStartDailyQuest,
  onOpenLabs,
  onOpenVideos,
  onOpenVideoAtIndex,
  resumeSession,
  onResumeSession,
  importRequest,
}: Props) {
  const [homeTab, setHomeTab] = useState<HomeTab>('decks')
  const tagCardIndex = useTagCardIndex()
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
  const isShuffleManageMode = mode === 'shuffle-manage'
  const homeDecks = useMemo(
    () => settings.showReviewDecks ? decks : decks.filter(deck => !isReviewDeck(deck)),
    [decks, settings.showReviewDecks],
  )
  const selectableDecks = useMemo(() => flattenDeckTree(homeDecks), [homeDecks])

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
    importRequest,
  })

  const derivedData = useHomeDerivedData({
    decks: homeDecks,
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
    decks: homeDecks,
    deckTagIndex: derivedData.deckTagIndex,
    deckScheduleOverview: derivedData.deckScheduleOverview,
    language: settings.language,
  })

  // Aktuelles Lernpaket zuerst aufloesen: Seine feste Kartenmenge wird aus der
  // Daily Quest ausgeschlossen, damit beide Lernpfade unabhaengig bleiben.
  const todayPackage = useTodayPackage({
    nextDayStartsAt: settings.nextDayStartsAt,
    newCardsPerDay: settings.newCardsPerDay,
    studyCardLimit: settings.studyCardLimit,
  })
  const activePackageCardIdsKey = todayPackage.activeCardIds.join('\u0000')

  // Daily Quest: Untertitel-Hinweis = Deck mit den meisten heute faelligen
  // Karten; die Auswahl selbst kommt zufaellig und deckuebergreifend zustande.
  const [questStarting, setQuestStarting] = useState(false)
  const questTopDeckName = useMemo(() => {
    let bestName: string | null = null
    let bestCount = 0
    for (const deck of homeDecks) {
      const today = derivedData.deckScheduleOverview[deck.id]?.today
      if (today && today.total > bestCount) {
        bestCount = today.total
        bestName = deck.name
      }
    }
    return bestName
  }, [homeDecks, derivedData.deckScheduleOverview])
  // Echte Session-Groesse statt roher Faelligkeitszahl. Nur ein insgesamt zu
  // kleiner Kartenpool darf die in den Optionen gesetzte Quest-Groesse kuerzen.
  const [questPreviewSize, setQuestPreviewSize] = useState<number | null>(null)
  useEffect(() => {
    if (todayPackage.loading) {
      setQuestPreviewSize(null)
      return
    }
    let cancelled = false
    void pickDailyQuestCards(settings.dailyQuestSize, settings.nextDayStartsAt, {
      excludeCardIds: todayPackage.activeCardIds,
      runSeed: 'daily-quest-preview',
    })
      .then(cards => {
        if (!cancelled) setQuestPreviewSize(cards.length)
      })
      .catch(() => {
        if (!cancelled) setQuestPreviewSize(null)
      })
    return () => {
      cancelled = true
    }
  }, [settings.dailyQuestSize, settings.nextDayStartsAt, stats?.nowDue, todayPackage.loading, activePackageCardIdsKey])
  const questSize = questPreviewSize ?? 0

  const handleStartDailyQuest = async () => {
    if (questStarting || !onStartDailyQuest) return
    setQuestStarting(true)
    try {
      const questCards = await pickDailyQuestCards(settings.dailyQuestSize, settings.nextDayStartsAt, {
        excludeCardIds: todayPackage.activeCardIds,
        runSeed: `daily-quest:${Date.now()}:${Math.random()}`,
      })
      if (questCards.length > 0) {
        onStartDailyQuest(questCards)
      }
    } finally {
      setQuestStarting(false)
    }
  }

  // Mini-Session: der kleinste immer verfügbare Schritt — 5 Karten, ~3 Minuten.
  // Senkt die Startschwelle an Tagen, an denen die volle Quest zu groß wirkt.
  const MINI_SESSION_SIZE = 5
  const handleStartMiniSession = async () => {
    if (questStarting || !onStartDailyQuest) return
    setQuestStarting(true)
    try {
      const miniCards = await pickDailyQuestCards(MINI_SESSION_SIZE, settings.nextDayStartsAt, {
        excludeCardIds: todayPackage.activeCardIds,
        runSeed: `daily-quest-mini:${Date.now()}:${Math.random()}`,
      })
      if (miniCards.length > 0) {
        onStartDailyQuest(miniCards)
      }
    } finally {
      setQuestStarting(false)
    }
  }

  // Heute-Paket: geführter Tagespfad (Kurs-Video → Abruf-Check → Karten der
  // Objective). Ohne erreichbare Videos fällt der Slide auf die Quest-Kachel zurück.
  const examPacing = useMemo(() => computeExamPacing({
    examDateIso: settings.examDateIso,
    remainingNewCards: stats?.new ?? 0,
    remainingVideos: todayPackage.remainingVideos,
  }), [settings.examDateIso, stats?.new, todayPackage.remainingVideos])
  const todayPackageTile = (todayPackage.loading || todayPackage.available)
    ? (
        <HomeTodayPackageTile
          language={settings.language}
          loading={todayPackage.loading}
          video={todayPackage.video}
          videoNumber={todayPackage.videoNumber}
          videoTotal={todayPackage.videoTotal}
          steps={todayPackage.steps}
          objectiveDeck={todayPackage.objectiveDeck}
          remainingCards={todayPackage.remainingCards}
          completedToday={todayPackage.completedToday}
          pacing={examPacing}
          onWatchVideo={(videoIndex, openRecall) => onOpenVideoAtIndex?.(videoIndex, openRecall)}
          onStartCards={deckToStudy => onStartStudy(deckToStudy)}
        />
      )
    : undefined

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
      {/* Mobile: keine Topbar — Referenz Handy-Stand 8. Juni (Status liegt in
          Profil & Sync, Streak/Settings/+ in der Bottom-Bar). Header nur ≥md. */}
      {/* pb-3 mobil: Luft zwischen Dashboard-Kachel/KPIs und der Deckliste —
          ohne Abstand überlappten sich die Kartenschatten leicht. */}
      <div className="relative z-20 flex-shrink-0 pt-safe-2 pb-3 sm:pt-safe-4 sm:pb-0">
        {/* Mobile: Navigation als Top-Header (ersetzt die frühere fixe
            Bottom-Bar). Inhalt scrollt darunter edge-to-edge. */}
        {!isShuffleManageMode && (
          <div className="mb-2 sm:hidden">
            <HomeBottomBar
              t={t}
              language={settings.language}
              shuffleModeEnabled={settings.shuffleModeEnabled}
              showShuffleOnly={controller.showShuffleOnly}
              deckSortMode={deckSortMode}
              homeTab={homeTab}
              canInstall={canInstall}
              isInstalled={isInstalled}
              isInstalling={isInstalling}
              onHomeTabChange={setHomeTab}
              onDeckSortModeChange={setDeckSortMode}
              onToggleShuffleOnly={controller.toggleShuffleOnly}
              onReload={reload}
              onCreateDeck={controller.openCreateDeckModal}
              onCreateVirtualDeck={controller.openCreateShuffleCollection}
              onCreateCard={controller.openCreateCard}
              onImport={controller.openImport}
              onExport={controller.openExport}
              onShowSettings={controller.openSettings}
              onInstall={() => { void controller.handleInstall() }}
              onOpenLabs={onOpenLabs}
              onOpenVideos={onOpenVideos}
            />
          </div>
        )}
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

            {/* Weiterlernen: unterbrochene Session ist sonst von Home aus
                unsichtbar — ein Tap setzt Queue und Again-Zähler fort. */}
            {resumeSession && onResumeSession && (
              <motion.button
                type="button"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                onClick={onResumeSession}
                data-testid="home-resume-session"
                className="flex w-full items-center gap-3 rounded-ds border border-[--brand-secondary-25] bg-[--brand-secondary-12] px-4 py-3 text-left shadow-card transition hover:border-[--brand-secondary-80]"
              >
                <Play size={16} strokeWidth={2} className="shrink-0 text-[--brand-secondary]" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                  {settings.language === 'de' ? 'Weiterlernen' : 'Resume session'}
                  <span className="text-white/50"> · {resumeSession.deckName}</span>
                </span>
                <span className="shrink-0 font-mono text-xs text-[--brand-secondary]">
                  {settings.language === 'de'
                    ? `${resumeSession.remaining} Karten übrig`
                    : `${resumeSession.remaining} cards left`}
                </span>
              </motion.button>
            )}

            <HomeStatsSection
              t={t}
              language={settings.language}
              mode={controller.dashboardMode}
              stats={stats}
              gamificationProfile={gamificationProfile}
              onOpenFutureForecast={controller.openFutureForecast}
              onModeChange={controller.setDashboardMode}
              questSize={questSize}
              questTopDeckName={questTopDeckName}
              questHasDecks={decks.length > 0}
              questStarting={questStarting}
              onStartDailyQuest={() => { void handleStartDailyQuest() }}
              onStartMiniSession={() => { void handleStartMiniSession() }}
              todayPackageTile={todayPackageTile}
            />
          </div>
        </div>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        {!isShuffleManageMode && (
          <div className="hidden sm:block">
            <HomeDeckToolbar
              t={t}
              language={settings.language}
              shuffleModeEnabled={settings.shuffleModeEnabled}
              showShuffleOnly={controller.showShuffleOnly}
              homeTab={homeTab}
              deckSearchQuery={deckSearchQuery}
              deckSortMode={deckSortMode}
              canInstall={canInstall}
              isInstalled={isInstalled}
              isInstalling={isInstalling}
              onHomeTabChange={setHomeTab}
              onDeckSearchQueryChange={setDeckSearchQuery}
              onDeckSortModeChange={setDeckSortMode}
              onToggleShuffleOnly={controller.toggleShuffleOnly}
              onReload={reload}
              onCreateDeck={controller.openCreateDeckModal}
              onCreateVirtualDeck={controller.openCreateShuffleCollection}
              onCreateCard={controller.openCreateCard}
              onImport={controller.openImport}
              onExport={controller.openExport}
              onInstall={() => { void controller.handleInstall() }}
              onOpenLabs={onOpenLabs}
              onOpenVideos={onOpenVideos}
            />
          </div>
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
                  className="inline-flex items-center gap-2 rounded-ds-xl border border-[#18181b] bg-[#0c0c0c] px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-[#3f3f46] hover:bg-[#111] hover:text-white"
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
          <div className="rounded-ds-2xl border border-dashed border-[#18181b] bg-[#0a0a0a] px-4 py-8 text-center shadow-card">
            <p className="text-sm text-white/55">
              {settings.language === 'de'
                ? 'Der Shuffle-Modus ist aktuell in den Einstellungen deaktiviert.'
                : 'Shuffle mode is currently disabled in settings.'}
            </p>
            {onBackHome && (
              <button
                type="button"
                onClick={onBackHome}
                className="mt-4 inline-flex items-center gap-2 rounded-ds-xl border border-[#18181b] bg-[#0c0c0c] px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-[#3f3f46] hover:bg-[#111] hover:text-white"
              >
                <ArrowLeft size={14} />
                {settings.language === 'de' ? 'Zur Startseite' : 'Back home'}
              </button>
            )}
          </div>
        )}

        {!isShuffleManageMode && (
          <>
            {homeTab === 'decks' && (
              <HomeDeckListSection
                t={t}
                language={settings.language}
                error={error}
                loading={loading}
                decks={homeDecks}
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

            {homeTab === 'tags' && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <HomeTagBrowseSection
                  language={settings.language}
                  tagIndex={tagCardIndex.tagIndex}
                  allTags={tagCardIndex.allTags}
                  loading={tagCardIndex.loading}
                  onStartTagStudy={(tag, cards) => onStartTagStudy?.(tag, cards)}
                />
              </div>
            )}
          </>
        )}
      </div>

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
              decks={selectableDecks}
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
              onExportJson={() => { void controller.handleExportJson() }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {controller.showShuffleCollectionModal && (
            <HomeShuffleCollectionModal
              isOpen
              language={settings.language}
              prefersReducedMotion={prefersReducedMotion}
              decks={selectableDecks}
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
        {controller.showImport && <ImportModal isOpen onClose={controller.closeImport} initialFile={controller.importFile} />}

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
