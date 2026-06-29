/**
 * AI_CONTEXT: Home-screen React component for home Daily Quest Tile; supports dashboard, deck browsing, tag browsing, export, or quick study workflows.
 */
import { motion } from 'framer-motion'
import { ListTree, Play, Terminal } from 'lucide-react'

/**
 * HomeDailyQuestTile — Dashboard-Modus "Pilot" (rekonstruiert aus dem
 * Handy-Screenshot vom 8. Juni 2026, `WhatsApp …23.36.20.jpeg`):
 * "DAILY QUEST / Jetzt: 25 Karten / <Top-Deck> · <heute fällig> …" mit
 * klarem "25 Karten starten"-Button und sekundärem "Decks anzeigen".
 * Startet eine gemischte Session über mehrere Decks (fetchDailyQuestCards).
 */

const COPY = {
  de: {
    label: 'Daily Quest',
    now: (count: number) => `Jetzt: ${count} Karten`,
    start: (count: number) => `${count} Karten starten`,
    showDecks: 'Decks anzeigen',
    dueToday: (count: number) => `${count} heute fällig`,
    allDone: 'Alles erledigt — keine fälligen Karten',
  },
  en: {
    label: 'Daily Quest',
    now: (count: number) => `Now: ${count} cards`,
    start: (count: number) => `Start ${count} cards`,
    showDecks: 'Show decks',
    dueToday: (count: number) => `${count} due today`,
    allDone: 'All done — no cards due',
  },
} as const

interface Props {
  language: 'de' | 'en'
  /** Größe der Quest-Session (gekappt auf die fälligen Karten). */
  questSize: number
  /** Gesamtzahl jetzt fälliger Karten (stats.nowDue). */
  dueTodayTotal: number
  /** Deck mit den meisten heute fälligen Karten — Untertitel-Hinweis. */
  topDeckName: string | null
  starting: boolean
  onStart: () => void
  onShowDecks: () => void
}

export function HomeDailyQuestTile({
  language, questSize, dueTodayTotal, topDeckName, starting, onStart, onShowDecks,
}: Props) {
  const copy = COPY[language]
  const hasWork = questSize > 0
  const subtitleParts = [
    ...(topDeckName ? [topDeckName] : []),
    copy.dueToday(dueTodayTotal),
  ]

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      data-testid="daily-quest-tile"
      className="min-w-0 overflow-hidden rounded-[14px] border border-emerald-500/25 bg-[#090d0b] p-3 shadow-card sm:p-4"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
          <Terminal size={20} strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300/80">
            {copy.label}
          </div>
          <div className="mt-0.5 truncate font-mono text-base font-bold text-[#f0ede8] min-[420px]:text-lg sm:text-xl">
            {hasWork ? copy.now(questSize) : copy.allDone}
          </div>
          <div className="mt-0.5 truncate font-mono text-[12px] text-white/45">
            {subtitleParts.join(' · ')}
          </div>
        </div>
      </div>

      <div className="mt-3 grid min-w-0 gap-2 min-[420px]:grid-cols-[minmax(0,1fr)_auto]">
        <button
          type="button"
          data-testid="daily-quest-start"
          onClick={onStart}
          disabled={!hasWork || starting}
          className="flex min-h-[48px] min-w-0 items-center justify-center gap-2 rounded-[12px] border border-emerald-400/30 bg-emerald-400/85 px-3 font-mono text-[14px] font-semibold text-[#04140b] transition-all duration-150 hover:bg-emerald-300 active:scale-[0.98] disabled:cursor-default disabled:opacity-40 sm:px-4"
        >
          {starting
            ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#04140b]/30 border-t-[#04140b]" />
            : <Play size={16} strokeWidth={2} />}
          <span className="min-w-0 truncate">{copy.start(questSize)}</span>
        </button>
        <button
          type="button"
          onClick={onShowDecks}
          className="flex min-h-[48px] min-w-0 items-center justify-center gap-2 rounded-[12px] border border-[#1f1f23] bg-[#0c0c0c] px-3 font-mono text-[13px] text-white/75 transition-colors hover:border-[#3f3f46] hover:text-white active:scale-[0.98] sm:px-4"
        >
          <ListTree size={15} strokeWidth={1.5} />
          <span className="min-[420px]:hidden">{language === 'de' ? 'Decks' : 'Decks'}</span>
          <span className="hidden min-[420px]:inline">{copy.showDecks}</span>
        </button>
      </div>
    </motion.section>
  )
}
