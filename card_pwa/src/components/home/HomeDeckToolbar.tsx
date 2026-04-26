import { useCallback, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { BarChart3, CalendarDays, Check, ChevronDown, Download, FolderPlus, Plus, RefreshCw, Search, Shuffle, Sparkles, Upload, X } from 'lucide-react'
import type { DeckSortMode } from '../../hooks/home/useHomeDeckFilters'
import { useFloatingMenu } from '../../hooks/useFloatingMenu'
import type { HomeDashboardMode } from './HomeStatsSection'

interface Props {
  t: Record<string, string>
  language: 'de' | 'en'
  shuffleModeEnabled: boolean
  showShuffleOnly: boolean
  deckSearchQuery: string
  deckSortMode: DeckSortMode
  dashboardMode: HomeDashboardMode
  onDeckSearchQueryChange: (value: string) => void
  onDeckSortModeChange: (value: DeckSortMode) => void
  onToggleShuffleOnly: () => void
  onDashboardModeChange: (mode: HomeDashboardMode) => void
  onReload: () => void
  onCreateDeck: () => void
  onCreateVirtualDeck?: () => void
  onCreateCard: () => void
  onImport: () => void
  onExport: () => void
}

export function HomeDeckToolbar({
  t,
  language,
  shuffleModeEnabled,
  showShuffleOnly,
  deckSearchQuery,
  deckSortMode,
  dashboardMode,
  onDeckSearchQueryChange,
  onDeckSortModeChange,
  onToggleShuffleOnly,
  onDashboardModeChange,
  onReload,
  onCreateDeck,
  onCreateVirtualDeck,
  onCreateCard,
  onImport,
  onExport,
}: Props) {
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [showFeatureMenu, setShowFeatureMenu] = useState(false)

  const closeActionsMenu = useCallback(() => {
    setShowActionsMenu(false)
  }, [])

  const closeFilterMenu = useCallback(() => {
    setShowFilterMenu(false)
  }, [])

  const closeFeatureMenu = useCallback(() => {
    setShowFeatureMenu(false)
  }, [])

  const { anchorRef, menuRef, floatingStyle, updatePosition } = useFloatingMenu<HTMLDivElement, HTMLDivElement>({
    isOpen: showActionsMenu,
    onClose: closeActionsMenu,
    width: 248,
    maxHeight: 292,
  })

  const {
    anchorRef: filterAnchorRef,
    menuRef: filterMenuRef,
    floatingStyle: filterFloatingStyle,
    updatePosition: updateFilterPosition,
  } = useFloatingMenu<HTMLDivElement, HTMLDivElement>({
    isOpen: showFilterMenu,
    onClose: closeFilterMenu,
    width: 236,
    maxHeight: 260,
  })

  const {
    anchorRef: featureAnchorRef,
    menuRef: featureMenuRef,
    floatingStyle: featureFloatingStyle,
    updatePosition: updateFeaturePosition,
  } = useFloatingMenu<HTMLDivElement, HTMLDivElement>({
    isOpen: showFeatureMenu,
    onClose: closeFeatureMenu,
    width: 220,
    maxHeight: 260,
  })

  const handleToggleActionsMenu = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    const willOpen = !showActionsMenu

    setShowActionsMenu(willOpen)
    if (willOpen) {
      closeFilterMenu()
      closeFeatureMenu()
    }

    if (willOpen) {
      updatePosition()
      window.requestAnimationFrame(updatePosition)
    }
  }, [showActionsMenu, updatePosition, closeFeatureMenu, closeFilterMenu])

  const handleToggleFilterMenu = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    const willOpen = !showFilterMenu

    setShowFilterMenu(willOpen)
    if (willOpen) {
      closeActionsMenu()
      closeFeatureMenu()
    }

    if (willOpen) {
      updateFilterPosition()
      window.requestAnimationFrame(updateFilterPosition)
    }
  }, [showFilterMenu, updateFilterPosition, closeActionsMenu, closeFeatureMenu])

  const handleToggleFeatureMenu = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    const willOpen = !showFeatureMenu

    setShowFeatureMenu(willOpen)
    if (willOpen) {
      closeActionsMenu()
      closeFilterMenu()
    }

    if (willOpen) {
      updateFeaturePosition()
      window.requestAnimationFrame(updateFeaturePosition)
    }
  }, [showFeatureMenu, updateFeaturePosition, closeActionsMenu, closeFilterMenu])

  const dashboardOptions: Array<{
    key: HomeDashboardMode
    label: string
    icon: typeof BarChart3
  }> = [
    { key: 'kpi', label: 'KPI', icon: BarChart3 },
    { key: 'heatmap', label: language === 'de' ? 'Heatmap' : 'Heatmap', icon: CalendarDays },
    { key: 'pilot', label: language === 'de' ? 'Pilot' : 'Pilot', icon: Sparkles },
  ]

  const filterLabel = language === 'de' ? 'Filter' : 'Filter'
  const featureLabel = language === 'de' ? 'Feature' : 'Feature'
  const activeFeatureLabel = dashboardOptions.find(option => option.key === dashboardMode)?.label ?? 'KPI'
  const decksLabel = language === 'de' ? 'Decks' : 'Decks'
  const shuffleDecksLabel = language === 'de' ? 'Shuffle-Decks' : 'Shuffle decks'
  const activeFilterValue = showShuffleOnly ? shuffleDecksLabel : decksLabel

  return (
    <div className="sticky top-0 z-[90] mb-2 mt-2 flex-shrink-0 sm:mb-3 sm:mt-4">
      <div className="rounded-2xl border border-white/10 bg-black/[0.72] p-2 backdrop-blur-md sm:border-0 sm:bg-black/70 sm:p-0 sm:backdrop-blur-sm">
      <div className="flex min-w-0 flex-wrap items-center gap-2 overflow-x-hidden overflow-y-visible sm:flex-nowrap sm:gap-1 sm:pb-1">
        <h2 className="hidden sm:block text-lg font-black font-mono uppercase tracking-[0.2em] text-theme-text shrink-0 mr-1">
          {t.decks_title}
        </h2>

        <label className="relative flex h-11 min-w-0 flex-[1_0_100%] items-center rounded-2xl border border-white/15 bg-white/[0.04] pl-3 pr-2 text-xs text-white/85 sm:h-8 sm:flex-[0_1_16rem] sm:bg-white/[0.03] sm:pl-2">
          <Search size={13} className="pointer-events-none mr-1.5 text-white/45" />
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
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white/45 transition hover:bg-white/8 hover:text-white/80"
              aria-label={language === 'de' ? 'Suche leeren' : 'Clear search'}
              title={language === 'de' ? 'Suche leeren' : 'Clear search'}
            >
              <X size={12} />
            </button>
          )}
        </label>

        <div className="flex min-w-0 flex-1 items-center justify-between gap-1.5 sm:ml-auto sm:shrink-0 sm:flex-none sm:justify-end sm:gap-1">
          <div className="relative shrink-0" ref={filterAnchorRef}>
            <button
              type="button"
              onClick={handleToggleFilterMenu}
              className="inline-flex h-11 items-center gap-1.5 rounded-2xl border border-white/15 bg-white/[0.03] px-3 text-[10px] font-mono uppercase tracking-[0.08em] text-white/85 transition-all duration-200 hover:border-white/30 hover:bg-white/[0.07] sm:h-9 sm:px-2.5"
              aria-haspopup="menu"
              aria-expanded={showFilterMenu}
              title={filterLabel}
            >
              <span className="text-white/55">{filterLabel}</span>
              <span className="text-white">{activeFilterValue}</span>
              <ChevronDown size={12} className={`transition-transform duration-150 ${showFilterMenu ? 'rotate-180' : ''}`} />
            </button>

            {showFilterMenu && filterFloatingStyle && createPortal(
              <motion.div
                ref={filterMenuRef}
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="fixed z-[1300] overflow-y-auto rounded-2xl border border-white/15 bg-zinc-950/98 py-1 shadow-[0_18px_56px_rgba(0,0,0,0.72)] backdrop-blur-xl"
                style={filterFloatingStyle}
                role="menu"
              >
                <div className="px-4 pb-1 pt-2 text-[10px] font-mono uppercase tracking-[0.16em] text-white/35">
                  {filterLabel}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (showShuffleOnly) onToggleShuffleOnly()
                    closeFilterMenu()
                  }}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm text-white/78 hover:text-white hover:bg-white/[0.08] transition text-left"
                  role="menuitem"
                >
                  <span>{decksLabel}</span>
                  {!showShuffleOnly && <Check size={14} />}
                </button>
                {shuffleModeEnabled && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleShuffleOnly()
                      closeFilterMenu()
                    }}
                    className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm text-white/78 hover:text-white hover:bg-white/[0.08] transition text-left"
                    role="menuitem"
                  >
                    <span>{shuffleDecksLabel}</span>
                    {showShuffleOnly && <Check size={14} />}
                  </button>
                )}

                {!showShuffleOnly && (
                  <>
                    <div className="border-t border-white/10 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        onDeckSortModeChange('name')
                        closeFilterMenu()
                      }}
                      className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm text-white/78 hover:text-white hover:bg-white/[0.08] transition text-left"
                      role="menuitem"
                    >
                      <span>{t.sort_name}</span>
                      {deckSortMode === 'name' && <Check size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeckSortModeChange('due_today')
                        closeFilterMenu()
                      }}
                      className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm text-white/78 hover:text-white hover:bg-white/[0.08] transition text-left"
                      role="menuitem"
                    >
                      <span>{t.sort_due_today}</span>
                      {deckSortMode === 'due_today' && <Check size={14} />}
                    </button>
                  </>
                )}
              </motion.div>,
              document.body,
            )}
          </div>

          <div className="relative shrink-0" ref={featureAnchorRef}>
            <button
              type="button"
              onClick={handleToggleFeatureMenu}
              className="inline-flex h-11 items-center gap-1.5 rounded-2xl border border-white/15 bg-white/[0.03] px-3 text-[10px] font-mono uppercase tracking-[0.08em] text-white/85 transition-all duration-200 hover:border-white/30 hover:bg-white/[0.07] sm:h-9 sm:px-2.5"
              aria-haspopup="menu"
              aria-expanded={showFeatureMenu}
              title={featureLabel}
            >
              <span className="text-white/55">{featureLabel}</span>
              <span className="text-white">{activeFeatureLabel}</span>
              <ChevronDown size={12} className={`transition-transform duration-150 ${showFeatureMenu ? 'rotate-180' : ''}`} />
            </button>

            {showFeatureMenu && featureFloatingStyle && createPortal(
              <motion.div
                ref={featureMenuRef}
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="fixed z-[1300] overflow-y-auto rounded-2xl border border-white/15 bg-zinc-950/98 py-1 shadow-[0_18px_56px_rgba(0,0,0,0.72)] backdrop-blur-xl"
                style={featureFloatingStyle}
                role="menu"
              >
                <div className="px-4 pb-1 pt-2 text-[10px] font-mono uppercase tracking-[0.16em] text-white/35">
                  {featureLabel}
                </div>
                {dashboardOptions.map(option => {
                  const Icon = option.icon
                  const isActive = dashboardMode === option.key
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        onDashboardModeChange(option.key)
                        closeFeatureMenu()
                      }}
                      className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm text-white/78 hover:text-white hover:bg-white/[0.08] transition text-left"
                      role="menuitem"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Icon size={13} />
                        {option.label}
                      </span>
                      {isActive && <Check size={14} />}
                    </button>
                  )
                })}
              </motion.div>,
              document.body,
            )}
          </div>

          <button
            onClick={onReload}
            className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-theme-text-secondary transition-all duration-300 ease-out active:scale-95 hover:bg-white/10 hover:text-theme-text min-[380px]:inline-flex sm:h-auto sm:w-auto sm:p-1"
            title={t.reload}
            aria-label={t.reload}
          >
            <RefreshCw size={15} />
          </button>

          <div className="relative shrink-0" ref={anchorRef}>
            <button
              type="button"
              onClick={handleToggleActionsMenu}
              className="group flex h-11 min-w-11 items-center justify-center gap-1 rounded-2xl border border-white/15 bg-white/[0.07] px-3 py-1 text-xs font-mono uppercase tracking-[0.12em] text-white/82 shadow-[0_10px_28px_rgba(0,0,0,0.28)] transition-all duration-300 ease-out active:scale-95 hover:border-white/25 hover:bg-white/[0.1] hover:text-white sm:min-h-8 sm:h-auto sm:min-w-0 sm:px-2.5"
              aria-haspopup="menu"
              aria-expanded={showActionsMenu}
              aria-label={language === 'de' ? 'Aktionen oeffnen' : 'Open actions'}
            >
              <Plus size={14} />
              <ChevronDown size={12} className={`transition-transform duration-150 ${showActionsMenu ? 'rotate-180' : ''}`} />
            </button>
            {showActionsMenu && floatingStyle && createPortal(
                <motion.div
                  ref={menuRef}
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="fixed z-[1300] overflow-y-auto rounded-2xl border border-white/15 bg-zinc-950/98 py-1 shadow-[0_18px_56px_rgba(0,0,0,0.72)] backdrop-blur-xl"
                  style={floatingStyle}
                  role="menu"
                >
                  <div className="px-4 pb-1 pt-2 text-[10px] font-mono uppercase tracking-[0.16em] text-white/35">
                    {language === 'de' ? 'Erstellen' : 'Create'}
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      closeActionsMenu()
                      onCreateDeck()
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-white/78 hover:text-white hover:bg-white/[0.08] transition text-left"
                    role="menuitem"
                  >
                    <FolderPlus size={13} /> {t.create_deck}
                  </button>
                  {shuffleModeEnabled && onCreateVirtualDeck && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        closeActionsMenu()
                        onCreateVirtualDeck()
                      }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-white/78 hover:text-white hover:bg-white/[0.08] transition text-left"
                      role="menuitem"
                    >
                      <Shuffle size={13} /> {language === 'de' ? 'Virtuelles Deck erstellen' : 'Create virtual deck'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      closeActionsMenu()
                      onCreateCard()
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-white/78 hover:text-white hover:bg-white/[0.08] transition text-left"
                    role="menuitem"
                  >
                    <Plus size={13} /> {t.create_card}
                  </button>
                  <div className="border-t border-white/10 px-4 pb-1 pt-2 text-[10px] font-mono uppercase tracking-[0.16em] text-white/35">
                    {language === 'de' ? 'Daten' : 'Data'}
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      closeActionsMenu()
                      onImport()
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-white/90 hover:text-white hover:bg-white/[0.08] transition text-left"
                    role="menuitem"
                  >
                    <Upload size={13} className="text-[color:var(--brand-primary)]" /> {t.import_action} {language === 'de' ? 'Karten/Decks' : 'cards/decks'}
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      closeActionsMenu()
                      onExport()
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-white/78 hover:text-white hover:bg-white/[0.08] transition text-left"
                    role="menuitem"
                  >
                    <Download size={13} /> {t.backup_export_title}
                  </button>
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
