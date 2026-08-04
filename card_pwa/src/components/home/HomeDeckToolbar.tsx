/**
 * AI_CONTEXT: Home-screen React component for home Deck Toolbar; supports dashboard, deck browsing, tag browsing, export, or quick study workflows.
 */
import { useCallback, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { motion } from '../../ui/motion'
import { Check, ChevronDown, Dices, Download, FlaskConical, FolderPlus, GraduationCap, LayoutDashboard, Loader2, Plus, RefreshCw, Search, Shuffle, Upload, Video, X } from 'lucide-react'
import type { DeckSortMode } from '../../hooks/home/useHomeDeckFilters'
import { useFloatingMenu } from '../../hooks/useFloatingMenu'
import { useTheme, themeScopeClass } from '../../contexts/ThemeContext'
import type { HomeTab } from '../../types'

interface Props {
  t: Record<string, string>
  language: 'de' | 'en'
  shuffleModeEnabled: boolean
  showShuffleOnly: boolean
  homeTab: HomeTab
  deckSearchQuery: string
  deckSortMode: DeckSortMode
  canInstall: boolean
  isInstalled: boolean
  isInstalling: boolean
  questStarting?: boolean
  onHomeTabChange: (tab: HomeTab) => void
  onDeckSearchQueryChange: (value: string) => void
  onDeckSortModeChange: (value: DeckSortMode) => void
  onToggleShuffleOnly: () => void
  onReload: () => void
  onCreateDeck: () => void
  onCreateVirtualDeck?: () => void
  onCreateCard: () => void
  onImport: () => void
  onExport: () => void
  onInstall: () => void
  /** Lernvideos-Ansicht — eigener Modus-Eintrag. */
  onOpenVideos?: () => void
  /** Daily Quest startet direkt, ohne eigenen Home-Tab. */
  onStartDailyQuest?: () => void
}

export function HomeDeckToolbar({
  t,
  language,
  shuffleModeEnabled,
  showShuffleOnly,
  homeTab,
  deckSearchQuery,
  deckSortMode,
  canInstall,
  isInstalled,
  isInstalling,
  questStarting = false,
  onHomeTabChange,
  onDeckSearchQueryChange,
  onDeckSortModeChange,
  onToggleShuffleOnly,
  onReload,
  onCreateDeck,
  onCreateVirtualDeck,
  onCreateCard,
  onImport,
  onExport,
  onInstall,
  onOpenVideos,
  onStartDailyQuest,
}: Props) {
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const { themeKey } = useTheme()

  const closeActionsMenu = useCallback(() => {
    setShowActionsMenu(false)
  }, [])

  const closeFilterMenu = useCallback(() => {
    setShowFilterMenu(false)
  }, [])

  const { anchorRef, menuRef, floatingStyle, updatePosition } = useFloatingMenu<HTMLDivElement, HTMLDivElement>({
    isOpen: showActionsMenu,
    onClose: closeActionsMenu,
    width: 248,
    maxHeight: 420,
  })

  const {
    anchorRef: filterAnchorRef,
    menuRef: filterMenuRef,
    floatingStyle: filterFloatingStyle,
    updatePosition: updateFilterPosition,
  } = useFloatingMenu<HTMLDivElement, HTMLDivElement>({
    isOpen: showFilterMenu,
    onClose: closeFilterMenu,
    width: 268,
    maxHeight: 520,
  })

  const handleToggleActionsMenu = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    const willOpen = !showActionsMenu

    setShowActionsMenu(willOpen)
    if (willOpen) {
      closeFilterMenu()
    }

    if (willOpen) {
      updatePosition()
      window.requestAnimationFrame(updatePosition)
    }
  }, [showActionsMenu, updatePosition, closeFilterMenu])

  const handleToggleFilterMenu = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    const willOpen = !showFilterMenu

    setShowFilterMenu(willOpen)
    if (willOpen) {
      closeActionsMenu()
    }

    if (willOpen) {
      updateFilterPosition()
      window.requestAnimationFrame(updateFilterPosition)
    }
  }, [showFilterMenu, updateFilterPosition, closeActionsMenu])

  const filterLabel = language === 'de' ? 'Ansicht' : 'View'
  const dashboardLabel = 'Dashboard'
  const decksLabel = language === 'de' ? 'Decks' : 'Decks'
  const tagsLabel = language === 'de' ? 'Nach Tags' : 'By tags'
  const unitsLabel = language === 'de' ? 'Lerneinheiten' : 'Learning units'
  const shuffleDecksLabel = language === 'de' ? 'Shuffle-Decks' : 'Shuffle decks'
  const questLabel = 'Daily Quest'
  const labsLabel = 'Labs'
  const tabLabels: Record<HomeTab, string> = {
    dashboard: dashboardLabel,
    decks: decksLabel,
    tags: tagsLabel,
    'learning-units': unitsLabel,
    labs: labsLabel,
  }
  const activeFilterValue = showShuffleOnly ? shuffleDecksLabel : tabLabels[homeTab]
  const sectionTitle = showShuffleOnly
    ? shuffleDecksLabel
    : homeTab === 'decks'
      ? t.decks_title
      : tabLabels[homeTab]
  const showSearch = showShuffleOnly || homeTab === 'decks' || homeTab === 'tags'

  return (
    <div className={`sticky top-0 z-[90] mb-2 mt-2 flex-shrink-0 sm:mb-3 sm:mt-4 ${
      homeTab === 'learning-units' ? themeScopeClass(themeKey, 'learning-units-toolbar') : ''
    }`}>
      <div className="rounded-ds border border-ds-border bg-ds-bg/92 p-2 shadow-card backdrop-blur-md sm:border-0 sm:bg-ds-bg/70 sm:p-0 sm:shadow-none sm:backdrop-blur-sm">
      <div className="flex min-w-0 flex-wrap items-center gap-2 overflow-x-hidden overflow-y-visible sm:flex-nowrap sm:gap-1 sm:pb-1">
        <h2 className="mr-2 hidden shrink-0 font-sans text-lg font-semibold text-theme-text sm:block">
          {sectionTitle}
        </h2>

        {showSearch && (
          <label className="relative flex h-8 min-w-0 flex-[0_1_16rem] items-center rounded-ds border border-ds-border bg-ds-card pl-2 pr-2 text-xs text-white/85 transition-colors focus-within:border-[--brand-primary-50]">
            <Search size={13} strokeWidth={1.5} className="pointer-events-none mr-1.5 text-white/45" />
            <input
              type="search"
              value={deckSearchQuery}
              onChange={e => onDeckSearchQueryChange(e.target.value)}
              placeholder={language === 'de' ? 'Titel/Tag suchen' : 'Search title/tag'}
              className="h-full min-w-0 flex-1 bg-transparent text-xs text-white/85 outline-none"
            />
            {deckSearchQuery.trim().length > 0 && (
              <button
                type="button"
                onClick={() => onDeckSearchQueryChange('')}
                className="ds-icon-button flex h-9 w-9"
                aria-label={language === 'de' ? 'Suche leeren' : 'Clear search'}
                title={language === 'de' ? 'Suche leeren' : 'Clear search'}
              >
                <X size={12} strokeWidth={1.5} />
              </button>
            )}
          </label>
        )}

        <div className="flex min-w-0 flex-1 items-center justify-between gap-1.5 sm:ml-auto sm:shrink-0 sm:flex-none sm:justify-end sm:gap-1">
          <div className="relative shrink-0" ref={filterAnchorRef}>
            <button
              type="button"
              onClick={handleToggleFilterMenu}
              className="inline-flex h-9 items-center gap-1.5 rounded-ds border border-ds-border bg-ds-card px-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-white/85 transition-all duration-200 hover:border-ds-border-hover hover:bg-ds-panel"
              aria-haspopup="menu"
              aria-expanded={showFilterMenu}
              title={filterLabel}
            >
              <span className="text-white/55">{filterLabel}</span>
              <span className="text-white">{activeFilterValue}</span>
              <ChevronDown size={12} strokeWidth={1.5} className={`transition-transform duration-150 ${showFilterMenu ? 'rotate-180' : ''}`} />
            </button>

            {showFilterMenu && filterFloatingStyle && createPortal(
              <motion.div
                ref={filterMenuRef}
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="fixed z-[1300] ds-menu overflow-y-auto py-1"
                style={filterFloatingStyle}
                role="menu"
              >
                <div className="px-4 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white/35">
                  {filterLabel}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (showShuffleOnly) onToggleShuffleOnly()
                    onHomeTabChange('dashboard')
                    closeFilterMenu()
                  }}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm text-white/78 transition hover:bg-ds-panel hover:text-white"
                  role="menuitem"
                >
                  <span className="inline-flex items-center gap-2"><LayoutDashboard size={13} strokeWidth={1.5} /> {dashboardLabel}</span>
                  {!showShuffleOnly && homeTab === 'dashboard' && <Check size={14} strokeWidth={1.5} />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (showShuffleOnly) onToggleShuffleOnly()
                    onHomeTabChange('tags')
                    closeFilterMenu()
                  }}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm text-white/78 transition hover:bg-ds-panel hover:text-white"
                  role="menuitem"
                >
                  <span>{tagsLabel}</span>
                  {!showShuffleOnly && homeTab === 'tags' && <Check size={14} strokeWidth={1.5} />}
                </button>
                {shuffleModeEnabled && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!showShuffleOnly) onToggleShuffleOnly()
                      onHomeTabChange('decks')
                      closeFilterMenu()
                    }}
                    className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm text-white/78 transition hover:bg-ds-panel hover:text-white"
                    role="menuitem"
                  >
                    <span>{shuffleDecksLabel}</span>
                    {showShuffleOnly && <Check size={14} strokeWidth={1.5} />}
                  </button>
                )}
                <div className="border-t border-ds-border px-4 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white/35">
                  {language === 'de' ? 'Modus' : 'Mode'}
                </div>
                {onStartDailyQuest && (
                  <button
                    type="button"
                    onClick={() => {
                      if (showShuffleOnly) onToggleShuffleOnly()
                      closeFilterMenu()
                      onStartDailyQuest()
                    }}
                    className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm text-white/78 transition hover:bg-ds-panel hover:text-white"
                    role="menuitem"
                  >
                    <span className="inline-flex items-center gap-2"><Dices size={13} strokeWidth={1.5} /> {questLabel}</span>
                    {questStarting && <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />}
                  </button>
                )}
                {onOpenVideos && (
                  <button
                    type="button"
                    onClick={() => {
                      closeFilterMenu()
                      onOpenVideos()
                    }}
                    className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm text-white/78 transition hover:bg-ds-panel hover:text-white"
                    role="menuitem"
                  >
                    <span className="inline-flex items-center gap-2"><Video size={13} strokeWidth={1.5} /> {language === 'de' ? 'Lernvideos' : 'Videos'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (showShuffleOnly) onToggleShuffleOnly()
                    onHomeTabChange('learning-units')
                    closeFilterMenu()
                  }}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm text-white/78 transition hover:bg-ds-panel hover:text-white"
                  role="menuitem"
                >
                  <span className="inline-flex items-center gap-2"><GraduationCap size={13} strokeWidth={1.5} /> {unitsLabel}</span>
                  {!showShuffleOnly && homeTab === 'learning-units' && <Check size={14} strokeWidth={1.5} />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (showShuffleOnly) onToggleShuffleOnly()
                    onHomeTabChange('decks')
                    closeFilterMenu()
                  }}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm text-white/78 transition hover:bg-ds-panel hover:text-white"
                  role="menuitem"
                >
                  <span>{decksLabel}</span>
                  {!showShuffleOnly && homeTab === 'decks' && <Check size={14} strokeWidth={1.5} />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (showShuffleOnly) onToggleShuffleOnly()
                    onHomeTabChange('labs')
                    closeFilterMenu()
                  }}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm text-white/78 transition hover:bg-ds-panel hover:text-white"
                  role="menuitem"
                >
                  <span className="inline-flex items-center gap-2"><FlaskConical size={13} strokeWidth={1.5} /> {labsLabel}</span>
                  {!showShuffleOnly && homeTab === 'labs' && <Check size={14} strokeWidth={1.5} />}
                </button>
                {!showShuffleOnly && (homeTab === 'decks' || homeTab === 'tags') && (
                  <>
                    <div className="border-t border-ds-border px-4 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white/35">
                      {language === 'de' ? 'Sortierung' : 'Sort'}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onDeckSortModeChange('name')
                        closeFilterMenu()
                      }}
                      className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm text-white/78 transition hover:bg-ds-panel hover:text-white"
                      role="menuitem"
                    >
                      <span>{t.sort_name}</span>
                      {deckSortMode === 'name' && <Check size={14} strokeWidth={1.5} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeckSortModeChange('due_today')
                        closeFilterMenu()
                      }}
                      className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm text-white/78 transition hover:bg-ds-panel hover:text-white"
                      role="menuitem"
                    >
                      <span>{t.sort_due_today}</span>
                      {deckSortMode === 'due_today' && <Check size={14} strokeWidth={1.5} />}
                    </button>
                  </>
                )}
              </motion.div>,
              document.body,
            )}
          </div>

          <button
            onClick={onReload}
            className="inline-flex h-auto w-auto shrink-0 items-center justify-center rounded-ds p-1 text-theme-text-secondary transition-all duration-300 ease-out hover:bg-ds-panel active:scale-95 hover:text-theme-text"
            title={t.reload}
            aria-label={t.reload}
          >
            <RefreshCw size={15} strokeWidth={1.5} />
          </button>

          <div className="relative shrink-0" ref={anchorRef}>
            <button
              type="button"
              onClick={handleToggleActionsMenu}
              className="group flex h-auto min-h-8 min-w-0 items-center justify-center gap-1 rounded-ds border border-ds-border bg-ds-card px-2.5 py-1 font-mono text-xs uppercase tracking-[0.1em] text-white shadow-card transition-all duration-300 ease-out hover:border-ds-border-hover hover:bg-ds-panel active:scale-95"
              aria-haspopup="menu"
              aria-expanded={showActionsMenu}
              aria-label={language === 'de' ? 'Aktionen oeffnen' : 'Open actions'}
            >
              <Plus size={14} strokeWidth={1.5} className="text-white" />
              <ChevronDown size={12} strokeWidth={1.5} className={`transition-transform duration-150 ${showActionsMenu ? 'rotate-180' : ''}`} />
            </button>
            {showActionsMenu && floatingStyle && createPortal(
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="fixed z-[1300] ds-menu overflow-y-auto py-1"
                style={floatingStyle}
                role="menu"
              >
                <div className="px-4 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white/35">
                  {language === 'de' ? 'Erstellen' : 'Create'}
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    closeActionsMenu()
                    onCreateDeck()
                  }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-white/78 transition hover:bg-ds-panel hover:text-white"
                  role="menuitem"
                >
                  <FolderPlus size={13} strokeWidth={1.5} /> {t.create_deck}
                </button>
                {shuffleModeEnabled && onCreateVirtualDeck && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      closeActionsMenu()
                      onCreateVirtualDeck()
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-white/78 transition hover:bg-ds-panel hover:text-white"
                    role="menuitem"
                  >
                    <Shuffle size={13} strokeWidth={1.5} /> {language === 'de' ? 'Virtuelles Deck erstellen' : 'Create virtual deck'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    closeActionsMenu()
                    onCreateCard()
                  }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-white/78 transition hover:bg-ds-panel hover:text-white"
                  role="menuitem"
                >
                  <Plus size={13} strokeWidth={1.5} /> {t.create_card}
                </button>
                <div className="border-t border-ds-border px-4 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white/35">
                  {language === 'de' ? 'Daten' : 'Data'}
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    closeActionsMenu()
                    onImport()
                  }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-white/90 transition hover:bg-ds-panel hover:text-white"
                  role="menuitem"
                >
                  <Upload size={13} strokeWidth={1.5} className="text-[color:var(--brand-primary)]" /> {t.import_action} {language === 'de' ? 'Karten/Decks' : 'cards/decks'}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    closeActionsMenu()
                    onExport()
                  }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-white/78 transition hover:bg-ds-panel hover:text-white"
                  role="menuitem"
                >
                  <Download size={13} strokeWidth={1.5} /> {t.backup_export_title}
                </button>
                {canInstall && !isInstalled && (
                  <>
                    <div className="my-1 border-t border-ds-border" />
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        closeActionsMenu()
                        onInstall()
                      }}
                      disabled={isInstalling}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-white/78 transition hover:bg-ds-panel hover:text-white disabled:opacity-60"
                      role="menuitem"
                    >
                      {isInstalling
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Download size={13} strokeWidth={1.5} />
                      }
                      {t.install}
                    </button>
                  </>
                )}
              </motion.div>,
              document.body,
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
