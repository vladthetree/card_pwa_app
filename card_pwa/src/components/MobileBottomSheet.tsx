/**
 * AI_CONTEXT: Shared mobile bottom sheet used by compact navigation/action menus.
 */
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from '../ui/motion'

interface MobileBottomSheetProps {
  open: boolean
  ariaLabel: string
  onClose: () => void
  children: ReactNode
}

interface MobileBottomSheetItemProps {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  className?: string
}

const BACKDROP_CLASS = 'fixed inset-0 z-[190] bg-black/70 backdrop-blur-[2px]'
const PANEL_CLASS = 'home-bottom-sheet-panel fixed left-0 right-0 z-[200] border-4 border-black bg-[#FFFDF5] px-4 pt-3 shadow-[0_-8px_0_0_#000]'
const HANDLE_CLASS = 'mx-auto mb-4 h-2 w-14 rounded-full border-2 border-black bg-[#FFD93D]'
const ITEM_CLASS = 'mb-2 flex w-full items-center justify-between gap-3 border-2 border-black bg-white px-3 py-3.5 text-left text-[15px] font-bold text-black shadow-[3px_3px_0_0_#000] transition-all duration-100 hover:bg-[#FFD93D] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none'

export function MobileBottomSheet({ open, ariaLabel, onClose, children }: MobileBottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="sm:hidden">
          <motion.div
            className={BACKDROP_CLASS}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            className={PANEL_CLASS}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 60 || info.velocity.y > 200) onClose()
            }}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
          >
            <div className={HANDLE_CLASS} />
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function MobileBottomSheetLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-1 pb-2 pt-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-black">
      {children}
    </p>
  )
}

export function MobileBottomSheetDivider() {
  return <div className="my-3 border-t-4 border-black" />
}

export function MobileBottomSheetItem({
  children,
  onClick,
  disabled = false,
  className = '',
}: MobileBottomSheetItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${ITEM_CLASS} ${className}`.trim()}
    >
      {children}
    </button>
  )
}
