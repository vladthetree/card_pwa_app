/**
 * AI_CONTEXT:
 * Role: Confirm/destructive dialog primitive with explicit CloseReason output.
 */
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { motion, useReducedMotion } from '../motion'
import { UI_TOKENS } from '../../constants/ui'
import { useCloseGuard } from './useCloseGuard'
import type { CloseReason } from './overlayTypes'

interface AlertDialogProps {
  title: ReactNode
  message: ReactNode
  confirmLabel: string
  cancelLabel: string
  closeLabel: string
  variant?: 'danger' | 'default'
  onConfirm: () => void
  onClose: (reason: CloseReason) => void
  dismissible?: boolean
}

export function AlertDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  closeLabel,
  variant = 'default',
  onConfirm,
  onClose,
  dismissible = true,
}: AlertDialogProps) {
  const titleId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const requestClose = useCloseGuard({ dismissible, onClose })

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    cancelRef.current?.focus()
    return () => previous?.focus()
  }, [])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose('escape')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [requestClose])

  const confirmClass = variant === 'danger'
    ? 'flex-1 py-2.5 rounded-ds-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-all duration-200 active:scale-[0.98]'
    : 'flex-1 py-2.5 rounded-ds-xl bg-white text-black hover:bg-white/90 font-semibold transition-all duration-200 active:scale-[0.98]'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className={UI_TOKENS.modal.overlay}
      role="presentation"
    >
      <div className={UI_TOKENS.modal.backdrop} onClick={() => requestClose('backdrop')} />
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
        transition={{ duration: prefersReducedMotion ? 0.12 : 0.18, ease: 'easeOut' }}
        className={`${UI_TOKENS.modal.shell} max-w-sm p-6`}
      >
        <button
          type="button"
          onClick={() => requestClose('close-button')}
          className={`absolute top-4 right-4 ${UI_TOKENS.modal.closeButton}`}
          aria-label={closeLabel}
        >
          <X size={15} strokeWidth={1.5} />
        </button>

        <div className="mb-4 flex items-start gap-3">
          {variant === 'danger' && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ds-xl bg-rose-500/15 text-rose-400">
              <AlertTriangle size={18} strokeWidth={1.5} />
            </div>
          )}
          <div className="min-w-0">
            <h3 id={titleId} className="text-base font-bold leading-tight text-white">
              {title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-white/55">{message}</p>
          </div>
        </div>

        <div className="mt-5 flex gap-2.5">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => requestClose('cancel')}
            className={UI_TOKENS.button.footerSecondary}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm()
              onClose('submit')
            }}
            className={confirmClass}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

