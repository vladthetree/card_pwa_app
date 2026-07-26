/**
 * AI_CONTEXT: Recall-check/transcript/confidence bar shown under the active video —
 * collapsed (toggle strip) or expanded (recall+transcript buttons, confidence chips,
 * calibration hint against the real deck success rate).
 * Used by: VideosView.
 */
import { Brain, ChevronDown, ChevronUp, FileText } from 'lucide-react'
import type { VideoConfidence } from '../../hooks/useMesserVideoProgress'
import type { Copy } from './videosCopy'

const CONFIDENCE_CHIPS: Array<{ level: VideoConfidence; labelKey: 'gapsFull' | 'okFull' | 'solidFull'; activeCls: string }> = [
  { level: 'gaps', labelKey: 'gapsFull', activeCls: 'border-amber-400/70 bg-amber-500/20 text-amber-100' },
  { level: 'ok', labelKey: 'okFull', activeCls: 'border-[--brand-secondary-80] bg-[--brand-secondary-20] text-ds-fg' },
  { level: 'solid', labelKey: 'solidFull', activeCls: 'border-emerald-400/70 bg-emerald-500/20 text-emerald-100' },
]

export function VideoStudyBar({
  confidence,
  deckStats,
  onStartRecall,
  onOpenTranscript,
  onSetConfidence,
  copy,
  compact = false,
  open,
  onToggle,
}: {
  confidence: VideoConfidence | null
  /** Tatsächliche Erfolgsquote des Objective-Decks (Kalibrierungs-Anker). */
  deckStats?: { rate: number; total: number } | null
  onStartRecall: () => void
  onOpenTranscript: () => void
  onSetConfidence: (next: VideoConfidence | null) => void
  copy: Copy
  compact?: boolean
  open: boolean
  onToggle: () => void
}) {
  // Eingeklappt: schlanke Leiste zum Ausklappen → mehr Platz fürs Video.
  if (!open) {
    return (
      <div className="mt-2 flex w-full max-w-3xl items-stretch gap-2">
        <button
          type="button"
          onClick={onToggle}
          data-testid="video-studybar-toggle"
          aria-expanded={false}
          className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-ds-lg border border-[#18181b] bg-[#080808] font-mono font-bold text-zinc-400 transition-colors hover:border-[--brand-secondary-50] hover:text-[--brand-secondary] ${
            compact ? 'py-1.5 text-[11px]' : 'py-2 text-[12px]'
          }`}
        >
          <Brain size={14} strokeWidth={1.5} />
          {copy.recall}
          <ChevronDown size={13} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={onOpenTranscript}
          data-testid="video-transcript-open"
          title={copy.transcript}
          aria-label={copy.transcript}
          className={`flex shrink-0 items-center justify-center gap-2 rounded-ds-lg border border-[#1f1f23] bg-[#0c0c0c] font-mono font-bold text-zinc-300 transition-colors hover:border-[--brand-secondary-50] hover:text-[--brand-secondary] ${
            compact ? 'h-8 w-10 text-[11px]' : 'px-4 text-[12px]'
          }`}
        >
          <FileText size={14} strokeWidth={1.5} />
          {!compact && copy.transcript}
        </button>
      </div>
    )
  }

  const chips = (
    <div className="flex gap-1.5">
      {CONFIDENCE_CHIPS.map(chip => {
        const active = confidence === chip.level
        return (
          <button
            key={chip.level}
            type="button"
            onClick={() => onSetConfidence(active ? null : chip.level)}
            data-testid={`video-confidence-${chip.level}`}
            aria-pressed={active}
            className={`rounded-ds border font-mono font-bold transition-colors ${compact ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1 text-[11px]'} ${
              active ? chip.activeCls : 'border-[#1f1f23] bg-[#0c0c0c] text-zinc-400 hover:border-[#3f3f46]'
            }`}
          >
            {copy[chip.labelKey]}
          </button>
        )
      })}
    </div>
  )

  const collapseBtn = (
    <button
      type="button"
      onClick={onToggle}
      data-testid="video-studybar-toggle"
      aria-expanded={true}
      aria-label={copy.collapseRecall}
      title={copy.collapseRecall}
      className="ds-icon-button flex h-7 w-7 shrink-0"
    >
      <ChevronUp size={14} strokeWidth={1.5} />
    </button>
  )

  // Kompakt (Handy): eine Zeile + Einklapp-Pfeil.
  if (compact) {
    return (
      <div className="mt-2 flex w-full max-w-3xl items-center gap-2">
        <button
          type="button"
          onClick={onStartRecall}
          data-testid="video-recall-start"
          className="flex shrink-0 items-center gap-1.5 rounded-ds-lg border border-[--brand-secondary-50] bg-[--brand-secondary-12] px-3 py-1.5 font-mono text-[12px] font-bold text-[--brand-secondary] transition-colors hover:border-[--brand-secondary-80]"
        >
          <Brain size={14} strokeWidth={1.5} />
          {copy.recall}
        </button>
        <button
          type="button"
          onClick={onOpenTranscript}
          data-testid="video-transcript-open"
          title={copy.transcript}
          aria-label={copy.transcript}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-ds-lg border border-[#1f1f23] bg-[#0c0c0c] text-zinc-400 transition-colors hover:border-[--brand-secondary-50] hover:text-[--brand-secondary]"
        >
          <FileText size={14} strokeWidth={1.5} />
        </button>
        <div className="flex flex-1 justify-end">{chips}</div>
        {collapseBtn}
      </div>
    )
  }

  return (
    <div className="mt-3 w-full max-w-3xl rounded-ds-2xl border border-[#18181b] bg-[#080808] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">{copy.recall}</span>
        {collapseBtn}
      </div>
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={onStartRecall}
          data-testid="video-recall-start"
          className="flex flex-1 items-center justify-center gap-2 rounded-ds-xl border border-[--brand-secondary-50] bg-[--brand-secondary-12] py-3 font-mono text-[13px] font-bold text-[--brand-secondary] transition-colors hover:border-[--brand-secondary-80]"
        >
          <Brain size={16} strokeWidth={1.5} />
          {copy.recall}
        </button>
        <button
          type="button"
          onClick={onOpenTranscript}
          data-testid="video-transcript-open"
          className="flex shrink-0 items-center justify-center gap-2 rounded-ds-xl border border-[#1f1f23] bg-[#0c0c0c] px-4 font-mono text-[12px] font-bold text-zinc-300 transition-colors hover:border-[--brand-secondary-50] hover:text-[--brand-secondary]"
        >
          <FileText size={14} strokeWidth={1.5} />
          {copy.transcript}
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">{copy.confidenceLabel}</span>
        {chips}
      </div>

      {/* Metakognitive Kalibrierung: Einschätzung neben der echten Deck-Quote.
          Erst ab ~10 Reviews — davor ist die Quote kein belastbarer Anker. */}
      {deckStats && deckStats.total >= 10 && (() => {
        const overconfident =
          (confidence === 'solid' && deckStats.rate < 75) ||
          (confidence === 'ok' && deckStats.rate < 55)
        return (
          <p
            data-testid="video-calibration"
            className={`mt-2 font-mono text-[10px] leading-relaxed ${overconfident ? 'text-amber-300/90' : 'text-zinc-500'}`}
          >
            {copy.deckRate.replace('{rate}', String(deckStats.rate)).replace('{total}', String(deckStats.total))}
            {overconfident ? ` — ${copy.calibrationWarning}` : ''}
          </p>
        )
      })()}

      <p className="mt-2 font-mono text-[10px] leading-relaxed text-zinc-600">{copy.confidenceHint}</p>
    </div>
  )
}
