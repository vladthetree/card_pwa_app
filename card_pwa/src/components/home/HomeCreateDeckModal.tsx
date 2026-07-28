/**
 * AI_CONTEXT: Home-screen React component for home Create Deck Modal; supports dashboard, deck browsing, tag browsing, export, or quick study workflows.
 */
import { UI_TOKENS } from '../../constants/ui'
import { Dialog } from '../../ui/overlays/Dialog'

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
  void prefersReducedMotion
  if (!isOpen) return null

  return (
    <Dialog
      title={t.create_deck}
      subtitle={t.create_deck_empty_hint}
      closeLabel={t.cancel}
      onClose={() => onClose()}
      size="md"
    >
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
          className={`${UI_TOKENS.input.base} w-full`}
        />

        {createDeckError && <p className="text-xs text-rose-300 mt-2">{createDeckError}</p>}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className={UI_TOKENS.button.footerSecondary}
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isCreatingDeck}
            className={`${UI_TOKENS.button.footerPrimary} disabled:opacity-60`}
          >
            {isCreatingDeck ? t.saving : t.create_deck}
          </button>
        </div>
    </Dialog>
  )
}
