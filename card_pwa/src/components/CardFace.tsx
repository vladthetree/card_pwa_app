import { motion } from 'framer-motion'
import { memo, useState, useEffect, useMemo, useRef } from 'react'
import { Edit, Check, X } from 'lucide-react'
import { STRINGS, useSettings } from '../contexts/SettingsContext'
import { parseQuestionText, parseAnswerText } from '../utils/cardTextParser'
import type { Card } from '../types'

interface Props {
  card: Card
  flipped: boolean
  onFlip: () => void
  onEdit?: () => void
  onAnswerEvaluated?: (isCorrect: boolean) => void
  compact?: boolean
  originDeckName?: string
}

/**
 * Card type display configuration
 */
const TYPE_BADGE: Record<Card['type'], { labelKey: 'type_new' | 'type_learning' | 'type_review' | 'type_relearning'; cls: string }> = {
  new:        { labelKey: 'type_new',        cls: 'border-blue-500/30 bg-blue-500/10 text-blue-500' },
  learning:   { labelKey: 'type_learning',   cls: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  review:     { labelKey: 'type_review',     cls: 'border-rose-500/30 bg-rose-500/10 text-rose-300' },
  relearning: { labelKey: 'type_relearning', cls: 'border-orange-500/30 bg-orange-500/10 text-orange-300' },
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

function shuffleKeys(keys: string[]): string[] {
  const shuffled = [...keys]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = shuffled[i]
    shuffled[i] = shuffled[j]
    shuffled[j] = temp
  }
  return shuffled
}

/**
 * CardFace: Renders front/back of flashcard with interactive elements
 * Memoized to prevent unnecessary re-renders on parent updates
 */
const CardFace = memo(function CardFace({ card, flipped, onFlip, onEdit, onAnswerEvaluated, compact = false, originDeckName }: Props) {
  const { settings } = useSettings()
  const t = STRINGS[settings.language]
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [impactPhase, setImpactPhase] = useState<'idle' | 'selected' | 'flipping'>('idle')
  const [flipInActive, setFlipInActive] = useState(false)
  const [shakeActive, setShakeActive] = useState(false)
  const [wrongFlashActive, setWrongFlashActive] = useState(false)
  const flipT1 = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flipT2 = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingAutoFlipRef = useRef(false)
  const prevFlippedRef = useRef(false)
  const badge = TYPE_BADGE[card.type]
  const hasExtra = card.extra.acronym || card.extra.examples || card.extra.port || card.extra.protocol
  const answered = useMemo(() => parseAnswerText(card.back), [card.back])
  const question = useMemo(() => parseQuestionText(card.front), [card.front])

  const hasAnswered = selectedAnswer !== null
  const correctKeys = answered.correctOptions.length > 0
    ? answered.correctOptions
    : (answered.correct ? [answered.correct] : [])
  const shuffledOptionKeys = useMemo(() => {
    const optionKeys = Object.keys(question.options)
    return optionKeys.length < 2 ? optionKeys : shuffleKeys(optionKeys)
  }, [card.id, card.front, question.options])
  const isAnswerCorrect = hasAnswered && correctKeys.includes(selectedAnswer)
  const hasOptions = Object.keys(question.options).length > 0
  const effectiveOptionKeys = shuffledOptionKeys
  const correctDisplay = correctKeys.join(', ')
  const selectedDisplay = selectedAnswer
    ? `${selectedAnswer}${question.options[selectedAnswer] ? `: ${question.options[selectedAnswer]}` : ''}`
    : '—'
  const frontContentDensity = useMemo(
    () => question.question.length + effectiveOptionKeys.reduce((total, key) => total + (question.options[key]?.length ?? 0), 0),
    [question.question, question.options, effectiveOptionKeys]
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
      return () => clearTimeout(t1)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped])

  const handleAnswerSelect = (letter: string) => {
    if (hasAnswered || impactPhase !== 'idle') return
    const answeredCorrectly = correctKeys.includes(letter)
    setSelectedAnswer(letter)
    setImpactPhase('selected')
    onAnswerEvaluated?.(answeredCorrectly)
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

  const answerTone = hasAnswered
    ? (isAnswerCorrect ? 'border-emerald-500/45' : 'border-rose-500/45')
    : 'border-[#18181b]'
  const cardShellClass = `border ${flipped ? answerTone : 'border-[#18181b]'} flex flex-col overflow-hidden rounded-[12px] bg-[#0c0c0c] shadow-card transition-all duration-300 ease-out ${
    compact ? 'h-full min-h-0' : 'min-h-[280px] sm:min-h-[420px] md:min-h-[500px]'
  }`
  const bodyClass = compact
    ? 'min-h-0 flex-1 overflow-y-auto px-[14px] py-[16px] no-scrollbar'
    : 'flex-1 overflow-y-auto no-scrollbar px-6 py-6 md:px-8 md:py-8'
  const optionBaseClass = compact
    ? 'grid min-h-[3.25rem] w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-2 rounded-[12px] border px-3 py-2.5 text-left font-medium leading-snug transition-all duration-200'
    : 'grid w-full grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-4 rounded-[12px] border px-5 py-4 text-left font-medium transition-all duration-200'

  return (
    <div className={compact ? 'h-full' : ''}>
      <div
        className={`relative ${compact ? 'h-full' : ''} ${impactPhase === 'flipping' ? 'study-flip-out' : ''} ${flipInActive ? 'study-flip-in' : ''} ${shakeActive ? 'study-shake' : ''} ${wrongFlashActive ? 'study-wrong-flash' : ''}`}
        style={{ perspective: '1000px' }}
      >
        <motion.div
          className={`relative w-full ${compact ? 'h-full' : ''}`}
          style={{ transform: 'translateZ(0)', willChange: 'transform' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* ── FRONT ───────────────────────────────────────────────────── */}
          {!flipped && (
            <div className={`w-full ${compact ? 'h-full min-h-0' : ''}`}>
              <div className={cardShellClass}>
                <div className="shrink-0 border-b border-[#18181b] px-[14px] py-[8px]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-600">
                        {t.question}
                      </span>
                      <span className={`rounded-[3px] border px-1.5 py-px font-mono text-[8px] font-bold uppercase tracking-[0.14em] ${badge.cls}`}>
                        {t[badge.labelKey]}
                      </span>
                      {renderOriginDeckBadge()}
                      {card.tags.length > 0 && !compact && (
                        <span className="hidden truncate font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-600 md:block">
                          {card.tags.slice(0, 2).join(' · ')}
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-[3px] border border-zinc-700 px-[5px] py-px font-mono text-[9px] font-bold text-zinc-400">
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
                  <p className={`font-sans font-medium leading-[1.55] text-[#f0ede8] ${compactQuestionClass}`}>
                    {question.question}
                  </p>

                  {hasOptions && (
                    <div className="mt-5 flex flex-col gap-2.5">
                      {effectiveOptionKeys.map((letter) => {
                        if (!question.options[letter]) return null
                        const isSelected = selectedAnswer === letter
                        const isImpact = impactPhase !== 'idle'
                        let optionCls = 'border-[#18181b] bg-[#0a0a0a] text-zinc-200 hover:border-[#3f3f46] hover:bg-[#111]'
                        if (isImpact) {
                          if (isSelected) {
                            optionCls = correctKeys.includes(letter)
                              ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                              : 'border-rose-500 bg-rose-500/15 text-rose-300'
                          } else {
                            optionCls = 'border-transparent bg-transparent text-zinc-700 opacity-35'
                          }
                        }

                        return (
                          <button
                            key={letter}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAnswerSelect(letter)
                            }}
                            disabled={impactPhase !== 'idle'}
                            className={`${optionBaseClass} ${optionTextClass} ${optionCls} ${impactPhase === 'idle' ? 'cursor-pointer active:scale-[0.99]' : 'cursor-default'}`}
                          >
                            <span className="font-mono font-bold text-zinc-500">{letter})</span>
                            <span className="min-w-0 font-sans">{question.options[letter]}</span>
                          </button>
                        )
                      })}
                      {impactPhase !== 'idle' && (
                        <p className="pt-1 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-600" aria-live="polite">
                          {revealPendingLabel}
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
                        className="w-full min-h-[44px] rounded-[12px] border border-[#27272a] bg-[#0a0a0a] px-3 py-2.5 text-sm text-zinc-300 transition-all duration-200 hover:border-[#3f3f46] hover:bg-[#111] hover:text-zinc-50 active:scale-[0.99]"
                      >
                        {t.answer}
                      </button>
                      <p className="mt-3 text-center font-mono text-[8px] uppercase tracking-[0.2em] text-zinc-600">
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
                <div className="shrink-0 border-b border-[#18181b] px-[14px] py-[8px]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-600">
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
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  {correctKeys.length > 0 && hasAnswered && (
                    <div className={`mb-3 flex items-center gap-2 rounded-[12px] border px-3 py-2 ${
                      isAnswerCorrect ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                    }`}>
                      {isAnswerCorrect ? <Check size={16} strokeWidth={1.5} /> : <X size={16} strokeWidth={1.5} />}
                      <span className={`${correctAnswerTextClass} font-sans font-bold`}>
                        {isAnswerCorrect ? `${t.correct_label}: ${correctDisplay}` : `${t.wrong_label}: ${selectedDisplay}`}
                      </span>
                    </div>
                  )}

                  <p className={`${compact ? 'text-[15px]' : 'text-[19px] md:text-[21px]'} font-sans font-medium leading-[1.55] text-[#f0ede8]`}>
                    {answered.answer}
                  </p>

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

                  {answered.nicht && (
                    <div className="mt-3 border-l-2 border-rose-300 bg-rose-500/10 px-3 py-2">
                      <span className="mb-1 block font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-rose-300">{t.not_label}</span>
                      <span className="text-xs text-white/85">{answered.nicht}</span>
                    </div>
                  )}

                  {hasExtra && (
                    <div className={`${answered.merkhilfe || answered.nicht ? 'mt-3' : 'mt-auto pt-4'} grid grid-cols-1 gap-2 border-t border-[#18181b] pt-3 text-xs sm:grid-cols-2`}>
                      {card.extra.acronym && (
                        <div className="rounded-[12px] border border-[#18181b] bg-[#0a0a0a] px-3 py-2">
                          <span className="mb-0.5 block text-white/55">{t.acronym}</span>
                          <span className="font-mono text-zinc-200">{card.extra.acronym}</span>
                        </div>
                      )}
                      {card.extra.port && (
                        <div className="rounded-[12px] border border-[#18181b] bg-[#0a0a0a] px-3 py-2">
                          <span className="mb-0.5 block text-white/55">{t.port}</span>
                          <span className="font-mono text-[--brand-secondary]">{card.extra.port}</span>
                        </div>
                      )}
                      {card.extra.protocol && (
                        <div className="rounded-[12px] border border-[#18181b] bg-[#0a0a0a] px-3 py-2">
                          <span className="mb-0.5 block text-white/55">{t.protocol}</span>
                          <span className="text-[--brand-secondary]">{card.extra.protocol}</span>
                        </div>
                      )}
                      {card.extra.examples && (
                        <div className="rounded-[12px] border border-[#18181b] bg-[#0a0a0a] px-3 py-2 sm:col-span-2">
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
