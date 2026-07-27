/**
 * AI_CONTEXT: Reusable React component for confirm Modal; contributes to the card-learning UI and shared app interactions.
 */
import { AnimatePresence } from '../ui/motion'
import { STRINGS, useSettings } from '../contexts/SettingsContext'
import { AlertDialog } from '../ui/overlays/AlertDialog'

interface Props {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'default',
  onConfirm,
  onCancel,
}: Props) {
  const { settings } = useSettings()
  const t = STRINGS[settings.language]

  return (
    <AnimatePresence>
      {isOpen && (
        <AlertDialog
          title={title}
          message={message}
          confirmLabel={confirmLabel ?? t.confirm}
          cancelLabel={cancelLabel ?? t.cancel}
          closeLabel={t.cancel}
          variant={variant}
          onConfirm={onConfirm}
          onClose={onCancel}
        />
      )}
    </AnimatePresence>
  )
}
