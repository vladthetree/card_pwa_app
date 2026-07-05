/**
 * AI_CONTEXT: Reusable React component for install Hint Modal; contributes to the card-learning UI and shared app interactions.
 */
import { useReducedMotion } from '../ui/motion'
import { ModalShell } from './ModalShell'

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
    <ModalShell
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      prefersReducedMotion={prefersReducedMotion}
      maxWidthClass="max-w-md"
    >
        <p className="text-sm text-zinc-300 leading-relaxed rounded-ds-xl border border-[#18181b] bg-[#0c0c0c] p-3 shadow-card">
          {hintText}
        </p>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-ds-xl text-xs border border-[#18181b] bg-[#0c0c0c] text-zinc-400 hover:text-zinc-50 hover:border-[#3f3f46] transition"
          >
            {closeLabel}
          </button>
        </div>
    </ModalShell>
  )
}
