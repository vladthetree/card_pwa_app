import { motion } from 'framer-motion'
import { RefreshCw, AlertCircle, Upload } from 'lucide-react'
import { animationContainer } from '../../constants/animations'
import { DeckCard } from '../DeckCard'
import type { Deck, DeckScheduleOverview } from '../../types'

interface Props {
  t: Record<string, string>
  language: 'de' | 'en'
  error: string | null
  loading: boolean
  decks: Deck[]
  filteredDecks: Deck[]
  visibleDecks: Deck[]
  deckScheduleOverview: Record<string, DeckScheduleOverview>
  onReload: () => void
  onShowImport: () => void
  onStartStudy: (deck: Deck) => void
  onDelete: (deckId: string, name: string) => void
  onShowMetrics: (deck: Deck) => void
  onManageCards: (deck: Deck) => void
}

export function HomeDeckListSection({
  t,
  language,
  error,
  loading,
  decks,
  filteredDecks,
  visibleDecks,
  deckScheduleOverview,
  onReload,
  onShowImport,
  onStartStudy,
  onDelete,
  onShowMetrics,
  onManageCards,
}: Props) {
  return (
    <div className="relative z-0 flex-1 overflow-y-auto no-scrollbar pb-[calc(var(--safe-bottom)+1rem)] pr-1">
      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass border-rose-500/30 bg-rose-500/10 p-4 rounded-xl text-rose-300 text-sm mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><AlertCircle size={16} /><span>{error}</span></div>
          <button onClick={onReload} className="ml-3 px-3 py-1 bg-rose-500/30 hover:bg-rose-500/50 rounded-lg text-xs font-medium transition"><RefreshCw size={12} className="inline mr-1" /> {t.retry}</button>
        </motion.div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2.5 sm:gap-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 glass rounded-2xl animate-pulse" />)}</div>
      ) : decks.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <p className="text-white/30 text-sm mb-4">{t.no_decks}</p>
          <button onClick={onShowImport} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black text-white transition-all duration-300 ease-out active:scale-95" style={{ background: 'linear-gradient(135deg, var(--brand-primary-80), var(--brand-primary))' }}>
            <Upload size={16} /> {t.import_now}
          </button>
        </motion.div>
      ) : filteredDecks.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <p className="text-white/40 text-sm">
            {language === 'de' ? 'Keine Decks zu deiner Suche gefunden.' : 'No decks match your search.'}
          </p>
        </motion.div>
      ) : (
        <motion.div variants={animationContainer} initial="hidden" animate="show" className="flex flex-col gap-2.5 sm:gap-3">
          {visibleDecks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              language={language}
              onStartStudy={onStartStudy}
              onDelete={onDelete}
              schedule={deckScheduleOverview[deck.id]}
              onShowMetrics={onShowMetrics}
              onManageCards={onManageCards}
            />
          ))}
        </motion.div>
      )}
    </div>
  )
}
