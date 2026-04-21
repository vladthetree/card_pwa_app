import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { UI_TOKENS } from '../../constants/ui'

interface Props {
  isOpen: boolean
  t: Record<string, string>
  prefersReducedMotion: boolean | null
  newDeckName: string
  createDeckError: string | null
  isCreatingDeck: boolean
  onClose: () => void
  onNewDeckNameChange: (value: string) => void
  onSubmit: () => void
}

export function HomeCreateDeckModal({
  isOpen,
  t,
  prefersReducedMotion,
  newDeckName,
  createDeckError,
  isCreatingDeck,
  onClose,
  onNewDeckNameChange,
  onSubmit,
}: Props) {
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
        className={`${UI_TOKENS.modal.shell} max-w-md p-5 sm:p-6`}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className={UI_TOKENS.modal.title}>{t.create_deck}</h3>
            <p className={UI_TOKENS.modal.subtitle}>{t.create_deck_empty_hint}</p>
          </div>
          <button
            onClick={onClose}
            className={UI_TOKENS.modal.closeButton}
          >
            <X size={16} />
          </button>
        </div>

        <label className="block text-xs text-white/50 font-medium mb-2 uppercase tracking-wide">
          {t.deck}
        </label>
        <input
          type="text"
          value={newDeckName}
          onChange={(e) => onNewDeckNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onSubmit()
            }
          }}
          placeholder={t.new_deck_placeholder}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-white/30"
        />

        {createDeckError && <p className="text-xs text-rose-300 mt-2">{createDeckError}</p>}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-lg text-xs border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isCreatingDeck}
            className="px-3 py-2 rounded-lg text-xs border border-white/20 bg-white text-black hover:bg-white/90 transition disabled:opacity-60"
          >
            {isCreatingDeck ? t.saving : t.create_deck}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
