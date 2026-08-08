/**
 * AI_CONTEXT: Reusable React component for card Face; contributes to the card-learning UI and shared app interactions.
 */
import { lazy, Suspense } from 'react'
import { motion } from '../ui/motion'
import { memo, useState, useEffect, useMemo, useRef } from 'react'
import { Edit, Check, X } from 'lucide-react'
import { STRINGS, useSettings } from '../contexts/SettingsContext'
import { parseMcQuestion, parseMcAnswer, parseQuestion, parseAnswer } from '../utils/cardTextParser'
import type { OrderingAnswer, MatchingAnswer } from '../utils/cardTextParser'
import { isDragMatchShape, isFreeRecallCard } from '../utils/cardVariant'
import { seededShuffle } from '../utils/hash'
import type { AnswerEvaluatedHandler, Card } from '../types'
import IncorrectReasonsSection from './IncorrectReasonsSection'

const OrderingCard   = lazy(() => import('./OrderingCard'))
const MatchingCard   = lazy(() => import('./MatchingCard'))
const DragMatchCard  = lazy(() => import('./DragMatchCard'))
const FreeRecallCard = lazy(() => import('./FreeRecallCard'))

interface Props {
  card: Card
  flipped: boolean
  onFlip: () => void
  onEdit?: () => void
  onAnswerEvaluated?: AnswerEvaluatedHandler
  compact?: boolean
  originDeckName?: string
  useDragMatchMode?: boolean
  /** Antwortseite wurde bereits gezeigt → Antwort-Eingaben der Vorderseite sperren
   *  (sonst ließe sich die Lösung erst ansehen und dann „wissend“ anklicken). */
  answerRevealed?: boolean
  /** Read-only-Ansicht (Zurückblättern auf die letzte bewertete Karte):
   *  sämtliche Antwort-Eingaben gesperrt, inkl. Free-Recall-Selbstbewertung. */
  readOnly?: boolean
}

/**
 * Card type display configuration
 */
