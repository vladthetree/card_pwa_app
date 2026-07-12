/**
 * AI_CONTEXT: Home-screen React component for home Daily Quest Tile; supports dashboard, deck browsing, tag browsing, export, or quick study workflows.
 */
import { motion } from '../../ui/motion'
import { ListChecks, Play } from 'lucide-react'

/**
 * HomeDailyQuestTile — Dashboard-Modus "Pilot" (rekonstruiert aus dem
 * Handy-Screenshot vom 8. Juni 2026, `WhatsApp …23.36.20.jpeg`):
 * "DAILY QUEST / Jetzt: <Tageslimit> Karten / <Top-Deck> · <heute fällig> …"
 * mit einer klaren Start-Aktion.
 * Startet eine gemischte Session über mehrere Decks (pickDailyQuestCards).
 */

const COPY = {
  de: {
    label: 'Daily Quest',
    now: (count: number) => `Jetzt: ${count} ${count === 1 ? 'Karte' : 'Karten'}`,
    start: (count: number) => `${count} ${count === 1 ? 'Karte' : 'Karten'} starten`,
    dueToday: (count: number) => `${count} heute fällig`,
    mixed: 'Alle Decks · fällige zuerst',
    focus: (name: string) => `Fokus: ${name}`,
    allDone: 'Alles erledigt — keine lernbereiten Karten',
    noDecksTitle: 'Starte mit deinem ersten Deck',
    noDecksHint: 'Importiere ein Deck, um zu lernen',
  },
  en: {
    label: 'Daily Quest',
    now: (count: number) => `Now: ${count} ${count === 1 ? 'card' : 'cards'}`,
    start: (count: number) => `Start ${count} ${count === 1 ? 'card' : 'cards'}`,
    dueToday: (count: number) => `${count} due today`,
    mixed: 'All decks · due cards first',
    focus: (name: string) => `Focus: ${name}`,
    allDone: 'All done — no study-ready cards',
    noDecksTitle: 'Start with your first deck',
    noDecksHint: 'Import a deck to start learning',
  },
} as const

interface Props {
  language: 'de' | 'en'
  /** Quest-Groesse aus "Taegliche Karten pro Deck" (vom Gesamtpool gekappt). */
  questSize: number
  /** Gesamtzahl jetzt fälliger Karten (stats.nowDue). */
  dueTodayTotal: number
  /** Deck mit den meisten heute fälligen Karten — Untertitel-Hinweis. */
  topDeckName: string | null
  /** false = leeres Profil: Onboarding-Text statt „Alles erledigt“ + totem Button. */
  hasDecks?: boolean
  starting: boolean
  onStart: () => void
}

export function HomeDailyQuestTile({
  language, questSize, dueTodayTotal, topDeckName, hasDecks = true, starting, onStart,
}: Props) {
  const copy = COPY[language]
  const hasWork = questSize > 0
  const subtitleParts = hasDecks
    ? [
        copy.mixed,
        copy.dueToday(dueTodayTotal),
        ...(topDeckName ? [copy.focus(topDeckName)] : []),
      ]
    : [copy.noDecksHint]

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      data-testid="daily-quest-tile"
      className="min-w-0 overflow-hidden rounded-ds border border-transparent bg-ds-card p-3 shadow-card card-gradient-border sm:p-4"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[7px] border border-[--brand-primary-25] bg-[--brand-primary-08] text-[--brand-primary]">
          <ListChecks size={20} strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[--brand-primary]">
            {copy.label}
          </div>
          <div className="mt-0.5 break-words font-sans text-base font-semibold leading-tight text-ds-fg min-[420px]:text-lg sm:text-xl">
            {hasWork ? copy.now(questSize) : hasDecks ? copy.allDone : copy.noDecksTitle}
          </div>
          <div className="mt-0.5 truncate font-mono text-[12px] text-ds-muted">
            {subtitleParts.join(' · ')}
          </div>
        </div>
      </div>

      {hasDecks && (
      <div className="mt-3 grid min-w-0 gap-2">
        <button
          type="button"
          data-testid="daily-quest-start"
          onClick={onStart}
          disabled={!hasWork || starting}
          className="flex min-h-[48px] min-w-0 items-center justify-center gap-2 rounded-ds border border-[--brand-primary-50] bg-[--brand-primary] px-3 font-sans text-[14px] font-semibold text-[#150b08] transition-all duration-150 hover:brightness-110 active:scale-[0.98] disabled:cursor-default disabled:border-ds-border disabled:bg-ds-floor disabled:text-ds-muted disabled:opacity-100 sm:px-4"
        >
          {starting
            ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#150b08]/30 border-t-[#150b08]" />
            : <Play size={16} strokeWidth={2} />}
          <span className="min-w-0 truncate">{copy.start(questSize)}</span>
        </button>
      </div>
      )}
    </motion.section>
  )
}
