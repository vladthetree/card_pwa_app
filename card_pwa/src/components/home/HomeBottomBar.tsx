/**
 * AI_CONTEXT: Home-screen React component for home Bottom Bar; supports dashboard, deck browsing, tag browsing, export, or quick study workflows.
 */
import { useState, useCallback } from 'react'
import {
  Check, Download, FolderPlus, Plus,
  RefreshCw, Settings, SlidersHorizontal, Upload,
  Shuffle,
} from 'lucide-react'
import StreakBadge from '../StreakBadge'
import {
  MobileBottomSheet,
  MobileBottomSheetDivider,
  MobileBottomSheetItem,
  MobileBottomSheetLabel,
} from '../MobileBottomSheet'
import type { DeckSortMode } from '../../hooks/home/useHomeDeckFilters'

type HomeTab = 'decks' | 'tags'
import { UI_TOKENS } from '../../constants/ui'

interface Props {
  t: Record<string, string>
  language: 'de' | 'en'
  shuffleModeEnabled: boolean
  showShuffleOnly: boolean
  deckSortMode: DeckSortMode
  homeTab: HomeTab
  canInstall: boolean
  isInstalled: boolean
  isInstalling: boolean
  onHomeTabChange: (tab: HomeTab) => void
  onDeckSortModeChange: (v: DeckSortMode) => void
  onToggleShuffleOnly: () => void
  onReload: () => void
  onCreateDeck: () => void
  onCreateVirtualDeck?: () => void
  onCreateCard: () => void
  onImport: () => void
  onExport: () => void
  onShowSettings: () => void
  onInstall: () => void
  /** Labs im ANSICHT-Menü (Beleg `…23.40.53.jpeg`). */
  onOpenLabs?: () => void
  /** Lernvideos (Professor Messer) im ANSICHT-Menü. */
  onOpenVideos?: () => void
}

