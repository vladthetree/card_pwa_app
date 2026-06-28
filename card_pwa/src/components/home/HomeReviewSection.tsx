/**
 * AI_CONTEXT: Home-screen React component for home Review Section; supports dashboard, deck browsing, tag browsing, export, or quick study workflows.
 */
import { motion } from 'framer-motion'
import { BookOpen } from 'lucide-react'
import { DeckCard } from '../DeckCard'
import type { Deck, DeckScheduleOverview } from '../../types'

interface Props {
  language: 'de' | 'en'
  decks: Deck[]
  deckScheduleOverview: Record<string, DeckScheduleOverview>
  onStartStudy: (deck: Deck) => void
  onDelete: (deckId: string, name: string) => void
  onShowMetrics: (deck: Deck) => void
  onManageCards: (deck: Deck) => void
}

export function HomeReviewSection({
  language,
  decks,
  deckScheduleOverview,
  onStartStudy,
  onDelete,
  onShowMetrics,
  onManageCards,
}: Props) {
  if (decks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <BookOpen size={32} strokeWidth={1} className="mb-4 text-white/20" />
        <p className="text-sm text-white/30">
          {language === 'de' ? 'Keine Review-Decks vorhanden.' : 'No review decks yet.'}
        </p>
      </motion.div>
    )
  }

  return (
    <div
      className="relative z-0 min-h-0 flex-1 overflow-y-auto no-scrollbar pb-4 pr-1"
      style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain', touchAction: 'pan-y' }}
    >
      <div className="flex flex-col gap-2.5 sm:gap-3">
        {decks.map(deck => (
          <DeckCard
            key={deck.id}
            deck={deck}
            language={language}
            onStartStudy={onStartStudy}
            onDelete={onDelete}
            schedule={deckScheduleOverview[deck.id]}
            deckScheduleOverview={deckScheduleOverview}
            onShowMetrics={onShowMetrics}
            onManageCards={onManageCards}
          />
        ))}
      </div>
    </div>
  )
}
