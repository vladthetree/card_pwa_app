import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3, CalendarDays, Check, Download, FolderPlus, Plus,
  RefreshCw, Search, Settings, SlidersHorizontal, Sparkles, Upload, X,
  Shuffle,
} from 'lucide-react'
import type { DeckSortMode } from '../../hooks/home/useHomeDeckFilters'
import type { HomeDashboardMode } from './HomeStatsSection'
import { Tag } from 'lucide-react'

type HomeTab = 'decks' | 'tags'
import { UI_TOKENS } from '../../constants/ui'

interface Props {
  t: Record<string, string>
  language: 'de' | 'en'
  shuffleModeEnabled: boolean
  showShuffleOnly: boolean
  deckSearchQuery: string
  deckSortMode: DeckSortMode
  dashboardMode: HomeDashboardMode
  homeTab: HomeTab
  canInstall: boolean
  isInstalled: boolean
  isInstalling: boolean
  onHomeTabChange: (tab: HomeTab) => void
  onDeckSearchQueryChange: (v: string) => void
  onDeckSortModeChange: (v: DeckSortMode) => void
  onToggleShuffleOnly: () => void
  onDashboardModeChange: (mode: HomeDashboardMode) => void
  onReload: () => void
  onCreateDeck: () => void
  onCreateVirtualDeck?: () => void
  onCreateCard: () => void
  onImport: () => void
  onExport: () => void
  onShowSettings: () => void
  onInstall: () => void
}

const SHEET_BACKDROP = 'fixed inset-0 z-[190] bg-black/60 backdrop-blur-[2px]'
const SHEET_PANEL    = 'home-bottom-sheet-panel fixed left-0 right-0 z-[200] rounded-t-[20px] border-t border-[#1f1f23] bg-[#0a0a0a] px-4 pt-3'
const DRAG_HANDLE    = 'mx-auto mb-4 h-1 w-10 rounded-full bg-[#333]'
const SHEET_LABEL    = 'px-1 pb-2 pt-1 text-[10px] font-mono uppercase tracking-[0.16em] text-white/35'
const SHEET_ITEM     = 'flex w-full items-center justify-between gap-3 rounded-[12px] px-3 py-3.5 text-left text-[15px] text-white/80 transition-colors hover:bg-[#111] hover:text-white active:bg-[#111] active:text-white'

