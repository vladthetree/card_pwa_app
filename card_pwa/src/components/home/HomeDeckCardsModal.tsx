/**
 * AI_CONTEXT: Home-screen React component for home Deck Cards Modal; supports dashboard, deck browsing, tag browsing, export, or quick study workflows.
 */
import { useMemo, useState } from 'react'
import { AnimatePresence } from '../../ui/motion'
import { ChevronDown, Plus } from 'lucide-react'
import { useDeckCards } from '../../hooks/useCardDb'
import { STRINGS } from '../../contexts/SettingsContext'
import { UI_TOKENS } from '../../constants/ui'
import type { Deck, Card } from '../../types'
import { formatDeckName, parseMcAnswer, parseQuestion } from '../../utils/cardTextParser'
import { getCardVariant } from '../../utils/cardVariant'
import EditCardModal from '../EditCardModal.tsx'
import CreateCardModal from '../CreateCardModal.tsx'
import { Dialog } from '../../ui/overlays/Dialog'
import { getSecurityVisualForCard } from '../../utils/securityVisuals'
import { SecurityVisualization } from '../SecurityVisualization'

interface Props {
  deck: Deck
  language: 'de' | 'en'
  onClose: () => void
}

export function HomeDeckCardsModal({ deck, language, onClose }: Props) {
  const t = STRINGS[language]
  const { cards, loading, error, reload } = useDeckCards(deck.id)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [showCreateCard, setShowCreateCard] = useState(false)
  const [openVisualCardId, setOpenVisualCardId] = useState<string | null>(null)
  const [onlyCardsWithVisual, setOnlyCardsWithVisual] = useState(false)

  const handleCardSaved = async () => {
    setEditingCard(null)
    await reload()
  }

  const handleCardDeleted = async () => {
    setEditingCard(null)
    await reload()
  }

  // Parsing jeder Karte (Regex-lastig, bei SY0-701-Decks 800+ Karten) ist zu teuer,
  // um bei jedem Render neu zu laufen — z. B. beim Öffnen des Edit-Modals für eine
  // einzelne Karte (setEditingCard löst sonst ein Re-Parse aller Karten aus).
  const cardRows = useMemo(() => cards.map(card => {
    const variant = getCardVariant(card.front)
    const anyQuestion = parseQuestion(card.front)
    const parsedAnswer = parseMcAnswer(card.back)

    const frontPreview = (() => {
      if (anyQuestion.type === 'ordering') {
        return `[${language === 'de' ? 'Reihenfolge' : 'Ordering'}] ${anyQuestion.question || anyQuestion.items.join(' → ')}`
      }
      if (anyQuestion.type === 'matching') {
        return `[${language === 'de' ? 'Zuordnung' : 'Matching'}] ${anyQuestion.question || anyQuestion.pairs.map(p => `${p.left} → ${p.right}`).join(', ')}`
      }
      return anyQuestion.question || card.front.replace(/\n+/g, ' ')
    })()

    const optionEntries = anyQuestion.type === 'standard' ? Object.entries(anyQuestion.options) : []

    return { card, variant, frontPreview, optionEntries, parsedAnswer, securityVisual: getSecurityVisualForCard(card) }
  }), [cards, language])
  const graphicCount = useMemo(() => cardRows.filter(row => row.securityVisual !== null).length, [cardRows])
  const visibleCardRows = useMemo(
    () => onlyCardsWithVisual ? cardRows.filter(row => row.securityVisual !== null) : cardRows,
    [cardRows, onlyCardsWithVisual],
  )

  return (
    <Dialog
      title={t.deck_cards_title}
      subtitle={formatDeckName(deck.name)}
      closeLabel={language === 'de' ? 'Deckkarten schließen' : 'Close deck cards'}
      onClose={() => onClose()}
      dismissible={!editingCard && !showCreateCard}
      size="lg"
      className="overflow-hidden p-5 sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-ds-fg">
          <input
            type="checkbox"
            checked={onlyCardsWithVisual}
            onChange={event => setOnlyCardsWithVisual(event.target.checked)}
            className="h-4 w-4 accent-[--brand-primary]"
          />
          <span>{language === 'de' ? 'Nur Karten mit Grafik' : 'Cards with graphics only'} ({graphicCount})</span>
        </label>
        <button
          type="button"
          onClick={() => setShowCreateCard(true)}
          className="flex items-center gap-1.5 rounded-ds-lg border border-[--brand-primary-25] bg-[--brand-primary-08] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[--brand-primary] transition hover:bg-[--brand-primary-12]"
        >
          <Plus size={11} strokeWidth={2} /> {t.create_card}
        </button>
      </div>

        <div className="overflow-y-auto pr-1 max-h-[65vh]">
          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-ds-xl border border-[#18181b] bg-[#0c0c0c] animate-pulse" />)}</div>
          ) : error ? (
            <div className="rounded-ds-xl border border-rose-500/30 bg-rose-950/30 p-3 text-rose-300 text-sm">{error}</div>
          ) : cards.length === 0 ? (
            <div className="rounded-ds-xl border border-[#18181b] bg-[#0c0c0c] p-4 text-zinc-400 text-sm shadow-card">{t.no_cards_in_deck}</div>
          ) : visibleCardRows.length === 0 ? (
            <div className="rounded-ds-xl border border-[#18181b] bg-[#0c0c0c] p-4 text-zinc-400 text-sm shadow-card">
              {language === 'de' ? 'In diesem Deck gibt es noch keine Karten mit Grafik.' : 'No cards in this deck have graphics yet.'}
            </div>
          ) : (
            <div className="space-y-2">
              {visibleCardRows.map(({ card, variant, frontPreview, optionEntries, parsedAnswer, securityVisual }) => {
                const variantBadge = variant === 'ordering'
                  ? <span className="rounded-[3px] border border-violet-500/30 bg-violet-500/10 px-1.5 py-px font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-violet-400">{language === 'de' ? 'Reihenfolge' : 'Ordering'}</span>
                  : variant === 'matching'
                  ? <span className="rounded-[3px] border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-px font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-cyan-400">{language === 'de' ? 'Zuordnung' : 'Matching'}</span>
                  : null

                return (
                  <div key={card.id} data-managed-card-id={card.id} className="rounded-ds-xl border border-[#18181b] bg-[#0c0c0c] p-3 space-y-3 shadow-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-[10px] uppercase tracking-wide text-zinc-500 font-mono">{language === 'de' ? 'Frage' : 'Question'}</p>
                            {variantBadge}
                          </div>
                          <p className="text-sm text-zinc-50 font-medium whitespace-pre-wrap break-words">
                            {frontPreview}
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

                    <div className="rounded-ds-xl border border-[#18181b] bg-[#0a0a0a] p-2.5">
                      <p className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1 font-mono">{language === 'de' ? 'Antwort' : 'Answer'}</p>
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words">
                        {parsedAnswer.answer || card.back.replace(/\n+/g, ' ')}
                      </p>
                    </div>
                    {securityVisual && (
                      <div>
                        <button
                          type="button"
                          aria-expanded={openVisualCardId === card.id}
                          aria-controls={`deck-card-visual-${card.id}`}
                          onClick={() => setOpenVisualCardId(current => current === card.id ? null : card.id)}
                          className="flex w-full items-center justify-between gap-2 rounded-ds border border-ds-border bg-ds-floor px-3 py-2 text-left text-xs font-semibold text-ds-fg hover:border-[--brand-primary]"
                        >
                          <span>{language === 'de' ? 'Grafik ansehen' : 'View graphic'} · {securityVisual.title}</span>
                          <ChevronDown size={15} aria-hidden="true" className={`shrink-0 transition-transform ${openVisualCardId === card.id ? 'rotate-180' : ''}`} />
                        </button>
                        {openVisualCardId === card.id && (
                          <div id={`deck-card-visual-${card.id}`} className="mt-2 rounded-ds border border-ds-border bg-ds-panel p-3">
                            <SecurityVisualization visual={securityVisual} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

      <AnimatePresence>
        {editingCard && (
          <EditCardModal
            card={editingCard}
            onClose={() => setEditingCard(null)}
            onSaved={handleCardSaved}
            onDeleted={handleCardDeleted}
          />
        )}
        {showCreateCard && (
          <CreateCardModal
            defaultDeckId={deck.id}
            onClose={async () => { setShowCreateCard(false); await reload() }}
          />
        )}
      </AnimatePresence>
    </Dialog>
  )
}
