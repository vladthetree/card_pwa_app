/**
 * AI_CONTEXT: Reusable React component for free Recall Card; contributes to the card-learning UI and shared app interactions.
 */
import { memo, useCallback, useMemo, useState } from 'react'
import { Check, Edit, X } from 'lucide-react'
import { STRINGS, useSettings } from '../contexts/SettingsContext'
import { parseMcAnswer } from '../utils/cardTextParser'
import { stripFreeRecallPrefix } from '../utils/cardVariant'
import { scoreFreeRecallSelfCheck } from '../utils/freeRecallScoring'
import type { Card } from '../types'

/**
 * FreeRecallCard — Studien-Renderer "M3 Free Recall".
 *
 * ⚠️ NEU GENERIERT, OHNE ORIGINAL-SCREENSHOT (RECOVERY_LOG §4, Git-Historie
 * bis f72ffd6): Der 8.-Juni-
 * Handy-Stand enthielt laut Nutzer einen Free-Recall-Modus, es existiert aber
 * kein Bild-Beleg. Ablauf laut TODO.md: erinnern → aufdecken → selbst bewerten.
 *
 * Encoding (definiert in docs/M3-free-recall.md): `front` beginnt mit
 * `RECALL:` oder die Karte trägt den Tag `free-recall`.
 *
 * Selbstbewertung: "Gewusst" → onAnswerEvaluated(1.0) (freie FSRS-Wahl 1–4),
 * "Nicht gewusst" → onAnswerEvaluated(0.0) → StudyView erzwingt Rating 1
 * (Again), dieselbe Sonderregel wie bei falschen MC-Antworten (P2.2).
 * Schrift: Mono für technische UI, Space Grotesk für längere Lerntexte.
 */

interface Props {
  card: Card
  flipped: boolean
  onFlip: () => void
  onEdit?: () => void
  onAnswerEvaluated: (score: number) => void
  compact?: boolean
  originDeckName?: string
}

