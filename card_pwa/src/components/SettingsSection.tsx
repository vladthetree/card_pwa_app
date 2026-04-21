import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

interface SettingsSectionProps {
  title: string
  description: string
  icon: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}

export function SettingsSection({ title, description, icon, isOpen, onToggle, children }: SettingsSectionProps) {
  return (
    <div className={`rounded-xl overflow-hidden transition-all duration-300 ease-out ${isOpen ? 'border border-zinc-700 bg-[#0c0c0c]' : 'border border-zinc-900 bg-[#0c0c0c]'}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-4 py-4 text-left hover:bg-white/[0.04] transition-all duration-300 ease-out"
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className={`mt-0.5 transition-colors duration-300 ease-out ${isOpen ? 'text-white' : 'text-zinc-700'}`}>{icon}</div>
          <div className="min-w-0">
            <p className="text-sm font-black text-white">{title}</p>
            <p className="text-xs text-white/50 mt-1 leading-relaxed">{description}</p>
          </div>
        </div>
        <ChevronDown
          size={18}
          className={`shrink-0 transition-all duration-300 ease-out ${isOpen ? 'rotate-180 text-white' : 'text-zinc-700'}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-zinc-700 space-y-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
