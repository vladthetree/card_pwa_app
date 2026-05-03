import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, ChevronRight, Layers3, MoreHorizontal, List, BarChart3, Trash2 } from 'lucide-react'
import { STRINGS } from '../contexts/SettingsContext'
import { UI_TOKENS } from '../constants/ui'
import { animationItem } from '../constants/animations'
import { useFloatingMenu } from '../hooks/useFloatingMenu'
import { DeckTitleMarquee } from './DeckTitleMarquee'
import { DeckSchedulePanel } from './DeckSchedulePanel'
import { formatDeckName } from '../utils/cardTextParser'
import type { Deck, DeckScheduleOverview } from '../types'

function dueBadgeClass(due: number): string {
  if (due === 0) return 'text-zinc-500 border-[#18181b] bg-transparent'
  if (due <= 5)  return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/[0.08]'
  if (due <= 20) return 'text-amber-300 border-amber-500/30 bg-amber-500/[0.08]'
  return 'text-rose-300 border-rose-500/35 bg-rose-500/[0.08]'
}

export function DeckCard({ deck, language, onStartStudy, onDelete, schedule, deckScheduleOverview, onShowMetrics, onManageCards, nested = false }: {
  deck: Deck
  language: 'de' | 'en'
  onStartStudy: (deck: Deck) => void
  onDelete: (deckId: string, name: string) => void
  schedule?: DeckScheduleOverview
  deckScheduleOverview?: Record<string, DeckScheduleOverview>
  onShowMetrics: (deck: Deck) => void
  onManageCards: (deck: Deck) => void
  nested?: boolean
}) {
  const t = STRINGS[language]
  const deckTitle = formatDeckName(deck.name)
  const prefersReducedMotion = useReducedMotion()
  const [menuOpen, setMenuOpen] = useState(false)
  const [subDecksOpen, setSubDecksOpen] = useState(false)
  const subDecksRef = useRef<HTMLDivElement | null>(null)
  const subDecks = nested ? [] : deck.subDecks ?? []
  const hasSubDecks = subDecks.length > 0

  const resolvedSchedule = schedule ?? deckScheduleOverview?.[deck.id]
  const dueNow = resolvedSchedule?.today.total ?? 0

  const closeMenu = useCallback(() => { setMenuOpen(false) }, [])
  const { anchorRef, menuRef, floatingStyle, updatePosition } = useFloatingMenu<HTMLDivElement, HTMLDivElement>({
    isOpen: menuOpen,
    onClose: closeMenu,
    width: 232,
  })

  const handleCardKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onStartStudy(deck)
    }
  }

  useEffect(() => {
    if (!subDecksOpen) return
    window.requestAnimationFrame(() => {
      subDecksRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
  }, [subDecksOpen])

  return (
    <div className="min-w-0">
      <motion.div
        variants={nested ? undefined : animationItem}
        initial={nested ? false : undefined}
        animate={nested ? { opacity: 1, y: 0 } : undefined}
        className={`group relative w-full transition-all duration-300 ease-out hover:border-[#3f3f46] ${
          nested
            ? 'rounded-[12px] border border-[#242428] bg-[#080808] p-3 shadow-none'
            : 'ds-card p-3 sm:p-5'
        }`}
        whileHover={prefersReducedMotion ? {} : { y: -2, transition: { duration: 0.18 } }}
        whileTap={prefersReducedMotion ? {} : { scale: 0.99, transition: { duration: 0.1 } }}
      >
        {/* Due badge */}
        {dueNow > 0 && (
          <div
            className={`absolute top-3 ${hasSubDecks ? 'right-24' : 'right-12'} rounded-[6px] border px-2 py-0.5 text-[10px] font-mono font-bold tabular-nums tracking-wide ${dueBadgeClass(dueNow)}`}
            aria-label={`${dueNow} ${t.stats_now_due}`}
          >
            {dueNow}
          </div>
        )}

        {hasSubDecks && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setSubDecksOpen(value => !value)
            }}
            className="ds-icon-button absolute right-14 top-3 z-10 h-9 w-9 border-[#2f2f35] bg-[#101010] text-zinc-200 opacity-100 hover:border-[--brand-primary-50]"
            aria-expanded={subDecksOpen}
            aria-label={language === 'de' ? 'Subdecks anzeigen' : 'Show subdecks'}
            title={language === 'de' ? 'Subdecks anzeigen' : 'Show subdecks'}
          >
            {subDecksOpen ? <ChevronDown size={UI_TOKENS.icon.lg} strokeWidth={1.5} /> : <ChevronRight size={UI_TOKENS.icon.lg} strokeWidth={1.5} />}
          </button>
        )}

        {/* Context menu */}
        <div className="absolute right-3 top-3 z-10" ref={anchorRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              updatePosition()
              setMenuOpen(v => !v)
            }}
            className="ds-icon-button h-9 w-9 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={language === 'de' ? 'Deck-Aktionen' : 'Deck actions'}
          >
            <MoreHorizontal size={UI_TOKENS.icon.lg} strokeWidth={1.5} />
          </button>
          {menuOpen && floatingStyle && createPortal(
            <div
              ref={menuRef}
              className="fixed z-[1100] ds-menu py-1"
              style={floatingStyle}
              role="menu"
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); closeMenu(); onManageCards(deck) }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-zinc-300 hover:bg-[#111] hover:text-white transition-colors text-left"
                role="menuitem"
              >
                <List size={UI_TOKENS.icon.md} strokeWidth={1.5} /> {t.manage_cards}
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); closeMenu(); onShowMetrics(deck) }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-zinc-300 hover:bg-[#111] hover:text-white transition-colors text-left"
                role="menuitem"
              >
                <BarChart3 size={UI_TOKENS.icon.md} strokeWidth={1.5} /> {t.metrics_button}
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); closeMenu(); onDelete(deck.id, deck.name) }}
                className="w-full flex items-center gap-2 border-t border-[#18181b] px-4 py-3 text-sm text-rose-300 hover:bg-rose-500/10 hover:text-rose-100 transition-colors text-left"
                role="menuitem"
              >
                <Trash2 size={UI_TOKENS.icon.md} strokeWidth={1.5} /> {t.deck_delete_title}
              </button>
            </div>,
            document.body,
          )}
        </div>

        {/* Title row */}
        <div
          className={`mb-3 cursor-pointer sm:mb-4 ${hasSubDecks ? 'pr-20 sm:pr-24' : 'pr-9 sm:pr-10'}`}
          role="button"
          tabIndex={0}
          onClick={() => onStartStudy(deck)}
          onKeyDown={handleCardKeyDown}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`shrink-0 ${nested ? 'h-1.5 w-1.5 rounded-[2px]' : 'h-2 w-2 rounded-full'} ${dueNow > 0 ? 'bg-[--brand-primary]' : 'bg-white/20'}`}
              aria-hidden="true"
            />
            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
              <DeckTitleMarquee title={deckTitle} />
            </div>
          </div>
          {nested && (
            <div className="mt-1 inline-flex items-center gap-1.5 rounded-[5px] border border-[#242428] bg-[#050505] px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.12em] text-white/40">
              <Layers3 size={10} strokeWidth={1.5} />
              <span>{language === 'de' ? 'Subdeck' : 'Subdeck'}</span>
            </div>
          )}
          {hasSubDecks && (
            <div className="mt-1 inline-flex items-center gap-1.5 rounded-[6px] border border-[--brand-primary-25] bg-[--brand-primary-12] px-2 py-0.5 text-[10px] font-medium text-zinc-200">
              <Layers3 size={11} strokeWidth={1.5} />
              <span>{subDecks.length} {language === 'de' ? 'Subdecks' : 'subdecks'}</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex gap-2.5 sm:gap-3">
          <div
            className="flex-1 min-w-0 cursor-pointer"
            role="button"
            tabIndex={-1}
            onClick={() => onStartStudy(deck)}
            onKeyDown={handleCardKeyDown}
          >
            <DeckSchedulePanel language={language} schedule={resolvedSchedule} />
          </div>
          <div className="flex w-16 shrink-0 flex-col items-center justify-center border-l border-[#18181b] pl-2 sm:w-24 sm:pl-3">
            <span className="text-4xl font-black font-mono tabular-nums leading-none text-white sm:text-6xl">{deck.total}</span>
            <span className="mt-1 text-[8px] font-mono text-white/30 uppercase tracking-widest sm:mt-2 sm:text-[10px]">{t.cards}</span>
          </div>
        </div>
      </motion.div>

      {hasSubDecks && subDecksOpen && (
        <motion.div
          ref={subDecksRef}
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          className="mt-2 min-w-0 scroll-mt-3 rounded-[12px] border border-[#242428] bg-[#060606] p-2.5 sm:p-3"
        >
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-zinc-200">
              <Layers3 size={14} strokeWidth={1.5} className="shrink-0 text-[--brand-primary]" />
              <span className="truncate">{language === 'de' ? 'Direkte Subdecks' : 'Direct subdecks'}</span>
            </div>
            <span className="shrink-0 rounded-[5px] border border-[#2f2f35] bg-[#0d0d0d] px-2 py-0.5 text-[10px] font-mono text-white/55">
              {subDecks.length}
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-2 border-l-2 border-[--brand-primary-50] pl-2 sm:pl-3">
            {subDecks.map(subDeck => (
              <DeckCard
                key={subDeck.id}
                deck={subDeck}
                language={language}
                onStartStudy={onStartStudy}
                onDelete={onDelete}
                deckScheduleOverview={deckScheduleOverview}
                onShowMetrics={onShowMetrics}
                onManageCards={onManageCards}
                nested
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
