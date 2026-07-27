/**
 * AI_CONTEXT:
 * Role: Shared title/subtitle/close-button header for new overlay primitives.
 */
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { UI_TOKENS } from '../../constants/ui'
import type { CloseReason } from './overlayTypes'

interface Props {
  title: ReactNode
  subtitle?: ReactNode
  titleId: string
  closeLabel: string
  onClose: (reason: CloseReason) => void
}

export function OverlayHeader({ title, subtitle, titleId, closeLabel, onClose }: Props) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 id={titleId} className={UI_TOKENS.modal.title}>{title}</h3>
        {subtitle && <p className={UI_TOKENS.modal.subtitle}>{subtitle}</p>}
      </div>
      <button
        type="button"
        onClick={() => onClose('close-button')}
        className={UI_TOKENS.modal.closeButton}
        aria-label={closeLabel}
      >
        <X size={16} strokeWidth={1.5} />
      </button>
    </div>
  )
}

