import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cloneElement, isValidElement } from 'react'

interface SettingsSectionProps {
  title: string
  description: string
  icon: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}

export function SettingsSection({ title, description, icon, isOpen, onToggle, children }: SettingsSectionProps) {
  const renderedIcon = isValidElement<{ strokeWidth?: number }>(icon)
    ? cloneElement(icon, { strokeWidth: 1.5 })
    : icon

  return (
    <div className={`overflow-hidden rounded-[14px] transition-all duration-150 ease-out ${
      isOpen
        ? 'border border-[#3f3f46] bg-[#0c0c0c] shadow-card'
        : 'border border-[#18181b] bg-[#080808]'
    }`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-4 py-4 text-left hover:bg-white/[0.025] transition-all duration-150 ease-out active:scale-[0.995]"
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className={`mt-0.5 transition-colors duration-150 ease-out ${isOpen ? 'text-zinc-100' : 'text-zinc-700'}`}>{renderedIcon}</div>
          <div className="min-w-0">
            <p className="text-sm font-black tracking-tight text-zinc-100">{title}</p>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{description}</p>
          </div>
        </div>
        <ChevronDown
          size={18}
          strokeWidth={1.5}
          className={`shrink-0 transition-all duration-150 ease-out ${isOpen ? 'rotate-180 text-zinc-100' : 'text-zinc-700'}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-zinc-800 space-y-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
