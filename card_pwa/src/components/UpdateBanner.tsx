import { motion, useReducedMotion } from 'framer-motion'
import { RefreshCw, X } from 'lucide-react'
import { useSettings } from '../contexts/SettingsContext'

interface Props {
  onUpdateNow: () => void
  onDismiss: () => void
}

export default function UpdateBanner({ onUpdateNow, onDismiss }: Props) {
  const { settings } = useSettings()
  const isGerman = settings.language === 'de'
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      transition={{ duration: prefersReducedMotion ? 0.18 : 0.24, ease: 'easeOut' }}
      className="fixed bottom-safe-3 left-safe-4 right-safe-4 z-[60] mx-auto w-auto max-w-md rounded-2xl border border-white/15 bg-slate-900/92 px-4 py-3 shadow-xl backdrop-blur-md sm:left-auto sm:right-safe-4 sm:mx-0"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/92">
            {isGerman ? 'Neue Version bereit.' : 'New version ready.'}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-white/60">
            {isGerman ? 'Aktualisieren, sobald es für dich passt.' : 'Update whenever it suits you.'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onUpdateNow()
            }}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-black text-white transition-all duration-200 ease-out active:scale-95 sm:min-h-0 sm:px-3 sm:py-1.5"
            style={{ background: 'linear-gradient(135deg, var(--brand-primary-80), var(--brand-primary))' }}
          >
            <RefreshCw size={12} />
            {isGerman ? 'Aktualisieren' : 'Update'}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onDismiss()
            }}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full p-1.5 text-white/60 transition-all duration-200 ease-out hover:bg-white/10 hover:text-white active:scale-95 sm:h-9 sm:w-9"
            aria-label={isGerman ? 'Hinweis schließen' : 'Dismiss notice'}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
