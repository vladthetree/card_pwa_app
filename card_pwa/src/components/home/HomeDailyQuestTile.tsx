import { motion } from 'framer-motion'
import { ListTree, Play, Sparkles } from 'lucide-react'

/**
 * HomeDailyQuestTile — Dashboard-Modus "Pilot" (rekonstruiert aus dem
 * Handy-Screenshot vom 8. Juni 2026, `WhatsApp …23.36.20.jpeg`):
 * "DAILY QUEST / Jetzt: 25 Karten / <Top-Deck> · <heute fällig> …" mit
 * grünem "25 Karten starten"-Button und sekundärem "Decks anzeigen".
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
      className="rounded-[16px] border border-emerald-500/25 bg-[#0a0f0c] p-3 shadow-card sm:p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
          <Sparkles size={20} strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-400/80">
            {copy.label}
          </div>
          <div className="mt-0.5 truncate font-mono text-lg font-bold text-white sm:text-xl">
            {hasWork ? copy.now(questSize) : copy.allDone}
          </div>
          <div className="mt-0.5 truncate font-mono text-[12px] text-white/45">
            {subtitleParts.join(' · ')}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-stretch gap-2">
        <button
          type="button"
          data-testid="daily-quest-start"
          onClick={onStart}
          disabled={!hasWork || starting}
          className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-[14px] bg-emerald-500/85 px-4 font-mono text-[14px] font-semibold text-[#04140b] transition-all duration-150 hover:bg-emerald-400 active:scale-[0.99] disabled:cursor-default disabled:opacity-40"
        >
          {starting
            ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#04140b]/30 border-t-[#04140b]" />
            : <Play size={16} strokeWidth={2} />}
          {copy.start(questSize)}
        </button>
        <button
          type="button"
          onClick={onShowDecks}
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-[14px] border border-[#1f1f23] bg-[#101012] px-4 font-mono text-[13px] text-white/75 transition-colors hover:border-[#3f3f46] hover:text-white active:scale-[0.99]"
        >
          <ListTree size={15} strokeWidth={1.5} />
          {copy.showDecks}
        </button>
      </div>
    </motion.section>
  )
}
