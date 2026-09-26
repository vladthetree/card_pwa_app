/**
 * AI_CONTEXT:
 * Role: Lightweight sheet primitive for future mobile/side-panel migrations.
 */
import type { ReactNode } from 'react'
import { Dialog } from './Dialog'
import { overlayTokens } from './overlayTokens'
import type { CloseReason, SheetPlacement } from './overlayTypes'

interface SheetProps {
  title: ReactNode
  closeLabel: string
  placement?: SheetPlacement
  onClose: (reason: CloseReason) => void
  children: ReactNode
  dismissible?: boolean
}

export function Sheet({ title, closeLabel, placement = 'bottom', onClose, children, dismissible = true }: SheetProps) {
  const shellClass = placement === 'bottom'
    ? 'max-h-[min(90dvh,48rem)] rounded-b-none p-5 sm:max-w-2xl sm:rounded-b-[2rem]'
    : 'h-[100dvh] max-h-none max-w-md rounded-none p-5'

  return (
    <Dialog
      title={title}
      closeLabel={closeLabel}
      onClose={onClose}
      dismissible={dismissible}
      size={placement === 'bottom' ? 'lg' : 'md'}
      className={shellClass}
      overlayClassName={`fixed inset-0 ${overlayTokens.zIndex.overlay} flex bg-transparent px-safe ${overlayTokens.sheetPlacement[placement]}`}
    >
      {children}
    </Dialog>
  )
}
