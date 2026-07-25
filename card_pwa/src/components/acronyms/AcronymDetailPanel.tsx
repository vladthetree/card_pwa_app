/**
 * AI_CONTEXT:
 * Role: Dedicated full-screen "what is this acronym" screen — expansion plus a short explanation of what it actually is/does.
 * Used by: AcronymPracticeView, opened after answering a question.
 * Important: Pure display, no scheduling/progress side effects; definition text comes from acronymDefinitions.ts (hand-authored, not the licensed official crosswalk).
 */
import { createPortal } from 'react-dom'
import { ArrowLeft, Hash } from 'lucide-react'

const COPY = {
  de: {
    title: 'Was ist das?',
    explanation: 'Erklärung',
    back: 'Zurück zur Frage',
    missing: 'Noch keine Erklärung hinterlegt.',
  },
  en: {
    title: 'What is this?',
    explanation: 'Explanation',
    back: 'Back to question',
    missing: 'No explanation available yet.',
  },
} as const

interface Props {
  abbr: string
  meaning: string
  definition?: string
  language: 'de' | 'en'
  onClose: () => void
}

export default function AcronymDetailPanel({ abbr, meaning, definition, language, onClose }: Props) {
  const copy = COPY[language]

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-[#050505] pt-safe-2 pb-safe-4"
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-[#18181b] px-4 pb-3">
        <button
          type="button"
          onClick={onClose}
          className="ds-icon-button flex h-11 w-11 shrink-0"
          aria-label={copy.back}
          data-testid="acronym-detail-close"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-zinc-500">
          <Hash size={13} strokeWidth={1.5} className="text-[--brand-secondary]" />
          {copy.title}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5" data-study-scroll="allow" data-testid="acronym-detail-body">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
          <div>
            <p className="font-mono text-[34px] font-bold leading-tight text-white">{abbr}</p>
            <p className="mt-1 font-mono text-[15px] text-[--brand-secondary]">{meaning}</p>
          </div>

          <div className="rounded-ds-2xl border border-[#1f1f23] bg-[#0c0c0c] p-4">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">{copy.explanation}</p>
            <p className="font-mono text-[14px] leading-relaxed text-zinc-200">{definition ?? copy.missing}</p>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-[#18181b] px-4 pt-3">
        <button
          type="button"
          onClick={onClose}
          data-testid="acronym-detail-back"
          className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-ds-2xl border border-violet-500/60 bg-violet-500/10 px-4 font-mono text-[15px] text-zinc-100 transition-all duration-150 hover:bg-violet-500/20 active:scale-[0.99]"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          {copy.back}
        </button>
      </div>
    </div>,
    document.body,
  )
}
