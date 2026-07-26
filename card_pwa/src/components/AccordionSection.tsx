/**
 * AI_CONTEXT: Shared collapsible section wrapper (icon + title/description header,
 * animated content) used by SettingsModal's SettingsSection and FaqModal's
 * FaqSection. `variant` preserves each caller's pre-existing look 1:1 —
 * this only removes the duplicated structural JSX, not the visual differences.
 */
import { motion, AnimatePresence } from '../ui/motion'
import { ChevronDown } from 'lucide-react'
import { cloneElement, isValidElement, type ReactNode } from 'react'

export type AccordionVariant = 'settings' | 'faq'

interface AccordionSectionProps {
  variant: AccordionVariant
  title: string
  description: string
  icon: ReactNode
  isOpen: boolean
  onToggle: () => void
  children: ReactNode
}

const VARIANT_STYLES: Record<AccordionVariant, {
  radius: string
  durationClass: string
  transitionSeconds: number
  closedContainer: string
  hoverClass: string
  activeClass: string
  iconActiveColor: string
  titleClass: string
  descriptionClass: string
  contentBorderClass: string
  contentSpacingClass: string
  overrideIconStroke: boolean
}> = {
  settings: {
    radius: 'rounded-ds-2xl',
    durationClass: 'duration-150',
    transitionSeconds: 0.16,
    closedContainer: 'border border-[#18181b] bg-[#080808]',
    hoverClass: 'hover:bg-white/[0.025]',
    activeClass: 'active:scale-[0.995]',
    iconActiveColor: 'text-zinc-100',
    titleClass: 'tracking-tight text-zinc-100',
    descriptionClass: 'text-zinc-500',
    contentBorderClass: 'border-zinc-800',
    contentSpacingClass: 'space-y-5',
    overrideIconStroke: true,
  },
  faq: {
    radius: 'rounded-ds-xl',
    durationClass: 'duration-300',
    transitionSeconds: 0.3,
    closedContainer: 'border border-[#18181b] bg-[#0c0c0c]',
    hoverClass: 'hover:bg-[#111]',
    activeClass: '',
    iconActiveColor: 'text-white',
    titleClass: 'text-white',
    descriptionClass: 'text-white/50',
    contentBorderClass: 'border-[#18181b]',
    contentSpacingClass: 'space-y-4',
    overrideIconStroke: false,
  },
}

/** Beide offenen Zustände teilen sich Rahmen/Hintergrund/Schatten. */
const OPEN_CONTAINER = 'border border-[#3f3f46] bg-[#0c0c0c] shadow-card'

export function AccordionSection({ variant, title, description, icon, isOpen, onToggle, children }: AccordionSectionProps) {
  const style = VARIANT_STYLES[variant]
  const renderedIcon = style.overrideIconStroke && isValidElement<{ strokeWidth?: number }>(icon)
    ? cloneElement(icon, { strokeWidth: 1.5 })
    : icon

  return (
    <div className={`overflow-hidden ${style.radius} transition-all ${style.durationClass} ease-out ${
      isOpen ? OPEN_CONTAINER : style.closedContainer
    }`}>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between gap-4 px-4 py-4 text-left ${style.hoverClass} transition-all ${style.durationClass} ease-out ${style.activeClass}`}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className={`mt-0.5 transition-colors ${style.durationClass} ease-out ${isOpen ? style.iconActiveColor : 'text-zinc-700'}`}>
            {renderedIcon}
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-black ${style.titleClass}`}>{title}</p>
            <p className={`text-xs ${style.descriptionClass} mt-1 leading-relaxed`}>{description}</p>
          </div>
        </div>
        <ChevronDown
          size={18}
          strokeWidth={1.5}
          className={`shrink-0 transition-all ${style.durationClass} ease-out ${isOpen ? `rotate-180 ${style.iconActiveColor}` : 'text-zinc-700'}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: style.transitionSeconds, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className={`px-4 pb-4 border-t ${style.contentBorderClass} ${style.contentSpacingClass}`}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
