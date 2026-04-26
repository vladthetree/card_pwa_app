import { motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { UI_TOKENS } from '../constants/ui'

interface Props {
  isOpen: boolean
  title: string
  subtitle: string
  hintText: string
  closeLabel: string
  onClose: () => void
}

export default function InstallHintModal({
  isOpen,
  title,
  subtitle,
  hintText,
  closeLabel,
  onClose,
}: Props) {
  const prefersReducedMotion = useReducedMotion()

  if (!isOpen) return null

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
        className={`${UI_TOKENS.modal.shell} max-w-md p-5 sm:p-6`}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className={UI_TOKENS.modal.title}>{title}</h3>
            <p className={UI_TOKENS.modal.subtitle}>{subtitle}</p>
          </div>
          <button onClick={onClose} className={UI_TOKENS.modal.closeButton}>
            <X size={16} />
          </button>
        </div>

        <p className="text-sm text-white/75 leading-relaxed rounded-xl border border-white/10 bg-black/30 p-3">
          {hintText}
        </p>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-lg text-xs border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition"
          >
            {closeLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
