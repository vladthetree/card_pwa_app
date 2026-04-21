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
      style={{
        paddingTop: 'calc(var(--safe-top) + 1rem)',
        paddingBottom: 'calc(var(--safe-bottom) + 1rem)',
      }}
    >
      <button type="button" className={UI_TOKENS.modal.backdrop} onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        className={`${UI_TOKENS.modal.shell} max-w-2xl p-5 sm:p-6 overflow-hidden`}
        style={{ maxHeight: 'calc(100dvh - var(--safe-top) - var(--safe-bottom) - 2rem)' }}
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
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto pr-1 max-h-[65vh]">
          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl border border-white/10 bg-white/5 animate-pulse" />)}</div>
          ) : error ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-300 text-sm">{error}</div>
          ) : cards.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white/70 text-sm">{t.no_cards_in_deck}</div>
          ) : (
            <div className="space-y-2">
              {cards.map(card => {
                const parsedQuestion = parseQuestionText(card.front)
                const parsedAnswer = parseAnswerText(card.back)
                const optionEntries = Object.entries(parsedQuestion.options)

                return (
                  <div key={card.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-wide text-white/45 mb-1">{language === 'de' ? 'Frage' : 'Question'}</p>
                          <p className="text-sm text-white font-medium whitespace-pre-wrap break-words">
                            {parsedQuestion.question || card.front.replace(/\n+/g, ' ')}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-wide text-white/45 mb-1">{language === 'de' ? 'Antwortmöglichkeiten' : 'Options'}</p>
                          {optionEntries.length > 0 ? (
                            <div className="space-y-1">
                              {optionEntries.map(([key, value]) => (
                                <p key={key} className="text-sm text-white/85 whitespace-pre-wrap break-words">
                                  <span className="font-semibold text-white">{key}:</span> {value}
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-white/60">-</p>
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

                    <div className="rounded-lg border border-white/10 bg-black/30 p-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-white/45 mb-1">{language === 'de' ? 'Antwort' : 'Answer'}</p>
                      <p className="text-sm text-white/85 whitespace-pre-wrap break-words">
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
