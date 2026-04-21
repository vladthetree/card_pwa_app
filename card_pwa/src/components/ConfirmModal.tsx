import { useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import { STRINGS, useSettings } from '../contexts/SettingsContext'
import { UI_TOKENS } from '../constants/ui'

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
  const prefersReducedMotion = useReducedMotion()
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onCancel])

  const confirmClass = variant === 'danger'
    ? 'flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-all duration-200 active:scale-[0.98]'
    : 'flex-1 py-2.5 rounded-2xl bg-white text-black hover:bg-white/90 font-semibold transition-all duration-200 active:scale-[0.98]'

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={UI_TOKENS.modal.overlay}
          style={{
            paddingTop: 'calc(var(--safe-top) + 1rem)',
            paddingBottom: 'calc(var(--safe-bottom) + 1rem)',
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <div className={UI_TOKENS.modal.backdrop} onClick={onCancel} />
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: prefersReducedMotion ? 0.12 : 0.18, ease: 'easeOut' }}
            className={`${UI_TOKENS.modal.shell} max-w-sm p-6`}
          >
            <button
              onClick={onCancel}
              className={`absolute top-4 right-4 ${UI_TOKENS.modal.closeButton}`}
              aria-label={t.cancel}
            >
              <X size={15} />
            </button>

            <div className="flex items-start gap-3 mb-4">
              {variant === 'danger' && (
                <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-rose-500/15 text-rose-400">
                  <AlertTriangle size={18} />
                </div>
              )}
              <div className="min-w-0">
                <h3 id="confirm-modal-title" className="text-white font-bold text-base leading-tight">
                  {title}
                </h3>
                <p className="text-white/55 text-sm mt-1.5 leading-relaxed">{message}</p>
              </div>
            </div>

            <div className="flex gap-2.5 mt-5">
              <button
                ref={cancelRef}
                onClick={onCancel}
                className={UI_TOKENS.button.footerSecondary}
              >
                {cancelLabel ?? t.cancel}
              </button>
              <button
                onClick={onConfirm}
                className={confirmClass}
              >
                {confirmLabel ?? t.confirm}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