// Nur Lern-Warnzustände tragen Signalfarbe (amber/rose, wie die Rating-Buttons);
// "neu" folgt dem Theme-Akzent, "review" bleibt neutral im Schwarz-Weiß-Grundton.
const TYPE_BADGE: Record<Card['type'], { labelKey: 'type_new' | 'type_learning' | 'type_review' | 'type_relearning'; cls: string }> = {
  new:        { labelKey: 'type_new',        cls: 'border-[--brand-secondary-25] bg-[--brand-secondary-08] text-[--brand-secondary]' },
  learning:   { labelKey: 'type_learning',   cls: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  review:     { labelKey: 'type_review',     cls: 'border-ds-border-strong bg-ds-panel text-ds-muted' },
  relearning: { labelKey: 'type_relearning', cls: 'border-rose-500/30 bg-rose-500/10 text-rose-300' },
}

function getQuestionTextClass(compact: boolean, density: number, size: 'default' | 'large' | 'xlarge' | 'xxlarge' | 'xxxlarge'): string {
  if (compact) {
    if (size === 'xxxlarge') {
      return density > 250 ? 'text-[20px]' : 'text-[22px]'
    }
    if (size === 'xxlarge') {
      return density > 250 ? 'text-[18px]' : 'text-[20px]'
    }
    if (size === 'xlarge') {
      return density > 250 ? 'text-[16px]' : 'text-[18px]'
    }
    if (size === 'large') {
      return density > 250 ? 'text-[15px]' : 'text-[16px]'
    }
    return density > 250 ? 'text-[14px]' : 'text-[16px]'
  }

  if (size === 'xxxlarge') {
    return 'text-xl sm:text-2xl md:text-3xl'
  }
  if (size === 'xxlarge') {
    return 'text-lg sm:text-xl md:text-2xl'
  }
  if (size === 'xlarge') {
    return 'text-base sm:text-lg md:text-xl'
  }
  if (size === 'large') {
    return 'text-[15px] sm:text-base md:text-lg'
  }
  return 'text-[16px]'
}

function getOptionTextClass(compact: boolean, density: number, size: 'default' | 'large' | 'xlarge' | 'xxlarge' | 'xxxlarge'): string {
  if (compact) {
    if (size === 'xxxlarge') {
      return density > 250 ? 'text-[18px]' : 'text-[19px]'
    }
    if (size === 'xxlarge') {
      return density > 250 ? 'text-[16px]' : 'text-[17px]'
    }
    if (size === 'xlarge') {
      return density > 250 ? 'text-[14px]' : 'text-[15px]'
    }
    if (size === 'large') {
      return density > 250 ? 'text-[12px]' : 'text-[13px]'
    }
    return density > 250 ? 'text-[10px]' : 'text-[11px]'
  }

  if (size === 'xxxlarge') return 'text-lg sm:text-xl'
  if (size === 'xxlarge') return 'text-base sm:text-lg'
  if (size === 'xlarge') return 'text-base sm:text-lg'
  if (size === 'large') return 'text-sm sm:text-base'
  return 'text-xs sm:text-sm'
}

function getCorrectAnswerTextClass(size: 'default' | 'large' | 'xlarge' | 'xxlarge' | 'xxxlarge'): string {
  if (size === 'xxxlarge') return 'text-base sm:text-lg'
  if (size === 'xxlarge') return 'text-sm sm:text-base'
  if (size === 'xlarge') return 'text-sm sm:text-base'
  if (size === 'large') return 'text-xs sm:text-sm'
  return 'text-[10px] sm:text-xs'
}


/**
 * CardFace: Renders front/back of flashcard with interactive elements
 * Memoized to prevent unnecessary re-renders on parent updates
 */
const CardFace = memo(function CardFace({ card, flipped, onFlip, onEdit, onAnswerEvaluated, compact = false, originDeckName, useDragMatchMode = true, answerRevealed = false, readOnly = false }: Props) {
  const { settings } = useSettings()
  const t = STRINGS[settings.language]

  // Antwort-Eingaben sperren, sobald die Rückseite schon sichtbar war oder die
  // Karte nur angesehen wird. Free Recall ist die Ausnahme: dort gehört das
  // Aufdecken zum Ablauf, nur readOnly sperrt die Selbstbewertung.
  const inputLocked = readOnly || answerRevealed

  // Dispatch to PBQ sub-components when card type requires it
  const anyQuestion = useMemo(() => parseQuestion(card.front), [card.id, card.front])

  if (anyQuestion.type === 'ordering') {
    const anyAnswer = parseAnswer(card.back, 'ordering') as OrderingAnswer
    return (
      <Suspense fallback={null}>
        <OrderingCard
          card={card} question={anyQuestion} answer={anyAnswer}
          flipped={flipped} onFlip={onFlip} onEdit={onEdit}
          onAnswerEvaluated={onAnswerEvaluated ?? (() => {})}
          compact={compact} originDeckName={originDeckName}
          inputLocked={inputLocked}
        />
      </Suspense>
    )
  }

  if (anyQuestion.type === 'matching') {
    const anyAnswer = parseAnswer(card.back, 'matching') as MatchingAnswer
    return (
      <Suspense fallback={null}>
        <MatchingCard
          card={card} question={anyQuestion} answer={anyAnswer}
          flipped={flipped} onFlip={onFlip} onEdit={onEdit}
          onAnswerEvaluated={onAnswerEvaluated ?? (() => {})}
          compact={compact} originDeckName={originDeckName}
          inputLocked={inputLocked}
        />
      </Suspense>
    )
  }

  // M3 Free Recall: Karten mit `RECALL:`-Präfix oder Tag `free-recall`
  // (erinnern → aufdecken → selbst bewerten). Vor dem MC-Zweig geprüft,
  // damit Free-Recall auch dann greift, wenn der Text Optionszeilen enthielte.
  if (isFreeRecallCard(card.front, card.tags)) {
    return (
      <Suspense fallback={null}>
        <FreeRecallCard
          card={card}
          flipped={flipped} onFlip={onFlip} onEdit={onEdit}
          onAnswerEvaluated={onAnswerEvaluated ?? (() => {})}
          compact={compact} originDeckName={originDeckName}
          inputLocked={readOnly}
        />
      </Suspense>
    )
  }

  // M2 Drag-Match: docs/M2-drag-match.md ist die Source of Truth:
  // genau 4 Optionen (A-D) und genau 1 korrekte Antwort. Andere MC-Formen
  // fallen auf die bestehende Inline-Darstellung unten zurück.
  const mcQuestion = parseMcQuestion(card.front)
  const mcAnswer = parseMcAnswer(card.back)
  if (useDragMatchMode && isDragMatchShape(mcQuestion, mcAnswer)) {
    return (
      <Suspense fallback={null}>
        <DragMatchCard
          card={card} question={mcQuestion} answer={mcAnswer}
          flipped={flipped} onFlip={onFlip} onEdit={onEdit}
          onAnswerEvaluated={onAnswerEvaluated ?? (() => {})}
          compact={compact} originDeckName={originDeckName}
          inputLocked={inputLocked}
        />
      </Suspense>
    )
  }

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [impactPhase, setImpactPhase] = useState<'idle' | 'selected' | 'flipping'>('idle')
  const [flipInActive, setFlipInActive] = useState(false)
  const [shakeActive, setShakeActive] = useState(false)
  const [wrongFlashActive, setWrongFlashActive] = useState(false)
  const [correctGlowActive, setCorrectGlowActive] = useState(false)
  const flipT1 = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flipT2 = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingAutoFlipRef = useRef(false)
  const prevFlippedRef = useRef(false)
  const badge = TYPE_BADGE[card.type]
  const hasExtra = card.extra.acronym || card.extra.examples || card.extra.port || card.extra.protocol
  const answered = useMemo(() => parseMcAnswer(card.back), [card.back])
  const question = useMemo(() => parseMcQuestion(card.front), [card.front])

  const hasAnswered = selectedAnswer !== null
  const correctKeys = answered.correctOptions.length > 0
    ? answered.correctOptions
    : (answered.correct ? [answered.correct] : [])
  // Inhalte werden pro Karte gemischt, die Anzeige-Buchstaben laufen aber immer
  // A, B, C, … nach Position. Logik (Auswahl/Korrektheit) bleibt am kanonischen
  // Schlüssel der Option hängen. Seeded statt Math.random: ein Reload/Resume
  // mitten in der Session darf die Optionsreihenfolge nicht verändern.
  const displayOptions = useMemo(() => {
    const entries = Object.entries(question.options).filter(([, text]) => text)
    const ordered = entries.length < 2 ? entries : seededShuffle(`${card.id}:${card.front}`, entries)
    return ordered.map(([key, text], index) => ({
      key,
      text,
      displayLetter: String.fromCharCode(65 + index),
    }))
  }, [card.id, card.front, question.options])
  const displayLetterByKey = useMemo(
    () => Object.fromEntries(displayOptions.map(option => [option.key, option.displayLetter])),
    [displayOptions]
  )
  const isAnswerCorrect = hasAnswered && correctKeys.includes(selectedAnswer)
  const hasOptions = displayOptions.length > 0
  const correctDisplay = correctKeys
    .map(key => `${displayLetterByKey[key] ?? key}${question.options[key] ? `: ${question.options[key]}` : ''}`)
    .join(' · ')
  const selectedDisplay = selectedAnswer
    ? `${displayLetterByKey[selectedAnswer] ?? selectedAnswer}${question.options[selectedAnswer] ? `: ${question.options[selectedAnswer]}` : ''}`
    : '—'
  const frontContentDensity = useMemo(
    () => question.question.length + displayOptions.reduce((total, option) => total + option.text.length, 0),
    [question.question, displayOptions]
  )
  const compactQuestionClass = getQuestionTextClass(compact, frontContentDensity, settings.questionTextSize)
  const optionTextClass = getOptionTextClass(compact, frontContentDensity, settings.questionTextSize)
  const correctAnswerTextClass = getCorrectAnswerTextClass(settings.questionTextSize)
  const revealPendingLabel = settings.language === 'de' ? 'Antwort wird angezeigt...' : 'Showing answer...'

  const renderOriginDeckBadge = () => (
    originDeckName ? (
      <span className="max-w-[160px] truncate rounded-[3px] border border-[--brand-secondary-25] bg-[--brand-secondary-12] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[--brand-secondary]">
        {originDeckName}
      </span>
    ) : null
  )

  /**
   * Reset answer state and animation flags when card changes
   */
  useEffect(() => {
    if (flipT1.current) clearTimeout(flipT1.current)
    if (flipT2.current) clearTimeout(flipT2.current)
    pendingAutoFlipRef.current = false
    setSelectedAnswer(null)
    setImpactPhase('idle')
    setFlipInActive(false)
    setShakeActive(false)
    setWrongFlashActive(false)
    setCorrectGlowActive(false)
    prevFlippedRef.current = false
  }, [card.id, card.front])

  useEffect(() => {
    return () => {
      if (flipT1.current) clearTimeout(flipT1.current)
      if (flipT2.current) clearTimeout(flipT2.current)
      pendingAutoFlipRef.current = false
    }
  }, [])

  /**
   * Detect flipped transition false→true to trigger flip-in and optional shake
   */
  useEffect(() => {
    const was = prevFlippedRef.current
    prevFlippedRef.current = flipped
    if (flipped && !was) {
      // If user flips manually while an auto-flip timer is pending, cancel it
      // so we do not toggle back a second time.
      pendingAutoFlipRef.current = false
      if (flipT1.current) clearTimeout(flipT1.current)
      if (flipT2.current) clearTimeout(flipT2.current)
      setImpactPhase('idle')
      setFlipInActive(true)
      const t1 = setTimeout(() => setFlipInActive(false), 400)
      if (selectedAnswer !== null && !correctKeys.includes(selectedAnswer)) {
        setShakeActive(true)
        setWrongFlashActive(true)
        const t2 = setTimeout(() => setShakeActive(false), 400)
        const t3 = setTimeout(() => setWrongFlashActive(false), 520)
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
      }
      if (selectedAnswer !== null && correctKeys.includes(selectedAnswer)) {
        setCorrectGlowActive(true)
      }
      return () => clearTimeout(t1)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped])

  const handleAnswerSelect = (letter: string) => {
    if (hasAnswered || impactPhase !== 'idle' || inputLocked) return
    const answeredCorrectly = correctKeys.includes(letter)
    setSelectedAnswer(letter)
    setImpactPhase('selected')
    // Kanonische Options-Schlüssel (nicht die pro Karte gemischten Anzeige-
    // Buchstaben), damit gespeicherte Antworten stabil auswertbar bleiben.
    onAnswerEvaluated?.(answeredCorrectly ? 1.0 : 0.0, {
      selected: `${letter}: ${question.options[letter] ?? ''}`,
      correct: correctKeys.map(key => `${key}: ${question.options[key] ?? ''}`).join(' · '),
    })
    pendingAutoFlipRef.current = true

    if (!answeredCorrectly) {
      setWrongFlashActive(true)
      window.setTimeout(() => setWrongFlashActive(false), 520)
    }

    flipT1.current = setTimeout(() => {
      if (!pendingAutoFlipRef.current) return

      if (answeredCorrectly) {
        pendingAutoFlipRef.current = false
        onFlip()
        return
      }

      setImpactPhase('flipping')
      flipT2.current = setTimeout(() => {
        if (!pendingAutoFlipRef.current) return
        pendingAutoFlipRef.current = false
        onFlip()
      }, 250)
    }, answeredCorrectly ? 560 : 400)
  }

  const neutralCardBorder = 'border-transparent card-gradient-border'
  const answerTone = hasAnswered
    ? (isAnswerCorrect ? 'border-emerald-500/45' : 'border-rose-500/45')
    : neutralCardBorder
  const cardShellClass = `border ${flipped ? answerTone : neutralCardBorder} flex flex-col overflow-hidden rounded-ds bg-ds-card shadow-card transition-all duration-150 ease-out ${
    compact ? 'h-full min-h-0' : 'min-h-[280px] sm:min-h-[380px] md:min-h-[440px]'
  }${flipped && correctGlowActive ? ' study-glow-success' : ''}`
  const bodyClass = compact
    ? 'min-h-0 flex-1 overflow-y-auto px-[14px] py-[16px] no-scrollbar'
    : 'flex-1 overflow-y-auto no-scrollbar px-6 py-6 md:px-8 md:py-8'
  const optionBaseClass = compact
    ? 'grid min-h-[3.25rem] w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-2 rounded-ds border px-3 py-2.5 text-left font-medium leading-snug transition-all duration-200'
    : 'grid w-full grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-4 rounded-ds border px-5 py-4 text-left font-medium transition-all duration-200'

  return (
    <div className={compact ? 'h-full' : ''}>
      <div
        className={`relative ${compact ? 'h-full' : ''} ${impactPhase === 'flipping' ? 'study-flip-out' : ''} ${flipInActive ? 'study-flip-in' : ''} ${shakeActive ? 'study-shake' : ''} ${wrongFlashActive ? 'study-wrong-flash' : ''}`}
        style={{ perspective: '1000px' }}
      >
        <motion.div
          className={`relative w-full ${compact ? 'h-full' : ''}`}
          style={{ transform: 'translateZ(0)', willChange: 'transform' }}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28, mass: 0.85 }}
        >
          {/* ── FRONT ───────────────────────────────────────────────────── */}
          {!flipped && (
            <div className={`w-full ${compact ? 'h-full min-h-0' : ''}`}>
              <div className={cardShellClass}>
                <div className="shrink-0 border-b border-ds-border px-[14px] py-[8px]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ds-muted">
                        {t.question}
                      </span>
                      <span className={`rounded-[3px] border px-1.5 py-px font-mono text-[8px] font-bold uppercase tracking-[0.14em] ${badge.cls}`}>
                        {t[badge.labelKey]}
                      </span>
                      {renderOriginDeckBadge()}
                      {card.tags.length > 0 && !compact && (
                        <span className="hidden truncate font-mono text-[9px] uppercase tracking-[0.1em] text-ds-muted md:block">
                          {card.tags.slice(0, 2).join(' · ')}
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-[3px] border border-ds-border px-[5px] py-px font-mono text-[9px] font-bold text-zinc-400">
                        A
                      </span>
                      {onEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onEdit()
                          }}
                          className="ds-icon-button h-7 w-7"
                          title={t.edit_card}
                        >
                          <Edit size={14} strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className={`${bodyClass} flex flex-col`}>
                  <p className={`card-face-text font-sans font-medium leading-[1.55] text-ds-fg ${compactQuestionClass}`}>
                    {question.question}
                  </p>

                  {hasOptions && (
                    <div className="mt-5 flex flex-col gap-2.5">
                      {displayOptions.map(({ key, text, displayLetter }) => {
                        const isSelected = selectedAnswer === key
                        // hasAnswered zählt mit: Nach dem Zurückblättern auf die
                        // Vorderseite bleibt die getroffene Auswahl sichtbar,
                        // statt die Karte fälschlich unbeantwortet wirken zu lassen.
                        const isImpact = impactPhase !== 'idle' || hasAnswered
                        const optionsDisabled = impactPhase !== 'idle' || hasAnswered || inputLocked
                        let optionCls = 'border-ds-border bg-ds-floor text-zinc-200 hover:border-ds-border-hover hover:bg-ds-panel'
                        if (isImpact) {
                          if (isSelected) {
                            optionCls = correctKeys.includes(key)
                              ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                              : 'border-rose-500 bg-rose-500/15 text-rose-300'
                          } else {
                            optionCls = 'border-transparent bg-transparent text-zinc-700 opacity-35'
                          }
                        } else if (inputLocked) {
                          optionCls = 'border-ds-border bg-ds-floor text-zinc-500 opacity-60'
                        }

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAnswerSelect(key)
                            }}
                            disabled={optionsDisabled}
                            className={`${optionBaseClass} ${optionTextClass} ${optionCls} ${optionsDisabled ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'}`}
                          >
                            <span className="font-mono font-bold text-zinc-500">{displayLetter})</span>
                            <span className="min-w-0 font-sans">{text}</span>
                          </button>
                        )
                      })}
                      {impactPhase !== 'idle' && (
                        <p className="pt-1 text-center font-mono text-[9px] uppercase tracking-[0.12em] text-ds-muted" aria-live="polite">
                          {revealPendingLabel}
                        </p>
                      )}
                      {impactPhase === 'idle' && inputLocked && !hasAnswered && !readOnly && (
                        <p className="pt-1 text-center font-mono text-[9px] uppercase tracking-[0.12em] text-ds-muted" aria-live="polite">
                          {t.answer_revealed_locked}
                        </p>
                      )}
                    </div>
                  )}

                  {!hasOptions && (
                    <div className="mt-auto pt-6">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onFlip()
                        }}
                        className="min-h-[44px] w-full rounded-ds border border-ds-border bg-ds-floor px-3 py-2.5 text-sm text-zinc-300 transition-all duration-200 hover:border-ds-border-hover hover:bg-ds-panel hover:text-zinc-50 active:scale-[0.99]"
                      >
                        {t.answer}
                      </button>
                      <p className="mt-3 text-center font-mono text-[8px] uppercase tracking-[0.14em] text-ds-muted">
                        {t.tap_or_space_to_reveal}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── BACK ────────────────────────────────────────────────────── */}
          {flipped && (
            <div className={`w-full relative ${compact ? 'h-full min-h-0' : ''}`}>
              <div className={cardShellClass}>
                <div className="shrink-0 border-b border-ds-border px-[14px] py-[8px]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ds-muted">
                        {hasAnswered ? (isAnswerCorrect ? t.answer : t.wrong_answer) : t.answer}
                      </span>
                      {renderOriginDeckBadge()}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-[3px] border border-[--brand-primary] px-[5px] py-px font-mono text-[9px] font-bold text-[--brand-primary]">
                        B
                      </span>
                      {onEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onEdit()
                          }}
                          className="ds-icon-button h-7 w-7"
                          title={t.edit_card}
                        >
                          <Edit size={14} strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  data-study-scroll="allow"
                  className={`${bodyClass} flex flex-col overscroll-y-contain`}
                >
                  {correctKeys.length > 0 && (
                    <>
                      {hasAnswered && !isAnswerCorrect && (
                        <div className="mb-2 flex items-center gap-2 rounded-ds border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-rose-300">
                          <X size={16} strokeWidth={1.5} className="shrink-0" />
                          <span className={`${correctAnswerTextClass} font-mono font-bold`}>
                            {`${t.wrong_label}: ${selectedDisplay}`}
                          </span>
                        </div>
                      )}
                      <div className="mb-3 flex items-center gap-2 rounded-ds border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-emerald-300">
                        <Check size={16} strokeWidth={1.5} className="shrink-0" />
                        <span className={`${correctAnswerTextClass} font-mono font-bold`}>
                          {`${t.correct_label}: ${correctDisplay}`}
                        </span>
                      </div>
                    </>
                  )}

                  {answered.answer && (
                    <section>
                      <h3 className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                        {t.why_correct}
                      </h3>
                      <p className={`card-face-text ${compact ? 'text-[15px]' : 'text-[19px] md:text-[21px]'} font-sans font-medium leading-[1.55] text-ds-fg`}>
                        {answered.answer}
                      </p>
                    </section>
                  )}

                  {answered.merkhilfe && (
                    <div className={`${answered.answer ? 'mt-3' : 'mt-0'} border-l-2 border-[--brand-primary-50] bg-[--brand-primary-08] px-[10px] py-[6px]`}>
                      <span className="mb-[2px] block font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-[--brand-primary]">
                        {t.mnemonic}
                      </span>
                      <span className="font-sans text-[12px] italic leading-[1.4] text-zinc-300/70">
                        {answered.merkhilfe}
                      </span>
                    </div>
                  )}

                  <IncorrectReasonsSection
                    answer={answered}
                    options={question.options}
                    selectedKey={selectedAnswer}
                    compact={compact}
                  />

                  {hasExtra && (
                    <div className={`${answered.merkhilfe || answered.nicht ? 'mt-3' : 'mt-auto pt-4'} grid grid-cols-1 gap-2 border-t border-ds-border pt-3 text-xs sm:grid-cols-2`}>
                      {card.extra.acronym && (
                        <div className="rounded-ds border border-ds-border bg-ds-floor px-3 py-2">
                          <span className="mb-0.5 block text-white/55">{t.acronym}</span>
                          <span className="font-mono text-zinc-200">{card.extra.acronym}</span>
                        </div>
                      )}
                      {card.extra.port && (
                        <div className="rounded-ds border border-ds-border bg-ds-floor px-3 py-2">
                          <span className="mb-0.5 block text-white/55">{t.port}</span>
                          <span className="font-mono text-[--brand-secondary]">{card.extra.port}</span>
                        </div>
                      )}
                      {card.extra.protocol && (
                        <div className="rounded-ds border border-ds-border bg-ds-floor px-3 py-2">
                          <span className="mb-0.5 block text-white/55">{t.protocol}</span>
                          <span className="text-[--brand-secondary]">{card.extra.protocol}</span>
                        </div>
                      )}
                      {card.extra.examples && (
                        <div className="rounded-ds border border-ds-border bg-ds-floor px-3 py-2 sm:col-span-2">
                          <span className="mb-0.5 block text-white/55">{t.examples}</span>
                          <span className="text-[--brand-primary]">{card.extra.examples.slice(0, 120)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
})

export default CardFace
