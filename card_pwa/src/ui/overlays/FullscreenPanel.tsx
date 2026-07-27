/**
 * AI_CONTEXT:
 * Role: Fullscreen overlay primitive for later learning/video panel migration.
 */
import type { ReactNode } from 'react'
import { Dialog } from './Dialog'
import type { CloseReason } from './overlayTypes'

interface FullscreenPanelProps {
  title: ReactNode
  closeLabel: string
  onClose: (reason: CloseReason) => void
  children: ReactNode
}

export function FullscreenPanel({ title, closeLabel, onClose, children }: FullscreenPanelProps) {
  return (
    <Dialog title={title} closeLabel={closeLabel} onClose={onClose} size="fullscreen" className="h-[100dvh] p-5">
      {children}
    </Dialog>
  )
}