const FreeRecallCard = memo(function FreeRecallCard({
  card, flipped, onFlip, onEdit, onAnswerEvaluated, compact = false, originDeckName,
}: Props) {
  const { settings } = useSettings()
  const t = STRINGS[settings.language]

  const questionText = useMemo(() => stripFreeRecallPrefix(card.front), [card.front])
  const answered = useMemo(() => parseMcAnswer(card.back), [card.back])

  // null = noch nicht selbst bewertet, true = gewusst, false = nicht gewusst
  const [selfCheck, setSelfCheck] = useState<boolean | null>(null)

  const handleSelfCheck = useCallback((known: boolean) => {
    if (selfCheck !== null) return
    setSelfCheck(known)
    onAnswerEvaluated(scoreFreeRecallSelfCheck(known))
  }, [selfCheck, onAnswerEvaluated])

  const renderOriginBadge = () => originDeckName ? (
    <span className="max-w-[160px] truncate rounded-[3px] border border-[--brand-secondary-25] bg-[--brand-secondary-12] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[--brand-secondary]">
      {originDeckName}
    </span>
  ) : null

  const cardShellCls = `border ${
    selfCheck === null ? 'border-transparent card-gradient-border' : selfCheck ? 'border-emerald-500/45' : 'border-rose-500/45'
  } flex flex-col overflow-hidden rounded-ds bg-ds-card shadow-card ${
    compact ? 'h-full min-h-0' : 'min-h-[280px] sm:min-h-[380px] md:min-h-[440px]'
  }`

  const bodyClass = compact
    ? 'min-h-0 flex-1 overflow-y-auto px-[14px] py-[16px] no-scrollbar'
    : 'flex-1 overflow-y-auto no-scrollbar px-6 py-6 md:px-8 md:py-8'

  const typeBadge = (
    <span className="rounded-[3px] border border-[--brand-secondary-50] bg-[--brand-secondary-12] px-1.5 py-px font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-[--brand-secondary]">
      {t.freerecall_type_badge}
    </span>
  )

  // ── BACK (Antwort + Selbstbewertung) ─────────────────────────────────────
  if (flipped) {
    return (
      <div className={`w-full ${compact ? 'h-full' : ''}`}>
        <div className={cardShellCls}>
          <div className="shrink-0 border-b border-ds-border px-[14px] py-[8px]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ds-muted">
                  {t.answer}
                </span>
                {typeBadge}
                {renderOriginBadge()}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-[3px] border border-[--brand-primary] px-[5px] py-px font-mono text-[9px] font-bold text-[--brand-primary]">B</span>
                {onEdit && (
                  <button onClick={(e) => { e.stopPropagation(); onEdit() }} className="ds-icon-button h-7 w-7" title={t.edit_card}>
                    <Edit size={14} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div data-study-scroll="allow" className={`${bodyClass} flex flex-col overscroll-y-contain`}>
            <p className={`${compact ? 'text-[15px]' : 'text-[19px] md:text-[21px]'} font-sans font-medium leading-[1.55] text-ds-fg`}>
              {answered.answer}
            </p>

            {answered.merkhilfe && (
              <div className="mt-3 border-l-2 border-[--brand-primary-50] bg-[--brand-primary-08] px-[10px] py-[6px]">
                <span className="mb-[2px] block font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-[--brand-primary]">{t.mnemonic}</span>
                <span className="font-sans text-[12px] italic leading-[1.4] text-zinc-300/70">{answered.merkhilfe}</span>
              </div>
            )}

            {/* Selbstbewertung: Gewusst / Nicht gewusst */}
            <div className="mt-auto pt-6" data-testid="freerecall-selfcheck">
              <p className="mb-2 text-center font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-500">
                {t.freerecall_selfcheck}
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  data-testid="freerecall-not-known"
                  onClick={(e) => { e.stopPropagation(); handleSelfCheck(false) }}
                  disabled={selfCheck !== null}
                  className={`flex min-h-[44px] items-center justify-center gap-2 rounded-ds border px-3 py-2.5 font-mono text-[13px] transition-all duration-200 ${
                    selfCheck === false
                      ? 'border-rose-500 bg-rose-500/15 text-rose-300'
                      : selfCheck === null
                      ? 'border-ds-border bg-ds-floor text-zinc-300 hover:border-rose-500/40 hover:text-rose-300 active:scale-[0.99]'
                      : 'border-transparent bg-transparent text-zinc-700 opacity-35'
                  }`}
                >
                  <X size={14} strokeWidth={2} /> {t.freerecall_not_known}
                </button>
                <button
                  type="button"
                  data-testid="freerecall-known"
                  onClick={(e) => { e.stopPropagation(); handleSelfCheck(true) }}
                  disabled={selfCheck !== null}
                  className={`flex min-h-[44px] items-center justify-center gap-2 rounded-ds border px-3 py-2.5 font-mono text-[13px] transition-all duration-200 ${
                    selfCheck === true
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                      : selfCheck === null
                      ? 'border-ds-border bg-ds-floor text-zinc-300 hover:border-emerald-500/40 hover:text-emerald-300 active:scale-[0.99]'
                      : 'border-transparent bg-transparent text-zinc-700 opacity-35'
                  }`}
                >
                  <Check size={14} strokeWidth={2} /> {t.freerecall_known}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── FRONT (Frage + Erinnern-Hinweis + Aufdecken) ─────────────────────────
  return (
    <div className={`w-full ${compact ? 'h-full' : ''}`}>
      <div className={cardShellCls}>
        <div className="shrink-0 border-b border-ds-border px-[14px] py-[8px]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ds-muted">
                {t.question}
              </span>
              {typeBadge}
              {renderOriginBadge()}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-[3px] border border-ds-border px-[5px] py-px font-mono text-[9px] font-bold text-zinc-400">A</span>
              {onEdit && (
                <button onClick={(e) => { e.stopPropagation(); onEdit() }} className="ds-icon-button h-7 w-7" title={t.edit_card}>
                  <Edit size={14} strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={`${bodyClass} flex flex-col`}>
          <p className={`font-sans font-medium leading-[1.55] text-ds-fg ${compact ? 'text-[15px]' : 'text-[16px] md:text-lg'}`}>
            {questionText}
          </p>

          <div className="mt-auto pt-6">
            <p className="mb-3 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              {t.freerecall_hint}
            </p>
            <button
              type="button"
              data-testid="freerecall-reveal"
              onClick={(e) => { e.stopPropagation(); onFlip() }}
              className="min-h-[44px] w-full rounded-ds border border-ds-border bg-ds-floor px-3 py-2.5 font-sans text-sm text-zinc-300 transition-all duration-200 hover:border-ds-border-hover hover:bg-ds-panel hover:text-zinc-50 active:scale-[0.99]"
            >
              {t.freerecall_reveal}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

export default FreeRecallCard
