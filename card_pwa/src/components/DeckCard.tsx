import { useCallback, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { MoreHorizontal, List, BarChart3, Trash2 } from 'lucide-react'
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

export function DeckCard({ deck, language, onStartStudy, onDelete, schedule, onShowMetrics, onManageCards }: {
  deck: Deck
  language: 'de' | 'en'
  onStartStudy: (deck: Deck) => void
  onDelete: (deckId: string, name: string) => void
  schedule?: DeckScheduleOverview
  onShowMetrics: (deck: Deck) => void
  onManageCards: (deck: Deck) => void
}) {
  const t = STRINGS[language]
  const deckTitle = formatDeckName(deck.name)
  const prefersReducedMotion = useReducedMotion()
  const [menuOpen, setMenuOpen] = useState(false)

  const dueNow = schedule?.today.total ?? 0

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

  return (
    <motion.div
      variants={animationItem}
      className="group relative w-full ds-card p-3 transition-all duration-300 ease-out hover:border-[#3f3f46] sm:p-5"
      whileHover={prefersReducedMotion ? {} : { y: -2, transition: { duration: 0.18 } }}
      whileTap={prefersReducedMotion ? {} : { scale: 0.99, transition: { duration: 0.1 } }}
    >
      {/* Due badge */}
      {dueNow > 0 && (
        <div
          className={`absolute top-3 right-12 rounded-[6px] border px-2 py-0.5 text-[10px] font-mono font-bold tabular-nums tracking-wide ${dueBadgeClass(dueNow)}`}
          aria-label={`${dueNow} ${t.stats_now_due}`}
        >
          {dueNow}
        </div>
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
        className="mb-3 cursor-pointer pr-9 sm:mb-4 sm:pr-10"
        role="button"
        tabIndex={0}
        onClick={() => onStartStudy(deck)}
        onKeyDown={handleCardKeyDown}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`shrink-0 w-2 h-2 rounded-full ${dueNow > 0 ? 'bg-[--brand-primary]' : 'bg-white/20'}`}
            aria-hidden="true"
          />
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            <DeckTitleMarquee title={deckTitle} />
          </div>
        </div>
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
          <DeckSchedulePanel language={language} schedule={schedule} />
        </div>
        <div className="flex w-16 shrink-0 flex-col items-center justify-center border-l border-[#18181b] pl-2 sm:w-24 sm:pl-3">
          <span className="text-4xl font-black font-mono tabular-nums leading-none text-white sm:text-6xl">{deck.total}</span>
          <span className="mt-1 text-[8px] font-mono text-white/30 uppercase tracking-widest sm:mt-2 sm:text-[10px]">{t.cards}</span>
        </div>
      </div>
    </motion.div>
  )
}
