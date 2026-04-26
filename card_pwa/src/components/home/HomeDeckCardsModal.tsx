import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useDeckCards } from '../../hooks/useCardDb'
import { STRINGS } from '../../contexts/SettingsContext'
import { UI_TOKENS } from '../../constants/ui'
import type { Deck, Card } from '../../types'
import { formatDeckName, parseAnswerText, parseQuestionText } from '../../utils/cardTextParser'
import EditCardModal from '../EditCardModal.tsx'

interface Props {
  deck: Deck
  language: 'de' | 'en'
  onClose: () => void
}

export function HomeDeckCardsModal({ deck, language, onClose }: Props) {
  const t = STRINGS[language]
  const { cards, loading, error, reload } = useDeckCards(deck.id)
  const [editingCard, setEditingCard] = useState<Card | null>(null)

  const handleCardSaved = async () => {
    setEditingCard(null)
    await reload()
  }

  const handleCardDeleted = async () => {
    setEditingCard(null)
    await reload()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={UI_TOKENS.modal.overlay}
    >
      <button type="button" className={UI_TOKENS.modal.backdrop} onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        className={`${UI_TOKENS.modal.shell} max-w-2xl p-5 sm:p-6 overflow-hidden`}
        style={{ maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 2rem)' }}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className={UI_TOKENS.modal.title}>{t.deck_cards_title}</h3>
            <p className={UI_TOKENS.modal.subtitle}>{formatDeckName(deck.name)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={UI_TOKENS.modal.closeButton}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="overflow-y-auto pr-1 max-h-[65vh]">
          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-[12px] border border-[#18181b] bg-[#0c0c0c] animate-pulse" />)}</div>
          ) : error ? (
            <div className="rounded-[12px] border border-rose-500/30 bg-rose-950/30 p-3 text-rose-300 text-sm">{error}</div>
          ) : cards.length === 0 ? (
            <div className="rounded-[12px] border border-[#18181b] bg-[#0c0c0c] p-4 text-zinc-400 text-sm shadow-card">{t.no_cards_in_deck}</div>
          ) : (
            <div className="space-y-2">
              {cards.map(card => {
                const parsedQuestion = parseQuestionText(card.front)
                const parsedAnswer = parseAnswerText(card.back)
                const optionEntries = Object.entries(parsedQuestion.options)

                return (
                  <div key={card.id} className="rounded-[12px] border border-[#18181b] bg-[#0c0c0c] p-3 space-y-3 shadow-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1 font-mono">{language === 'de' ? 'Frage' : 'Question'}</p>
                          <p className="text-sm text-zinc-50 font-medium whitespace-pre-wrap break-words">
                            {parsedQuestion.question || card.front.replace(/\n+/g, ' ')}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1 font-mono">{language === 'de' ? 'Antwortmöglichkeiten' : 'Options'}</p>
                          {optionEntries.length > 0 ? (
                            <div className="space-y-1">
                              {optionEntries.map(([key, value]) => (
                                <p key={key} className="text-sm text-zinc-300 whitespace-pre-wrap break-words">
                                  <span className="font-semibold text-zinc-50">{key}:</span> {value}
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-zinc-500">-</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingCard(card)}
                        className={`${UI_TOKENS.button.ghost} shrink-0`}
                      >
                        {t.edit_card}
                      </button>
                    </div>

                    <div className="rounded-[12px] border border-[#18181b] bg-[#0a0a0a] p-2.5">
                      <p className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1 font-mono">{language === 'de' ? 'Antwort' : 'Answer'}</p>
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words">
                        {parsedAnswer.answer || card.back.replace(/\n+/g, ' ')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </motion.div>

      <AnimatePresence>
        {editingCard && (
          <EditCardModal
            card={editingCard}
            onClose={() => setEditingCard(null)}
            onSaved={handleCardSaved}
            onDeleted={handleCardDeleted}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
