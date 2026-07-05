/**
 * AI_CONTEXT: Shared modal shell for compact app dialogs; centralizes backdrop, motion, header, and close affordance.
 */
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { motion } from '../ui/motion'
import { UI_TOKENS } from '../constants/ui'

interface ModalShellProps {
  title: ReactNode
  subtitle?: ReactNode
  onClose: () => void
  prefersReducedMotion?: boolean | null
  maxWidthClass?: string
  shellClassName?: string
  headerClassName?: string
  children: ReactNode
}

export function ModalShell({
  title,
  subtitle,
  onClose,
  prefersReducedMotion = false,
  maxWidthClass = 'max-w-md',
  shellClassName = 'p-5 sm:p-6',
  headerClassName = 'mb-4',
  children,
}: ModalShellProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={UI_TOKENS.modal.overlay}
    >
      <div className={UI_TOKENS.modal.backdrop} onClick={onClose} />
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: prefersReducedMotion ? 0.12 : 0.2, ease: 'easeOut' }}
        className={`${UI_TOKENS.modal.shell} ${maxWidthClass} ${shellClassName}`}
      >
        <div className={`flex items-start justify-between gap-3 ${headerClassName}`}>
          <div className="min-w-0">
            <h3 className={UI_TOKENS.modal.title}>{title}</h3>
            {subtitle && <p className={UI_TOKENS.modal.subtitle}>{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className={UI_TOKENS.modal.closeButton}>
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}
