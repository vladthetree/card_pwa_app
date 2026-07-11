/**
 * AI_CONTEXT: Reusable React component for drag Match Card; contributes to the card-learning UI and shared app interactions.
 */
import { memo, useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { Edit, X } from 'lucide-react'
import { motion, useReducedMotion } from '../ui/motion'
import { STRINGS, useSettings } from '../contexts/SettingsContext'
import type { Card } from '../types'
import type { Question, Answer } from '../utils/cardTextParser'
import { correctDragMatchKey, scoreDragMatchChoice } from '../utils/dragMatchScoring'
import { seededShuffle } from '../utils/hash'

/**
 * DragMatchCard — Studien-Renderer "M2 Drag-Match" (rekonstruiert aus den
 * Handy-Screenshots vom 8. Juni 2026: `Drag-Match1/2_enabled_Fokus_mode.jpeg`
 * + Karten-Backup `card-pwa-backup-…T21-54-32.csv`, card_id 1779669260169).
 *
 * Zweck: 4-Optionen-/1-richtig-Karten (Format `>> CORRECT: X | …` im `back`).
 * Die Antwort wird AUSSCHLIESSLICH per Drag in die Drop-Zone gegeben
 * (Nutzer-Vorgabe 2026-06-11: Tap darf NICHT als Antwort zählen — Tap-Auswahl
 * gibt es nur im Inline-MC-Renderer). Auswertung über `scoreDragMatchChoice`,
 * sodass die bestehende FSRS-Logik in StudyView greift.
 *
 * Wie im Screenshot belegt: die Optionen werden gemischt und nach Anzeige-Position
 * neu mit A–D beschriftet; die Korrektheit hängt an der kanonischen Identität der
 * Option (Datenmarke `>> CORRECT: B`), nicht am angezeigten Buchstaben. Deshalb
 * erscheint die richtige Antwort "Zero Trust Network Access" (kanonisch B) im
 * Screenshot als "D".
 *
 * Eigener Renderer, NICHT der PBQ-`MatchingCard` (Mehrfach-Paare).
 * Schrift: Mono für technische UI, Space Grotesk für längere Lerntexte.
 */

interface Props {
  card: Card
  question: Question
  answer: Answer
  flipped: boolean
  onFlip: () => void
  onEdit?: () => void
  onAnswerEvaluated: (score: number) => void
  compact?: boolean
  originDeckName?: string
  /** Antwortseite war schon sichtbar bzw. Karte ist read-only → kein Drag/Tap mehr. */
  inputLocked?: boolean
}

// Anzeige-Buchstaben werden nach Position vergeben (A, B, C, D …), unabhängig
// vom kanonischen Schlüssel der Option.
const DISPLAY_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']


const DragMatchCard = memo(function DragMatchCard({
  card, question, answer, flipped, onFlip, onEdit, onAnswerEvaluated, compact = false, originDeckName, inputLocked = false,
}: Props) {
  const { settings } = useSettings()
  const t = STRINGS[settings.language]
  const prefersReducedMotion = useReducedMotion()

  // Kanonisch korrekte Option (z. B. "B") + ihr Text — unabhängig von der Anzeige.
  const correctKey = correctDragMatchKey(answer)
  const correctText = question.options[correctKey] ?? ''

  // Optionen deterministisch pro Karte mischen (seeded): Reload/Resume ändert
  // die Reihenfolge nicht. Jeder Eintrag behält seinen kanonischen Schlüssel,
  // bekommt aber einen Anzeige-Buchstaben nach Position (wie im Screenshot).
  const shuffledOptions = useMemo(
    () => seededShuffle(`${card.id}:${card.front}`, Object.entries(question.options)).map(([key, text], index) => ({
      key,
      text,
      displayLetter: DISPLAY_LETTERS[index] ?? key,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [card.id, card.front],
  )

  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  // Flip-Choreografie wie beim Inline-MC-Renderer: erst flip-out auf der
  // Vorderseite, dann Seitenwechsel mit flip-in — statt hartem Schnitt.
  const [flipOutActive, setFlipOutActive] = useState(false)
  const [flipInActive, setFlipInActive] = useState(false)
  const submitted = selectedKey !== null
  const isCorrect = submitted && selectedKey === correctKey
  const selectedText = selectedKey ? (question.options[selectedKey] ?? '—') : '—'

  const dropZoneRef = useRef<HTMLDivElement | null>(null)
  const selectedKeyRef = useRef<string | null>(null)
  const flipTimerRef = useRef<number | null>(null)
  const flipOutTimerRef = useRef<number | null>(null)
  const prevFlippedRef = useRef(false)

  const clearPendingFlipTimers = useCallback(() => {
    if (flipTimerRef.current !== null) {
      window.clearTimeout(flipTimerRef.current)
      flipTimerRef.current = null
    }
    if (flipOutTimerRef.current !== null) {
      window.clearTimeout(flipOutTimerRef.current)
      flipOutTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    selectedKeyRef.current = null

    return clearPendingFlipTimers
  }, [card.id, clearPendingFlipTimers])

  // Wird die Karte zwischenzeitlich manuell umgedreht (Swipe/Space), muss der
  // pending Auto-Flip verfallen — sonst togglet der Timer brutal zurück auf
  // die Vorderseite. Der Wechsel auf die Rückseite animiert mit flip-in.
  useEffect(() => {
    const was = prevFlippedRef.current
    prevFlippedRef.current = flipped
    if (flipped && !was) {
      clearPendingFlipTimers()
      setFlipOutActive(false)
      setFlipInActive(true)
      const t = window.setTimeout(() => setFlipInActive(false), 400)
      return () => window.clearTimeout(t)
    }
  }, [flipped, clearPendingFlipTimers])

  const handleSelect = useCallback((key: string) => {
    if (selectedKeyRef.current !== null || inputLocked) return
    selectedKeyRef.current = key
    setSelectedKey(key)
    const score = scoreDragMatchChoice(answer, key)
    onAnswerEvaluated(score)
    const delay = prefersReducedMotion ? 400 : (score === 1 ? 700 : 1800)
    clearPendingFlipTimers()
    if (prefersReducedMotion) {
      flipTimerRef.current = window.setTimeout(() => {
        flipTimerRef.current = null
        onFlip()
      }, delay)
      return
    }
    flipOutTimerRef.current = window.setTimeout(() => {
      flipOutTimerRef.current = null
      setFlipOutActive(true)
      flipTimerRef.current = window.setTimeout(() => {
        flipTimerRef.current = null
        onFlip()
      }, 220)
    }, delay - 220)
  }, [answer, inputLocked, clearPendingFlipTimers, onAnswerEvaluated, onFlip, prefersReducedMotion])

  // Drag-Ende: prüfen, ob der Chip über der Drop-Zone losgelassen wurde.
  const handleDragEnd = useCallback((key: string, point: { x: number; y: number }) => {
    const zone = dropZoneRef.current?.getBoundingClientRect()
    if (zone && point.x >= zone.left && point.x <= zone.right && point.y >= zone.top && point.y <= zone.bottom) {
      handleSelect(key)
    }
  }, [handleSelect])

  const renderOriginBadge = () => originDeckName ? (
    <span className="max-w-[160px] truncate rounded-[3px] border border-[--brand-secondary-25] bg-[--brand-secondary-12] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[--brand-secondary]">
      {originDeckName}
    </span>
  ) : null

  const cardShellCls = `border ${
    submitted ? (isCorrect ? 'border-emerald-500/45' : 'border-rose-500/45') : 'border-transparent card-gradient-border'
  } flex flex-col overflow-hidden rounded-ds bg-ds-card shadow-card ${
    compact ? 'h-full min-h-0' : 'min-h-[280px] sm:min-h-[380px] md:min-h-[440px]'
  }`

  const bodyClass = compact
    ? 'min-h-0 flex-1 overflow-y-auto px-[14px] py-[16px] no-scrollbar'
    : 'flex-1 overflow-y-auto no-scrollbar px-6 py-6 md:px-8 md:py-8'

  // ── BACK (Erklärung + Merkhilfe) ─────────────────────────────────────────
  if (flipped) {
    return (
      <div className={`w-full ${compact ? 'h-full' : ''} ${flipInActive ? 'study-flip-in' : ''}`} style={{ perspective: '1000px' }}>
        <div className={cardShellCls}>
          <div className="shrink-0 border-b border-ds-border px-[14px] py-[8px]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ds-muted">
                  {isCorrect ? t.answer : t.wrong_answer}
                </span>
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
            {submitted && (
              <>
                {!isCorrect && (
                  <div className="mb-2 flex items-center gap-2 rounded-ds border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-rose-300">
                    <span className="font-mono font-bold text-sm">
                      {`${t.wrong_label}: ${selectedText}`}
                    </span>
                  </div>
                )}
                <div className="mb-3 flex items-center gap-2 rounded-ds border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-emerald-300">
                  <span className="font-mono font-bold text-sm">
                    {`${t.correct_label}: ${correctText}`}
                  </span>
                </div>
              </>
            )}

            <p className={`${compact ? 'text-[15px]' : 'text-[19px] md:text-[21px]'} font-sans font-medium leading-[1.55] text-ds-fg`}>
              {answer.answer}
            </p>

            {answer.merkhilfe && (
              <div className="mt-3 border-l-2 border-[--brand-primary-50] bg-[--brand-primary-08] px-[10px] py-[6px]">
                <span className="mb-[2px] block font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-[--brand-primary]">{t.mnemonic}</span>
                <span className="font-sans text-[12px] italic leading-[1.4] text-zinc-300/70">{answer.merkhilfe}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── FRONT (Frage + Drop-Zone + Optionen) ─────────────────────────────────
  return (
    <div className={`w-full ${compact ? 'h-full' : ''} ${flipOutActive ? 'study-flip-out' : ''}`} style={{ perspective: '1000px' }}>
      <div className={cardShellCls}>
        {/* Header: "FRAGE" links, DRAG-MATCH-Badge rechts (exakt wie Screenshot) */}
        <div className="shrink-0 border-b border-ds-border px-[14px] py-[8px]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ds-muted">
                {t.question}
              </span>
              {renderOriginBadge()}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-[3px] border border-amber-500/50 bg-amber-500/10 px-1.5 py-px font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-amber-400">
                {t.dragmatch_type_badge}
              </span>
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
            {question.question}
          </p>

          {/* Drop-Zone */}
          <div
            ref={dropZoneRef}
            data-testid="dragmatch-dropzone"
            className={`mt-5 flex min-h-[120px] flex-col items-center justify-center rounded-ds border-2 border-dashed px-4 py-5 text-center transition-colors duration-200 ${
              !submitted
                ? 'border-zinc-700 text-zinc-500'
                : isCorrect
                ? 'border-emerald-500/60 bg-emerald-500/8 text-emerald-300'
                : 'border-rose-500/70 bg-rose-500/5 text-rose-300'
            }`}
          >
            {!submitted && (
              <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
                {inputLocked ? t.answer_revealed_locked : t.dragmatch_dropzone_hint}
              </span>
            )}
            {submitted && isCorrect && (
              <span className="font-mono text-[15px] font-semibold">{correctText}</span>
            )}
            {submitted && !isCorrect && (
              <span className="font-mono text-[15px] font-bold uppercase tracking-[0.18em]">{t.dragmatch_wrong}</span>
            )}
          </div>

          {/* Falsch-Feedback: Deine/Richtige Antwort + Erklärung aus der Karte */}
          {submitted && !isCorrect && (
            <div className="mt-3 flex flex-col gap-3">
              <div className="rounded-ds border border-rose-500/40 bg-rose-500/5 px-3 py-3">
                <div className="flex items-center gap-2">
                  <X size={14} strokeWidth={2} className="shrink-0 text-rose-400" />
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-rose-300">{t.dragmatch_your_answer}</span>
                </div>
                <p className="mt-1 font-mono text-[14px] text-rose-200">{selectedText}</p>
                <div className="my-2 h-px bg-rose-500/20" />
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500">{t.dragmatch_correct_answer}</span>
                <p className="mt-1 font-mono text-[14px] font-medium text-ds-fg">{correctText}</p>
              </div>

              {answer.answer && (
                <div className="rounded-ds border border-ds-border bg-ds-floor px-3 py-3">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500">{t.dragmatch_explanation}</span>
                  <p className="mt-1.5 font-sans text-[14px] leading-[1.5] text-zinc-300">{answer.answer}</p>
                </div>
              )}
            </div>
          )}

          {/* Options-Chips (ziehbar + antippbar). mt-auto verankert sie unten →
              reservierter Fokus-Leerraum darüber, exakt wie im Screenshot. */}
          <div className="mt-auto grid grid-cols-2 gap-2.5 pt-6">
            {shuffledOptions.map(({ key, text, displayLetter }) => {
              const isSel = selectedKey === key
              const chipLocked = submitted || inputLocked
              const cls = submitted
                ? (isSel
                  ? (isCorrect ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-rose-500/60 bg-rose-500/10')
                  : key === correctKey
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-ds-border bg-ds-floor')
                : inputLocked
                ? 'border-ds-border bg-ds-floor opacity-60'
                : 'border-ds-border bg-ds-floor'
              return (
                <motion.button
                  key={key}
                  type="button"
                  data-testid={`dragmatch-option-${displayLetter}`}
                  drag={!chipLocked}
                  dragElastic={0.04}
                  dragMomentum={false}
                  dragSnapToOrigin
                  dragTransition={{ bounceStiffness: 500, bounceDamping: 28 }}
                  whileDrag={{ scale: 1.03, zIndex: 30 }}
                  onDragEnd={(_e, info) => handleDragEnd(key, info.point)}
                  style={{ touchAction: chipLocked ? 'auto' : 'none' }}
                  disabled={chipLocked}
                  className={`block transform-gpu select-none rounded-ds border px-3 py-3 text-left font-mono leading-snug transition-colors duration-150 ease-out will-change-transform ${cls} ${
                    chipLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
                  }`}
                >
                  <span className="text-[12px] font-bold text-zinc-500">{displayLetter})</span>{' '}
                  <span className="font-sans text-[14px] text-zinc-200">{text}</span>
                </motion.button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
})

export default DragMatchCard
