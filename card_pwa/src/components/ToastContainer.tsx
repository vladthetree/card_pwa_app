import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, type LucideProps } from 'lucide-react'
import { useToastStore, toast, type ToastItem, type ToastVariant } from '../hooks/useToast'
import { UI_TOKENS } from '../constants/ui'

type LucideIcon = React.ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>>

const VARIANT_STYLES: Record<ToastVariant, { icon: LucideIcon; border: string; text: string }> = {
  success: { icon: CheckCircle,   border: 'border-emerald-500/35', text: 'text-emerald-300' },
  error:   { icon: AlertCircle,   border: 'border-rose-500/35',    text: 'text-rose-300'    },
  warning: { icon: AlertTriangle, border: 'border-amber-500/35',   text: 'text-amber-300'   },
  info:    { icon: Info,          border: 'border-white/15',       text: 'text-white/80'    },
}

function ToastCard({ item }: { item: ToastItem }) {
  const prefersReducedMotion = useReducedMotion()
  const cfg = VARIANT_STYLES[item.variant]
  const Icon = cfg.icon

  return (
    <motion.div
      layout
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: prefersReducedMotion ? 0.1 : 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={`flex items-start gap-3 w-full max-w-sm rounded-2xl border ${cfg.border} bg-slate-950/96 backdrop-blur-xl px-4 py-3 shadow-2xl shadow-black/50`}
      role="alert"
      aria-live="polite"
    >
      <Icon size={UI_TOKENS.icon.lg} className={`shrink-0 mt-px ${cfg.text}`} />
      <p className={`flex-1 text-sm leading-snug ${cfg.text}`}>{item.message}</p>
      <button
        onClick={() => toast.dismiss(item.id)}
        className={`shrink-0 self-center ${UI_TOKENS.modal.closeButton}`}
        aria-label="Dismiss"
      >
        <X size={UI_TOKENS.icon.sm} />
      </button>
    </motion.div>
  )
}

export default function ToastContainer() {
  const { subscribe } = useToastStore()
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => subscribe(setItems), [subscribe])

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-safe-4 left-1/2 -translate-x-1/2 z-[200] flex w-full flex-col items-center gap-2 px-safe-4 pointer-events-none"
    >
      <AnimatePresence mode="sync">
        {items.map(item => (
          <div key={item.id} className="pointer-events-auto w-full max-w-sm">
            <ToastCard item={item} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
