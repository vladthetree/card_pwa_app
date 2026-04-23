import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Layers3, Save, X } from 'lucide-react'
import { UI_TOKENS } from '../../constants/ui'
import type { Deck, ShuffleCollection } from '../../types'
import { createShuffleCollection, fetchDeckCards, updateShuffleCollection } from '../../db/queries'
import { buildSelectedShuffleCards } from '../../services/ShuffleSessionManager'

interface Props {
  isOpen: boolean
  language: 'de' | 'en'
  prefersReducedMotion: boolean | null
  decks: Deck[]
  syncedDeckIds: string[]
  studyCardLimit: number
  nextDayStartsAt: number
  linkedUserId?: string
  collection: ShuffleCollection | null
  onClose: () => void
  onSaved: () => void
}

export function HomeShuffleCollectionModal({
  isOpen,
  language,
  prefersReducedMotion,
  decks,
  syncedDeckIds,
  studyCardLimit,
  nextDayStartsAt,
  linkedUserId,
  collection,
  onClose,
  onSaved,
}: Props) {
  const [name, setName] = useState('')
  const [selectedDeckIds, setSelectedDeckIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedCardCount, setSelectedCardCount] = useState(0)
  const [selectedTodayCount, setSelectedTodayCount] = useState(0)

  const isEditing = Boolean(collection)
  const syncedDeckIdSet = useMemo(() => new Set(syncedDeckIds), [syncedDeckIds])
  const title = language === 'de'
    ? (isEditing ? 'Shuffle-Sammlung bearbeiten' : 'Shuffle-Sammlung erstellen')
    : (isEditing ? 'Edit shuffle collection' : 'Create shuffle collection')
  const subtitle = language === 'de'
    ? 'Wähle mehrere Decks aus. Bewertungen bleiben im Originaldeck.'
    : 'Select multiple decks. Reviews stay attached to the source deck.'
  const saveLabel = language === 'de'
    ? (isEditing ? 'Speichern' : 'Erstellen')
    : (isEditing ? 'Save' : 'Create')
  const syncedLabel = language === 'de' ? 'Wird einbezogen' : 'Included'
  const skippedLabel = language === 'de' ? 'Außerhalb Sync-Scope' : 'Out of sync scope'
  const totalCardsLabel = language === 'de' ? 'Karten gesamt' : 'Total cards'
  const todayCardsLabel = language === 'de' ? 'Heute im Shuffle' : 'In shuffle today'
  const emptyNameError = language === 'de'
    ? 'Bitte gib der Shuffle-Sammlung einen Namen.'
    : 'Please provide a name for the shuffle collection.'
  const emptyDeckError = language === 'de'
    ? 'Wähle mindestens ein Deck aus.'
    : 'Select at least one deck.'

  useEffect(() => {
    if (!isOpen) return
    setName(collection?.name ?? '')
    setSelectedDeckIds(collection?.deckIds ?? [])
    setError(null)
  }, [collection, isOpen])

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false

    void (async () => {
      if (selectedDeckIds.length === 0) {
        if (!cancelled) {
          setSelectedCardCount(0)
          setSelectedTodayCount(0)
        }
        return
      }

      const cardSets = await Promise.all(selectedDeckIds.map(deckId => fetchDeckCards(deckId)))
      const uniqueCardIds = new Set(cardSets.flat().map(card => card.id))
      const selectedToday = await buildSelectedShuffleCards(
        { deckIds: selectedDeckIds },
        {
          userId: linkedUserId,
          maxCards: studyCardLimit,
          nextDayStartsAt,
        },
      )

      if (!cancelled) {
        setSelectedCardCount(uniqueCardIds.size)
        setSelectedTodayCount(selectedToday.length)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isOpen, linkedUserId, nextDayStartsAt, selectedDeckIds, studyCardLimit])

  const toggleDeck = (deckId: string) => {
    setSelectedDeckIds(current => (
      current.includes(deckId)
        ? current.filter(id => id !== deckId)
        : [...current, deckId]
    ))
  }

  const handleSubmit = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError(emptyNameError)
      return
    }
    if (selectedDeckIds.length === 0) {
      setError(emptyDeckError)
      return
    }

    setError(null)
    setIsSaving(true)
    const result = collection
      ? await updateShuffleCollection(collection.id, { name: trimmed, deckIds: selectedDeckIds })
      : await createShuffleCollection(trimmed, selectedDeckIds)
    setIsSaving(false)

    if (!result.ok) {
      setError(result.error ?? (language === 'de' ? 'Speichern fehlgeschlagen.' : 'Saving failed.'))
      return
    }

    onSaved()
    onClose()
  }

  if (!isOpen) return null

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
      <div className={UI_TOKENS.modal.backdrop} onClick={onClose} />
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: prefersReducedMotion ? 0.12 : 0.2, ease: 'easeOut' }}
        className={`${UI_TOKENS.modal.shell} max-w-2xl`}
      >
        <div className={UI_TOKENS.modal.header}>
          <div>
            <h3 className={UI_TOKENS.modal.title}>{title}</h3>
            <p className={UI_TOKENS.modal.subtitle}>{subtitle}</p>
          </div>
          <button onClick={onClose} className={UI_TOKENS.modal.closeButton}>
            <X size={16} />
          </button>
        </div>

        <div className={UI_TOKENS.modal.body}>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-white/50">
            {language === 'de' ? 'Name' : 'Name'}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={language === 'de' ? 'z. B. Sprachen gemischt' : 'e.g. Mixed languages'}
            className={UI_TOKENS.input.base}
          />

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">{language === 'de' ? 'Decks' : 'Decks'}</div>
              <div className="mt-1 text-lg font-semibold text-white">{selectedDeckIds.length}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">{totalCardsLabel}</div>
              <div className="mt-1 text-lg font-semibold text-white">{selectedCardCount}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">{todayCardsLabel}</div>
              <div className="mt-1 text-lg font-semibold text-amber-100">{selectedTodayCount}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">{language === 'de' ? 'In Scope' : 'In scope'}</div>
              <div className="mt-1 text-lg font-semibold text-emerald-100">
                {selectedDeckIds.filter(id => syncedDeckIdSet.has(id)).length}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-white/45">
              <Layers3 size={14} />
              <span>{language === 'de' ? 'Deck-Auswahl' : 'Deck selection'}</span>
            </div>
            <div
              className="grid max-h-[min(46dvh,20rem)] gap-2 overflow-y-auto pr-1 sm:max-h-[24rem]"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {decks.map(deck => {
                const selected = selectedDeckIds.includes(deck.id)
                const isSynced = syncedDeckIdSet.has(deck.id)

                return (
                  <button
                    key={deck.id}
                    type="button"
                    onClick={() => toggleDeck(deck.id)}
                    className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                      selected
                        ? 'border-amber-300/30 bg-amber-400/10'
                        : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-black/30'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">{deck.name}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-white/45">
                        <span>{deck.total} {language === 'de' ? 'Karten' : 'cards'}</span>
                        <span className={`rounded-full border px-2 py-0.5 ${
                          isSynced
                            ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100/80'
                            : 'border-rose-300/20 bg-rose-400/10 text-rose-100/80'
                        }`}>
                          {isSynced ? syncedLabel : skippedLabel}
                        </span>
                      </div>
                    </div>
                    <span className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
                      selected
                        ? 'border-amber-300/35 bg-amber-300/15 text-amber-50'
                        : 'border-white/10 text-white/30'
                    }`}>
                      {selected ? <Check size={15} /> : null}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}
        </div>

        <div className={UI_TOKENS.modal.footer}>
          <button type="button" onClick={onClose} className={UI_TOKENS.button.footerSecondary}>
            {language === 'de' ? 'Abbrechen' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => { void handleSubmit() }}
            disabled={isSaving}
            className={UI_TOKENS.button.footerPrimary}
          >
            <span className="inline-flex items-center gap-2">
              <Save size={15} />
              {isSaving ? (language === 'de' ? 'Speichere…' : 'Saving…') : saveLabel}
            </span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
