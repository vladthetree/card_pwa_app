import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'

interface InfoHintProps {
  label: string
  text: string
}

export function InfoHint({ label, text }: InfoHintProps) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const timer = window.setTimeout(() => {
      setIsOpen(false)
    }, 3000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [isOpen])

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-label={label}
        onClick={() => setIsOpen(prev => !prev)}
        onBlur={() => setIsOpen(false)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-[6px] border border-[#18181b] bg-[#0c0c0c] text-zinc-400 hover:text-zinc-50 hover:border-[#3f3f46] transition-all duration-200 ease-out active:scale-[0.98]"
      >
        <Info size={10} strokeWidth={1.5} />
      </button>
      <span
        className={`pointer-events-none absolute z-20 left-1/2 top-[calc(100%+8px)] -translate-x-1/2 min-w-56 max-w-72 rounded-[12px] border border-[#18181b] bg-[#0c0c0c] px-3 py-2 text-[11px] leading-relaxed text-zinc-300 shadow-menu transition-all duration-200 ease-out ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
      >
        {text}
      </span>
    </span>
  )
}
