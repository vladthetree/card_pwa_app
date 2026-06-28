/**
 * AI_CONTEXT: Reusable React component for update Banner; contributes to the card-learning UI and shared app interactions.
 */
import { motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { useSettings } from '../contexts/SettingsContext'

interface Props {
  deferredReload?: boolean
}

export default function UpdateBanner({ deferredReload = false }: Props) {
  const { settings } = useSettings()
  const isGerman = settings.language === 'de'
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      transition={{ duration: prefersReducedMotion ? 0.18 : 0.24, ease: 'easeOut' }}
      className="fixed bottom-[88px] left-safe-4 right-safe-4 z-[110] mx-auto w-auto max-w-md rounded-[14px] border border-[#18181b] bg-[#0c0c0c]/95 px-4 py-3 shadow-menu backdrop-blur-md sm:bottom-3 sm:left-auto sm:right-safe-4 sm:mx-0"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-300" strokeWidth={1.8} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/92">
            {isGerman ? 'Update installiert.' : 'Update installed.'}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-white/60">
            {deferredReload
              ? (isGerman ? 'Wird nach der Lernsession automatisch übernommen.' : 'It will apply automatically after this study session.')
              : (isGerman ? 'Die App übernimmt es automatisch.' : 'The app will apply it automatically.')}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
