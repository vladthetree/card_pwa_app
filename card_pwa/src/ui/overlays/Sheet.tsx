/**
 * AI_CONTEXT:
 * Role: Lightweight sheet primitive for future mobile/side-panel migrations.
 */
import type { ReactNode } from 'react'
import { Dialog } from './Dialog'
import type { CloseReason, SheetPlacement } from './overlayTypes'

interface SheetProps {
  title: ReactNode
  closeLabel: string
  placement?: SheetPlacement
  onClose: (reason: CloseReason) => void
  children: ReactNode
}

export function Sheet({ title, closeLabel, onClose, children }: SheetProps) {
  return (
    <Dialog title={title} closeLabel={closeLabel} onClose={onClose} size="md" className="p-5">
      {children}
    </Dialog>
  )
}