export function HomeBottomBar({
  t,
  language,
  shuffleModeEnabled,
  showShuffleOnly,
  deckSearchQuery,
  deckSortMode,
  dashboardMode,
  homeTab,
  canInstall,
  isInstalled,
  isInstalling,
  onHomeTabChange,
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
  onShowSettings,
  onInstall,
}: Props) {
  const [filterOpen,  setFilterOpen]  = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)

  const closeFilter  = useCallback(() => setFilterOpen(false),  [])
  const closeActions = useCallback(() => setActionsOpen(false), [])

  const dashboardOptions: Array<{ key: HomeDashboardMode; label: string; icon: typeof BarChart3 }> = [
    { key: 'kpi',     label: 'KPI',     icon: BarChart3 },
    { key: 'heatmap', label: 'Heatmap', icon: CalendarDays },
    { key: 'pilot',   label: 'Pilot',   icon: Sparkles },
  ]

  const isFilterActive = showShuffleOnly || deckSortMode !== 'name' || homeTab === 'tags'

  return (
    <>
      {/* ── Bar ──────────────────────────────────────────────────────────── */}
      <div
        className="home-bottom-bar fixed left-0 right-0 z-[100] sm:hidden border-t border-[#1f1f23] shadow-[0_-4px_24px_rgba(0,0,0,0.55)] backdrop-blur-xl"
        data-safe-area-bottom-bar
      >
        <div className={`${UI_TOKENS.layout.homeMaxWidth} mx-auto px-2`}>
          <div className="flex items-center gap-1.5 py-1.5">

            {/* Search */}
            <label className="relative flex h-11 flex-1 items-center rounded-[12px] border border-[#1f1f23] bg-[#0e0e10] pl-3 pr-1 text-xs transition-colors focus-within:border-[rgba(249,115,22,0.45)]">
              <Search size={14} strokeWidth={1.5} className="pointer-events-none mr-2 shrink-0 text-white/40" />
              <input
                type="search"
                value={deckSearchQuery}
                onChange={e => onDeckSearchQueryChange(e.target.value)}
                placeholder={language === 'de' ? 'Suchen…' : 'Search…'}
                className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-white/85 outline-none placeholder:text-white/35"
              />
              {deckSearchQuery.length > 0 && (
                <button
                  type="button"
                  onClick={() => onDeckSearchQueryChange('')}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-white/50 hover:text-white"
                  aria-label={language === 'de' ? 'Suche leeren' : 'Clear search'}
                >
                  <X size={12} strokeWidth={2} />
                </button>
              )}
            </label>

            {/* Reload */}
            <button
              type="button"
              onClick={onReload}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] text-white/55 transition-colors hover:bg-[#1a1a1a] hover:text-white active:scale-95"
              aria-label={t.reload}
              title={t.reload}
            >
              <RefreshCw size={17} strokeWidth={1.5} />
            </button>

            {/* Filter */}
            <button
              type="button"
              onClick={() => { setActionsOpen(false); setFilterOpen(v => !v) }}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] text-white/55 transition-colors hover:bg-[#1a1a1a] hover:text-white active:scale-95"
              aria-label={language === 'de' ? 'Filter & Sortierung' : 'Filter & sort'}
              title={language === 'de' ? 'Filter & Sortierung' : 'Filter & sort'}
            >
              <SlidersHorizontal size={17} strokeWidth={1.5} />
              {isFilterActive && (
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[--brand-primary]" aria-hidden="true" />
              )}
            </button>

            {/* Settings */}
            <button
              type="button"
              onClick={onShowSettings}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] text-white/55 transition-colors hover:bg-[#1a1a1a] hover:text-white active:scale-95"
              aria-label={t.settings}
              title={t.settings}
            >
              <Settings size={17} strokeWidth={1.5} />
            </button>

            {/* Create / Actions */}
            <button
              type="button"
              onClick={() => { setFilterOpen(false); setActionsOpen(v => !v) }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border border-[--brand-primary-50] bg-[--brand-primary-10] text-[--brand-primary] transition-colors hover:bg-[--brand-primary-20] active:scale-95"
              aria-label={language === 'de' ? 'Erstellen & Aktionen' : 'Create & actions'}
              title={language === 'de' ? 'Erstellen' : 'Create'}
            >
              <Plus size={18} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter Sheet ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {filterOpen && (
          <div className="sm:hidden">
            <motion.div
              className={SHEET_BACKDROP}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={closeFilter}
              aria-hidden="true"
            />
            <motion.div
              className={SHEET_PANEL}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 40 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0.05, bottom: 0.5 }}
              onDragEnd={(_, info) => { if (info.offset.y > 60 || info.velocity.y > 200) closeFilter() }}
              role="dialog"
              aria-modal="true"
              aria-label={language === 'de' ? 'Filter & Sortierung' : 'Filter & sort'}
            >
              <div className={DRAG_HANDLE} />

              <p className={SHEET_LABEL}>{language === 'de' ? 'Ansicht' : 'View'}</p>
              <button
                type="button"
                onClick={() => { if (showShuffleOnly) onToggleShuffleOnly(); onHomeTabChange('decks'); closeFilter() }}
                className={SHEET_ITEM}
              >
                <span>{language === 'de' ? 'Decks' : 'Decks'}</span>
                {!showShuffleOnly && homeTab === 'decks' && <Check size={16} strokeWidth={1.5} className="text-[--brand-primary]" />}
              </button>
              <button
                type="button"
                onClick={() => { if (showShuffleOnly) onToggleShuffleOnly(); onHomeTabChange('tags'); closeFilter() }}
                className={SHEET_ITEM}
              >
                <span className="inline-flex items-center gap-2.5">
                  <Tag size={15} strokeWidth={1.5} className="text-white/50" />
                  {language === 'de' ? 'Nach Tags' : 'By tags'}
                </span>
                {!showShuffleOnly && homeTab === 'tags' && <Check size={16} strokeWidth={1.5} className="text-[--brand-primary]" />}
              </button>
              {shuffleModeEnabled && (
                <button
                  type="button"
                  onClick={() => { if (!showShuffleOnly) onToggleShuffleOnly(); onHomeTabChange('decks'); closeFilter() }}
                  className={SHEET_ITEM}
                >
                  <span>{language === 'de' ? 'Shuffle-Decks' : 'Shuffle decks'}</span>
                  {showShuffleOnly && <Check size={16} strokeWidth={1.5} className="text-[--brand-primary]" />}
                </button>
              )}

              {!showShuffleOnly && (
                <>
                  <div className="my-2 border-t border-[#1f1f23]" />
                  <p className={SHEET_LABEL}>{language === 'de' ? 'Sortierung' : 'Sort'}</p>
                  <button
                    type="button"
                    onClick={() => { onDeckSortModeChange('name'); closeFilter() }}
                    className={SHEET_ITEM}
                  >
                    <span>{t.sort_name}</span>
                    {deckSortMode === 'name' && <Check size={16} strokeWidth={1.5} className="text-[--brand-primary]" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => { onDeckSortModeChange('due_today'); closeFilter() }}
                    className={SHEET_ITEM}
                  >
                    <span>{t.sort_due_today}</span>
                    {deckSortMode === 'due_today' && <Check size={16} strokeWidth={1.5} className="text-[--brand-primary]" />}
                  </button>
                </>
              )}

              <div className="my-2 border-t border-[#1f1f23]" />
              <p className={SHEET_LABEL}>{language === 'de' ? 'Dashboard' : 'Dashboard'}</p>
              {dashboardOptions.map(opt => {
                const Icon = opt.icon
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => { onDashboardModeChange(opt.key); closeFilter() }}
                    className={SHEET_ITEM}
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <Icon size={15} strokeWidth={1.5} className="text-white/50" />
                      {opt.label}
                    </span>
                    {dashboardMode === opt.key && <Check size={16} strokeWidth={1.5} className="text-[--brand-primary]" />}
                  </button>
                )
              })}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Actions Sheet ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {actionsOpen && (
          <div className="sm:hidden">
            <motion.div
              className={SHEET_BACKDROP}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={closeActions}
              aria-hidden="true"
            />
            <motion.div
              className={SHEET_PANEL}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 40 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0.05, bottom: 0.5 }}
              onDragEnd={(_, info) => { if (info.offset.y > 60 || info.velocity.y > 200) closeActions() }}
              role="dialog"
              aria-modal="true"
              aria-label={language === 'de' ? 'Erstellen & Aktionen' : 'Create & actions'}
            >
              <div className={DRAG_HANDLE} />

              <p className={SHEET_LABEL}>{language === 'de' ? 'Erstellen' : 'Create'}</p>
              <button
                type="button"
                onClick={() => { closeActions(); onCreateDeck() }}
                className={SHEET_ITEM}
              >
                <span className="inline-flex items-center gap-2.5">
                  <FolderPlus size={15} strokeWidth={1.5} className="text-white/50" />
                  {t.create_deck}
                </span>
              </button>
              {shuffleModeEnabled && onCreateVirtualDeck && (
                <button
                  type="button"
                  onClick={() => { closeActions(); onCreateVirtualDeck() }}
                  className={SHEET_ITEM}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Shuffle size={15} strokeWidth={1.5} className="text-white/50" />
                    {language === 'de' ? 'Virtuelles Deck erstellen' : 'Create virtual deck'}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => { closeActions(); onCreateCard() }}
                className={SHEET_ITEM}
              >
                <span className="inline-flex items-center gap-2.5">
                  <Plus size={15} strokeWidth={1.5} className="text-white/50" />
                  {t.create_card}
                </span>
              </button>

              <div className="my-2 border-t border-[#1f1f23]" />
              <p className={SHEET_LABEL}>{language === 'de' ? 'Daten' : 'Data'}</p>
              <button
                type="button"
                onClick={() => { closeActions(); onImport() }}
                className={SHEET_ITEM}
              >
                <span className="inline-flex items-center gap-2.5">
                  <Upload size={15} strokeWidth={1.5} className="text-[--brand-primary]" />
                  {t.import_action} {language === 'de' ? 'Karten/Decks' : 'cards/decks'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => { closeActions(); onExport() }}
                className={SHEET_ITEM}
              >
                <span className="inline-flex items-center gap-2.5">
                  <Download size={15} strokeWidth={1.5} className="text-white/50" />
                  {t.backup_export_title}
                </span>
              </button>

              {canInstall && !isInstalled && (
                <>
                  <div className="my-2 border-t border-[#1f1f23]" />
                  <button
                    type="button"
                    onClick={() => { closeActions(); onInstall() }}
                    disabled={isInstalling}
                    className={`${SHEET_ITEM} disabled:opacity-60`}
                  >
                    <span className="inline-flex items-center gap-2.5">
                      {isInstalling
                        ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        : <Download size={15} strokeWidth={1.5} className="text-white/50" />
                      }
                      {t.install}
                    </span>
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
