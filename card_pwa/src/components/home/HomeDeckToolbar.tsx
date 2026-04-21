import { useCallback, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Activity, BarChart3, CalendarDays, ChevronDown, Download, FolderPlus, Plus, RefreshCw, Search, Sparkles, Upload, X, ArrowUpDown } from 'lucide-react'
import type { DeckSortMode } from '../../hooks/home/useHomeDeckFilters'
import { useFloatingMenu } from '../../hooks/useFloatingMenu'
import type { HomeDashboardMode } from './HomeStatsSection'

interface Props {
  t: Record<string, string>
  language: 'de' | 'en'
  deckSearchQuery: string
  deckSortMode: DeckSortMode
  dashboardMode: HomeDashboardMode
  onDeckSearchQueryChange: (value: string) => void
  onDeckSortModeChange: (value: DeckSortMode) => void
  onDashboardModeChange: (mode: HomeDashboardMode) => void
  onReload: () => void
  onCreateDeck: () => void
  onCreateCard: () => void
  onImport: () => void
  onExport: () => void
}

export function HomeDeckToolbar({
  t,
  language,
  deckSearchQuery,
  deckSortMode,
  dashboardMode,
  onDeckSearchQueryChange,
  onDeckSortModeChange,
  onDashboardModeChange,
  onReload,
  onCreateDeck,
  onCreateCard,
  onImport,
  onExport,
}: Props) {
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const closeActionsMenu = useCallback(() => {
    setShowActionsMenu(false)
  }, [])
  const { anchorRef, menuRef, floatingStyle, updatePosition } = useFloatingMenu<HTMLDivElement, HTMLDivElement>({
    isOpen: showActionsMenu,
    onClose: closeActionsMenu,
    width: 248,
    maxHeight: 292,
  })
  const handleToggleActionsMenu = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    const willOpen = !showActionsMenu

    setShowActionsMenu(willOpen)

    if (willOpen) {
      updatePosition()
      window.requestAnimationFrame(updatePosition)
    }
  }, [showActionsMenu, updatePosition])
  const dashboardOptions: Array<{
    key: HomeDashboardMode
    label: string
    icon: typeof BarChart3
  }> = [
    { key: 'kpi', label: 'KPI', icon: BarChart3 },
    { key: 'heatmap', label: language === 'de' ? 'Heatmap' : 'Heatmap', icon: CalendarDays },
    { key: 'life', label: language === 'de' ? 'Life' : 'Life', icon: Activity },
    { key: 'pilot', label: language === 'de' ? 'Pilot' : 'Pilot', icon: Sparkles },
  ]

  return (
    <div className="sticky top-0 z-[90] mb-2 mt-2 flex-shrink-0 sm:mb-3 sm:mt-4">
      <div className="rounded-2xl border border-white/10 bg-black/[0.72] p-2 backdrop-blur-md sm:border-0 sm:bg-black/70 sm:p-0 sm:backdrop-blur-sm">
      <div className="flex min-w-0 flex-wrap items-center gap-2 overflow-x-hidden overflow-y-visible sm:flex-nowrap sm:gap-1 sm:pb-1">
        <h2 className="hidden sm:block text-lg font-black font-mono uppercase tracking-[0.2em] text-theme-text shrink-0 mr-1">
          {t.decks_title}
        </h2>

        <label className="relative flex h-10 min-w-0 flex-[1_0_100%] items-center rounded-2xl border border-white/15 bg-white/[0.04] pl-3 pr-2 text-xs text-white/85 sm:h-8 sm:flex-[0_1_16rem] sm:bg-white/[0.03] sm:pl-2">
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
              className="p-0.5 text-white/45 hover:text-white/80 transition"
              aria-label={language === 'de' ? 'Suche leeren' : 'Clear search'}
              title={language === 'de' ? 'Suche leeren' : 'Clear search'}
            >
              <X size={12} />
            </button>
          )}
        </label>

        <div className="flex min-w-0 flex-1 items-center justify-between gap-1.5 sm:ml-auto sm:shrink-0 sm:flex-none sm:justify-end sm:gap-1">
          <div
            className="inline-flex h-9 min-w-0 flex-1 items-center gap-1 rounded-2xl border border-white/15 bg-white/[0.03] p-1 sm:h-8 sm:flex-none"
            role="group"
            aria-label={t.sort_by}
            title={t.sort_by}
          >
            <span className="hidden sm:inline-flex items-center px-1.5 text-white/45" aria-hidden="true">
              <ArrowUpDown size={12} />
            </span>
            {([
              { key: 'name', label: t.sort_name },
              { key: 'due_today', label: t.sort_due_today },
            ] as const).map(option => {
              const active = deckSortMode === option.key
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => onDeckSortModeChange(option.key)}
                  aria-pressed={active}
                  className={`inline-flex h-7 flex-1 items-center justify-center rounded-xl px-2 text-[10px] sm:h-6 sm:flex-none sm:px-2.5 sm:text-[11px] font-mono uppercase tracking-[0.08em] transition-all duration-200 ${
                    active
                      ? 'bg-white text-black shadow-sm'
                      : 'text-white/60 hover:text-white/85 hover:bg-white/[0.06]'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>

          <div
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-2xl border border-white/15 bg-white/[0.03] p-1"
            role="group"
            aria-label={language === 'de' ? 'Dashboard-Ansicht' : 'Dashboard view'}
          >
            {dashboardOptions.map(option => {
              const Icon = option.icon
              const active = dashboardMode === option.key
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => onDashboardModeChange(option.key)}
                  aria-pressed={active}
                  title={option.label}
                  className={`inline-flex h-7 items-center justify-center rounded-xl px-2 text-[10px] font-mono uppercase tracking-[0.08em] transition-all duration-200 sm:gap-1.5 ${
                    active
                      ? 'bg-white text-black shadow-sm'
                      : 'text-white/60 hover:bg-white/[0.06] hover:text-white/85'
                  }`}
                >
                  <Icon size={13} />
                  <span className="hidden min-[430px]:inline sm:inline">{option.label}</span>
                </button>
              )
            })}
          </div>

          <button
            onClick={onReload}
            className="hidden h-9 shrink-0 items-center justify-center rounded-2xl px-2 text-theme-text-secondary transition-all duration-300 ease-out active:scale-95 hover:bg-white/10 hover:text-theme-text min-[380px]:inline-flex sm:h-auto sm:p-1"
            title={t.reload}
            aria-label={t.reload}
          >
            <RefreshCw size={15} />
          </button>

          <div className="relative shrink-0" ref={anchorRef}>
            <button
              type="button"
              onClick={handleToggleActionsMenu}
              className="group flex h-10 min-w-11 items-center justify-center gap-1 rounded-2xl border border-white/15 bg-white/[0.07] px-2.5 py-1 text-xs font-mono uppercase tracking-[0.12em] text-white/82 shadow-[0_10px_28px_rgba(0,0,0,0.28)] transition-all duration-300 ease-out active:scale-95 hover:border-white/25 hover:bg-white/[0.1] hover:text-white sm:min-h-8 sm:h-auto sm:min-w-0"
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
