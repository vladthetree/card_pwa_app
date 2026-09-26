/**
 * AI_CONTEXT:
 * Role: Fullscreen overlay primitive for later learning/video panel migration.
 */
import type { ReactNode } from 'react'
import { Dialog } from './Dialog'
import { overlayTokens } from './overlayTokens'
import type { CloseReason } from './overlayTypes'

interface FullscreenPanelProps {
  title: ReactNode
  closeLabel: string
  onClose: (reason: CloseReason) => void
  children: ReactNode
  dismissible?: boolean
}

export function FullscreenPanel({ title, closeLabel, onClose, children, dismissible = true }: FullscreenPanelProps) {
  return (
    <Dialog
      title={title}
      closeLabel={closeLabel}
      onClose={onClose}
      dismissible={dismissible}
      size="fullscreen"
      className="h-[100dvh] max-h-none rounded-none px-safe pb-safe-4 pt-safe-4 sm:rounded-none"
      overlayClassName={`fixed inset-0 ${overlayTokens.zIndex.overlay} flex`}
    >
      {children}
    </Dialog>
  )
}