export function HomeBottomBar({
  t,
  language,
  shuffleModeEnabled,
  showShuffleOnly,
  deckSortMode,
  homeTab,
  canInstall,
  isInstalled,
  isInstalling,
  onHomeTabChange,
  onDeckSortModeChange,
  onToggleShuffleOnly,
  onReload,
  onCreateDeck,
  onCreateVirtualDeck,
  onCreateCard,
  onImport,
  onExport,
  onShowSettings,
  onInstall,
  onOpenLabs,
  onOpenVideos,
}: Props) {
  const [filterOpen,  setFilterOpen]  = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)

  const closeFilter  = useCallback(() => setFilterOpen(false),  [])
  const closeActions = useCallback(() => setActionsOpen(false), [])

  const isFilterActive = showShuffleOnly || deckSortMode !== 'name' || homeTab === 'tags'

  return (
    <>
      {/* Mobile quick controls: icon targets stay, the old visual bar is gone. */}
      <div className="sm:hidden">
        <div className={`${UI_TOKENS.layout.homeMaxWidth} mx-auto px-2`}>
          <div className="flex items-center justify-around gap-1.5 py-1">

            {/* Reload */}
            <button
              type="button"
              onClick={onReload}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-ds border border-transparent bg-transparent text-white/48 transition-colors hover:bg-ds-card/55 hover:text-white active:scale-[0.98] active:bg-ds-card/70"
              aria-label={t.reload}
              title={t.reload}
            >
              <RefreshCw size={17} strokeWidth={1.5} />
            </button>

            {/* Filter */}
            <button
              type="button"
              onClick={() => { setActionsOpen(false); setFilterOpen(v => !v) }}
              className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-ds border transition-colors hover:bg-ds-card/55 hover:text-white active:scale-[0.98] active:bg-ds-card/70 ${
                filterOpen ? 'border-[--brand-primary-25] bg-[--brand-primary-08] text-[--brand-primary]' : 'border-transparent bg-transparent text-white/48'
              }`}
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
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-ds border border-transparent bg-transparent text-white/48 transition-colors hover:bg-ds-card/55 hover:text-white active:scale-[0.98] active:bg-ds-card/70"
              aria-label={t.settings}
              title={t.settings}
            >
              <Settings size={17} strokeWidth={1.5} />
            </button>

            {/* Streak */}
            <StreakBadge compact />

            {/* Create / Actions */}
            <button
              type="button"
              onClick={() => { setFilterOpen(false); setActionsOpen(v => !v) }}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-ds border transition-colors active:scale-[0.98] ${
                actionsOpen
                  ? 'border-white/35 bg-white/10 text-white'
                  : 'border-transparent bg-transparent text-white hover:bg-ds-card/55'
              }`}
              aria-label={language === 'de' ? 'Erstellen & Aktionen' : 'Create & actions'}
              title={language === 'de' ? 'Erstellen' : 'Create'}
            >
              <Plus size={18} strokeWidth={1.8} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      <MobileBottomSheet
        open={filterOpen}
        onClose={closeFilter}
        ariaLabel={language === 'de' ? 'Filter & Sortierung' : 'Filter & sort'}
      >
        <MobileBottomSheetLabel>{language === 'de' ? 'Ansicht' : 'View'}</MobileBottomSheetLabel>
        <MobileBottomSheetItem onClick={() => { if (showShuffleOnly) onToggleShuffleOnly(); onHomeTabChange('decks'); closeFilter() }}>
          <span>{language === 'de' ? 'Decks' : 'Decks'}</span>
          {!showShuffleOnly && homeTab === 'decks' && <Check size={16} strokeWidth={1.5} className="text-[--brand-primary]" />}
        </MobileBottomSheetItem>
        <MobileBottomSheetItem onClick={() => { if (showShuffleOnly) onToggleShuffleOnly(); onHomeTabChange('tags'); closeFilter() }}>
          <span>{language === 'de' ? 'Nach Tags' : 'By tags'}</span>
          {!showShuffleOnly && homeTab === 'tags' && <Check size={16} strokeWidth={1.5} className="text-[--brand-primary]" />}
        </MobileBottomSheetItem>
        {shuffleModeEnabled && (
          <MobileBottomSheetItem onClick={() => { if (!showShuffleOnly) onToggleShuffleOnly(); onHomeTabChange('decks'); closeFilter() }}>
            <span>{language === 'de' ? 'Shuffle-Decks' : 'Shuffle decks'}</span>
            {showShuffleOnly && <Check size={16} strokeWidth={1.5} className="text-[--brand-primary]" />}
          </MobileBottomSheetItem>
        )}
        {onOpenLabs && (
          <MobileBottomSheetItem onClick={() => { closeFilter(); onOpenLabs() }}>
            <span>Labs</span>
          </MobileBottomSheetItem>
        )}
        {onOpenVideos && (
          <MobileBottomSheetItem onClick={() => { closeFilter(); onOpenVideos() }}>
            <span>{language === 'de' ? 'Lernvideos' : 'Videos'}</span>
          </MobileBottomSheetItem>
        )}

        {!showShuffleOnly && (
          <>
            <MobileBottomSheetDivider />
            <MobileBottomSheetLabel>{language === 'de' ? 'Sortierung' : 'Sort'}</MobileBottomSheetLabel>
            <MobileBottomSheetItem onClick={() => { onDeckSortModeChange('name'); closeFilter() }}>
              <span>{t.sort_name}</span>
              {deckSortMode === 'name' && <Check size={16} strokeWidth={1.5} className="text-[--brand-primary]" />}
            </MobileBottomSheetItem>
            <MobileBottomSheetItem onClick={() => { onDeckSortModeChange('due_today'); closeFilter() }}>
              <span>{t.sort_due_today}</span>
              {deckSortMode === 'due_today' && <Check size={16} strokeWidth={1.5} className="text-[--brand-primary]" />}
            </MobileBottomSheetItem>
          </>
        )}
      </MobileBottomSheet>

      <MobileBottomSheet
        open={actionsOpen}
        onClose={closeActions}
        ariaLabel={language === 'de' ? 'Erstellen & Aktionen' : 'Create & actions'}
      >
        <MobileBottomSheetLabel>{language === 'de' ? 'Erstellen' : 'Create'}</MobileBottomSheetLabel>
        <MobileBottomSheetItem onClick={() => { closeActions(); onCreateDeck() }}>
          <span className="inline-flex items-center gap-2.5">
            <FolderPlus size={15} strokeWidth={1.5} className="text-white/50" />
            {t.create_deck}
          </span>
        </MobileBottomSheetItem>
        {shuffleModeEnabled && onCreateVirtualDeck && (
          <MobileBottomSheetItem onClick={() => { closeActions(); onCreateVirtualDeck() }}>
            <span className="inline-flex items-center gap-2.5">
              <Shuffle size={15} strokeWidth={1.5} className="text-white/50" />
              {language === 'de' ? 'Virtuelles Deck erstellen' : 'Create virtual deck'}
            </span>
          </MobileBottomSheetItem>
        )}
        <MobileBottomSheetItem onClick={() => { closeActions(); onCreateCard() }}>
          <span className="inline-flex items-center gap-2.5">
            <Plus size={15} strokeWidth={1.5} className="text-white/50" />
            {t.create_card}
          </span>
        </MobileBottomSheetItem>

        <MobileBottomSheetDivider />
        <MobileBottomSheetLabel>{language === 'de' ? 'Daten' : 'Data'}</MobileBottomSheetLabel>
        <MobileBottomSheetItem onClick={() => { closeActions(); onImport() }}>
          <span className="inline-flex items-center gap-2.5">
            <Upload size={15} strokeWidth={1.5} className="text-[--brand-primary]" />
            {t.import_action} {language === 'de' ? 'Karten/Decks' : 'cards/decks'}
          </span>
        </MobileBottomSheetItem>
        <MobileBottomSheetItem onClick={() => { closeActions(); onExport() }}>
          <span className="inline-flex items-center gap-2.5">
            <Download size={15} strokeWidth={1.5} className="text-white/50" />
            {t.backup_export_title}
          </span>
        </MobileBottomSheetItem>

        {canInstall && !isInstalled && (
          <>
            <MobileBottomSheetDivider />
            <MobileBottomSheetItem
              onClick={() => { closeActions(); onInstall() }}
              disabled={isInstalling}
              className="disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2.5">
                {isInstalling
                  ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  : <Download size={15} strokeWidth={1.5} className="text-white/50" />
                }
                {t.install}
              </span>
            </MobileBottomSheetItem>
          </>
        )}
      </MobileBottomSheet>
    </>
  )
}
