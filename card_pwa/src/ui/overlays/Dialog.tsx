/**
 * AI_CONTEXT:
 * Role: Accessible general-purpose dialog primitive for the overlay migration.
 */
import { useId, useRef, type ReactNode } from 'react'
import { motion, useReducedMotion } from '../motion'
import { UI_TOKENS } from '../../constants/ui'
import { OverlayHeader } from './OverlayHeader'
import { overlayTokens } from './overlayTokens'
import { useCloseGuard } from './useCloseGuard'
import { useOverlayFocusAndEscape } from './useOverlayFocusAndEscape'
import type { CloseReason, OverlaySize } from './overlayTypes'

interface DialogProps {
  title: ReactNode
  subtitle?: ReactNode
  closeLabel: string
  onClose: (reason: CloseReason) => void
  children: ReactNode
  size?: OverlaySize
  dismissible?: boolean
  className?: string
}

export function Dialog({
  title,
  subtitle,
  closeLabel,
  onClose,
  children,
  size = 'md',
  dismissible = true,
  className = 'p-5 sm:p-6',
}: DialogProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const requestClose = useCloseGuard({ dismissible, onClose })
  useOverlayFocusAndEscape(panelRef, requestClose)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={UI_TOKENS.modal.overlay}
      role="presentation"
    >
      <div className={UI_TOKENS.modal.backdrop} onClick={() => requestClose('backdrop')} />
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: prefersReducedMotion ? 0.12 : 0.2, ease: 'easeOut' }}
        className={`${UI_TOKENS.modal.shell} ${overlayTokens.size[size]} ${className}`}
      >
        <div className="mb-4">
          <OverlayHeader
            title={title}
            subtitle={subtitle}
            titleId={titleId}
            closeLabel={closeLabel}
            onClose={requestClose}
          />
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}

