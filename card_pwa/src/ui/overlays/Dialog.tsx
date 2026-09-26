/**
 * AI_CONTEXT:
 * Role: Accessible general-purpose dialog primitive for the overlay migration.
 */
import { useId, useRef, type ReactNode, type RefObject } from 'react'
import { motion, useReducedMotion } from '../motion'
import { UI_TOKENS } from '../../constants/ui'
import { OverlayHeader } from './OverlayHeader'
import { overlayTokens } from './overlayTokens'
import { useCloseGuard } from './useCloseGuard'
import { useOverlayFocusAndEscape } from './useOverlayFocusAndEscape'
import { OverlayPortal } from './OverlayPortal'
import type { CloseReason, OverlaySize } from './overlayTypes'

export interface DialogProps {
  title: ReactNode
  subtitle?: ReactNode
  closeLabel: string
  closeButtonTestId?: string
  onClose: (reason: CloseReason) => void
  children: ReactNode
  size?: OverlaySize
  dismissible?: boolean
  className?: string
  overlayClassName?: string
  initialFocusRef?: RefObject<HTMLElement | null>
  role?: 'dialog' | 'alertdialog'
}

export function Dialog({
  title,
  subtitle,
  closeLabel,
  closeButtonTestId,
  onClose,
  children,
  size = 'md',
  dismissible = true,
  className = 'p-5 sm:p-6',
  overlayClassName,
  initialFocusRef,
  role = 'dialog',
}: DialogProps) {
  const titleId = useId()
  const subtitleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const { requestClose, isTopmost } = useCloseGuard({ dismissible, onClose })
  useOverlayFocusAndEscape(panelRef, requestClose, { initialFocusRef, isTopmost })

  return (
    <OverlayPortal><motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={overlayClassName ?? UI_TOKENS.modal.overlay}
      role="presentation"
    >
      <div className={UI_TOKENS.modal.backdrop} onClick={() => requestClose('backdrop')} />
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
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
            subtitleId={subtitle ? subtitleId : undefined}
            closeLabel={closeLabel}
            closeButtonTestId={closeButtonTestId}
            onClose={requestClose}
          />
        </div>
        {children}
      </motion.div>
    </motion.div></OverlayPortal>
  )
}
