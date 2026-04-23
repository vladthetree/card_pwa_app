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

function CardSection({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-xl border border-zinc-800/50 bg-zinc-900/30 ${className ?? ''}`.trim()}>
      {children}
    </div>
  )
}

/**
 * Card type display configuration
 */
const TYPE_BADGE: Record<Card['type'], { labelKey: 'type_new' | 'type_learning' | 'type_review' | 'type_relearning'; cls: string }> = {
  new:        { labelKey: 'type_new',        cls: 'bg-blue-500/30  text-blue-200'    },
  learning:   { labelKey: 'type_learning',   cls: 'bg-amber-500/30 text-amber-200'   },
  review:     { labelKey: 'type_review',     cls: 'bg-rose-500/30 text-rose-200'     },
  relearning: { labelKey: 'type_relearning', cls: 'bg-orange-500/30 text-orange-200' },
}

function getQuestionTextClass(compact: boolean, density: number, size: 'default' | 'large' | 'xlarge' | 'xxlarge' | 'xxxlarge'): string {
  if (compact) {
    if (size === 'xxxlarge') {
      return density > 250 ? 'text-[19px]' : 'text-[20px]'
    }
    if (size === 'xxlarge') {
      return density > 250 ? 'text-[17px]' : 'text-[18px]'
    }
    if (size === 'xlarge') {
      return density > 250 ? 'text-[15px]' : 'text-[16px]'
    }
    if (size === 'large') {
      return density > 250 ? 'text-[13px]' : 'text-[14px]'
    }
    return density > 250 ? 'text-[11px]' : 'text-[12px]'
  }

  if (size === 'xxxlarge') {
    return 'text-[19px] sm:text-2xl md:text-3xl'
  }
  if (size === 'xxlarge') {
    return 'text-[17px] sm:text-xl md:text-2xl'
  }
  if (size === 'xlarge') {
    return 'text-[15px] sm:text-lg md:text-xl'
  }
  if (size === 'large') {
    return 'text-[13px] sm:text-base md:text-lg'
  }
  return 'text-[11px] sm:text-sm md:text-base'
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

function ConfettiBurst() {
  const [particles, setParticles] = useState<Array<{
    id: number
    x: number
    size: number
    color: string
    duration: number
    delay: number
    dx: number
    dy: number
    rot: number
  }>>([])

  useEffect(() => {
    const colors = ['#10b981', '#34d399', '#fcd34d', '#3b82f6', '#f97316']
    setParticles(
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        size: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        duration: 0.8 + Math.random() * 1.5,
        delay: Math.random() * 0.2,
        dx: (Math.random() - 0.5) * 200,
        dy: -100 - Math.random() * 200,
        rot: Math.random() * 360,
      }))
    )
  }, [])

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-sm study-confetti-fall"
          style={{
            left: `${p.x}%`,
            top: '50%',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            '--dx': `${p.dx}px`,
            '--dy': `${p.dy}px`,
            '--rot': `${p.rot}deg`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            opacity: 0,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
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
  const compactOptionClass = compact
    ? frontContentDensity > 250
      ? 'min-h-[3.0rem] px-2.5 py-2 leading-snug flex items-center'
      : 'min-h-[3.5rem] px-3 py-2.5 leading-snug flex items-center'
    : 'p-2.5 sm:p-3'
  const compactOptionSpacingClass = 'space-y-2'
  const revealPendingLabel = settings.language === 'de' ? 'Antwort wird angezeigt...' : 'Showing answer...'
  const compactFrontLayoutStyle = compact
    ? { gridTemplateRows: 'minmax(46%, 1.3fr) minmax(0, 1fr)' }
    : undefined

  const renderOriginDeckBadge = () => (
    originDeckName ? (
      <span className="max-w-[160px] truncate rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-medium text-cyan-100/85">
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

  return (
    <div className={compact ? 'h-full' : ''}>
      <div
        className={`relative ${compact ? 'h-full' : ''} ${impactPhase === 'flipping' ? 'study-flip-out' : ''} ${flipInActive ? 'study-flip-in' : ''} ${shakeActive ? 'study-shake' : ''} ${wrongFlashActive ? 'study-wrong-flash' : ''}`}
        style={{ perspective: '1000px' }}
      >
        {/* Confetti for correct MC answers */}
        {flipped && hasAnswered && isAnswerCorrect && <ConfettiBurst />}

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
              <div className={`border flex flex-col overflow-hidden transition-all duration-300 ease-out ${compact ? 'bg-black border-white/20 rounded-[2.5rem] h-full min-h-0 p-1.5 justify-between' : 'bg-[#060606] border-zinc-800/80 rounded-[28px] min-h-[280px] sm:min-h-[420px] md:min-h-[500px]'}`}>
                {compact ? (
                  <div className="mb-2 rounded-2xl px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${badge.cls}`}>
                          {t[badge.labelKey]}
                        </span>
                        {renderOriginDeckBadge()}
                      </div>
                      {onEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onEdit()
                          }}
                          className="p-1.5 text-white/40 hover:text-white/80 hover:bg-white/5 rounded-2xl transition-all duration-300 ease-out active:scale-95"
                          title={t.edit_card}
                        >
                          <Edit size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="shrink-0 px-6 py-4 flex justify-between items-center border-b border-white/5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${badge.cls}`}>
                        {t[badge.labelKey]}
                      </span>
                      {renderOriginDeckBadge()}
                      {card.tags.length > 0 && (
                        <span className="font-sans text-[12px] text-zinc-500 hidden md:block truncate">
                          {card.tags.slice(0, 2).join(' · ')}
                        </span>
                      )}
                    </div>
                    {onEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onEdit()
                        }}
                        className="p-2 text-zinc-600 hover:text-zinc-300 hover:bg-white/10 rounded-full transition-all duration-300 ease-out active:scale-95"
                        title={t.edit_card}
                      >
                        <Edit size={16} />
                      </button>
                    )}
                  </div>
                )}

                {compact ? (
                  <div className="grid flex-1 min-h-0 gap-2" style={compactFrontLayoutStyle}>
                    <CardSection className="min-h-0 overflow-hidden flex flex-col rounded-[1.35rem] border-white/20 bg-black/35">
                      <div className="border-b border-white/8 px-3 py-1.5 shrink-0">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">{t.question}</p>
                      </div>
                      <div className="flex-1 min-h-0 p-2">
                        <div className="h-full overflow-hidden rounded-2xl bg-black/30 px-3 py-2.5">
                          <p className={`text-white font-black leading-snug ${compactQuestionClass}`}>
                            {question.question}
                          </p>
                        </div>
                      </div>
                    </CardSection>

                    <CardSection className="min-h-0 overflow-hidden flex flex-col rounded-[1.35rem] border-white/20 bg-black/35 p-2">
                      <div
                        data-study-scroll="allow"
                        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain pr-1"
                        style={{ WebkitOverflowScrolling: 'touch' }}
                      >
                        {hasOptions ? (
                          <div className={compactOptionSpacingClass}>
                            {effectiveOptionKeys.map((letter) =>
                              question.options[letter] ? (
                                <button
                                  key={letter}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleAnswerSelect(letter)
                                  }}
                                  disabled={hasAnswered}
                                  className={`w-full bg-zinc-900/30 border rounded-2xl transition-all duration-300 ease-out font-medium text-left text-white/95 grid grid-cols-[1.25rem_minmax(0,1fr)] gap-2 ${compactOptionClass} ${optionTextClass} ${hasAnswered ? 'border-zinc-800/50 cursor-not-allowed opacity-65' : 'border-zinc-800/50 hover:border-white/35 cursor-pointer active:scale-95'}`}
                                >
                                  <span className="font-black">{letter})</span>
                                  <span className="min-w-0">{question.options[letter]}</span>
                                </button>
                              ) : null
                            )}
                            {impactPhase !== 'idle' && (
                              <p className="pt-1 text-center text-[11px] uppercase tracking-[0.12em] text-white/40" aria-live="polite">
                                {revealPendingLabel}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center px-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onFlip()
                              }}
                              className="w-full min-h-[44px] px-3 py-2.5 rounded-2xl border border-white/25 text-white/85 hover:text-white hover:border-white/40 transition-all duration-300 ease-out active:scale-95 text-sm"
                            >
                              {t.answer}
                            </button>
                          </div>
                        )}
                      </div>
                    </CardSection>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-8 flex flex-col">
                    <p className={`font-sans font-semibold text-white/95 leading-tight mb-10 ${compactQuestionClass}`}>
                      {question.question}
                    </p>

                    {hasOptions && (
                      <div className="flex flex-col gap-4 mt-auto">
                        {effectiveOptionKeys.map((letter, index) => {
                          if (!question.options[letter]) return null
                          const isSelected = selectedAnswer === letter
                          const isImpact = impactPhase !== 'idle'
                          let optionCls = 'border-white/5 bg-[#0a0a0a] text-zinc-200 hover:bg-[#111] hover:border-zinc-500/50'
                          if (isImpact) {
                            if (isSelected) {
                              optionCls = correctKeys.includes(letter)
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)] scale-[1.02] z-10'
                                : 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-[0_0_30px_rgba(225,29,72,0.3)] scale-[1.02] z-10'
                            } else {
                              optionCls = 'border-transparent bg-transparent text-zinc-700 opacity-30 scale-[0.98]'
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
                              className={`group relative flex items-center text-left gap-6 rounded-[20px] px-8 py-5 border transition-all duration-200 outline-none ${optionCls}`}
                            >
                              {impactPhase === 'idle' && (
                                <div className="absolute -left-8 text-zinc-700 font-mono text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                                  [{index + 1}]
                                </div>
                              )}
                              <span className={`font-mono font-bold text-[18px] shrink-0 ${isImpact && isSelected ? 'text-inherit' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                                {letter})
                              </span>
                              <span className="font-sans font-medium text-[17px] tracking-wide">
                                {question.options[letter]}
                              </span>
                            </button>
                          )
                        })}
                        {impactPhase !== 'idle' && (
                          <p className="text-center text-xs uppercase tracking-[0.14em] text-white/40" aria-live="polite">
                            {revealPendingLabel}
                          </p>
                        )}
                      </div>
                    )}

                    {!hasOptions && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onFlip()
                          }}
                          className="mt-2 min-h-[44px] px-3 py-2.5 rounded-2xl border border-white/25 text-white/85 hover:text-white hover:border-white/40 transition-all duration-300 ease-out active:scale-95 text-sm"
                        >
                          {t.answer}
                        </button>
                        <p className="text-white/50 text-xs text-center mt-4">{t.tap_or_space_to_reveal}</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── BACK ────────────────────────────────────────────────────── */}
          {flipped && (
            <div className={`w-full relative ${compact ? 'h-full min-h-0' : ''}`}>
              <div
                className={`border flex flex-col justify-start overflow-hidden transition-all duration-300 ease-out ${
                  compact
                    ? `${hasAnswered ? (isAnswerCorrect ? 'border-emerald-500/45' : 'border-rose-500/45') : 'border-zinc-800/60'} bg-black rounded-[2.5rem] h-full min-h-0 p-3`
                    : `${hasAnswered ? (isAnswerCorrect ? 'border-emerald-900/60 ring-1 ring-emerald-500/30 bg-[#040a06]' : 'border-rose-900/60 ring-1 ring-rose-500/30 bg-[#0a0304]') : 'border-zinc-800/60 ring-1 ring-white/5 bg-[#080808]'} rounded-[28px] min-h-[220px] sm:min-h-[300px]`
                }`}
                style={!compact && hasAnswered ? {
                  animation: isAnswerCorrect ? 'study-glow-success 2s ease-out' : 'study-glow-error 2s ease-out'
                } : undefined}
              >
                {compact ? (
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`text-xs font-medium ${hasAnswered ? (isAnswerCorrect ? 'text-green-400/70' : 'text-red-400/70') : 'text-white/60'}`}>
                        {hasAnswered ? (isAnswerCorrect ? t.answer : t.wrong_answer) : t.answer}
                      </span>
                      {renderOriginDeckBadge()}
                    </div>
                    {onEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onEdit()
                        }}
                        className="p-2 text-white/40 hover:text-white/80 hover:bg-white/5 rounded-2xl transition-all duration-300 ease-out active:scale-95"
                        title={t.edit_card}
                      >
                        <Edit size={16} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="shrink-0 px-6 py-4 flex justify-between items-center border-b border-white/5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`font-sans font-medium text-[13px] tracking-wide ${hasAnswered ? (isAnswerCorrect ? 'text-emerald-400/70' : 'text-rose-400/70') : 'text-zinc-500'}`}>
                        {hasAnswered ? (isAnswerCorrect ? t.answer : t.wrong_answer) : t.answer}
                      </span>
                      {renderOriginDeckBadge()}
                    </div>
                    {onEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onEdit()
                        }}
                        className="p-2 text-zinc-600 hover:text-zinc-300 hover:bg-white/10 rounded-full transition-all duration-300 ease-out active:scale-95"
                        title={t.edit_card}
                      >
                        <Edit size={16} />
                      </button>
                    )}
                  </div>
                )}

                {compact ? (
                  <div
                    data-study-scroll="allow"
                    className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pr-1"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                  >
                    {correctKeys.length > 0 && hasAnswered && (
                      <div className={`mb-2 p-2 rounded-xl border ${isAnswerCorrect ? 'bg-green-500/20 border-green-500/40' : 'bg-red-500/20 border-red-500/40'}`}>
                        <span className={`${correctAnswerTextClass} font-bold ${isAnswerCorrect ? 'text-green-300' : 'text-red-300'}`}>
                          {isAnswerCorrect ? `✓ ${t.correct_label}: ${correctDisplay}` : `✗ ${t.wrong_label}: ${selectedDisplay}`}
                        </span>
                      </div>
                    )}

                    <p className="mb-2 text-sm font-medium leading-relaxed text-white">
                      {answered.answer}
                    </p>

                    {answered.merkhilfe && (
                      <div
                        className="mb-2 p-2 border-l-2 rounded-r-lg"
                        style={{
                          borderLeftColor: 'var(--brand-primary-50)',
                          background: 'var(--brand-primary-08)',
                        }}
                      >
                        <span className="text-xs font-semibold block mb-1" style={{ color: 'var(--brand-primary)' }}>{t.mnemonic}</span>
                        <span className="text-xs text-zinc-300/70">{answered.merkhilfe}</span>
                      </div>
                    )}

                    {answered.nicht && (
                      <div className="p-2 bg-red-500/10 border-l-2 border-red-300 rounded">
                        <span className="text-xs text-red-300 font-semibold block mb-1">{t.not_label}</span>
                        <span className="text-xs text-white/85">{answered.nicht}</span>
                      </div>
                    )}

                    {hasExtra && (
                      <div className="mt-2 grid grid-cols-1 gap-2 border-t border-white/20 pt-2 text-xs sm:grid-cols-2">
                        {card.extra.acronym && (
                          <div className="bg-black border border-white/20 px-3 py-2 rounded-xl">
                            <span className="text-white/55 block mb-0.5">{t.acronym}</span>
                            <span className="text-purple-300 font-mono">{card.extra.acronym}</span>
                          </div>
                        )}
                        {card.extra.port && (
                          <div className="bg-black border border-white/20 px-3 py-2 rounded-xl">
                            <span className="text-white/55 block mb-0.5">{t.port}</span>
                            <span className="text-blue-300 font-mono">{card.extra.port}</span>
                          </div>
                        )}
                        {card.extra.protocol && (
                          <div className="bg-black border border-white/20 px-3 py-2 rounded-xl">
                            <span className="text-white/55 block mb-0.5">{t.protocol}</span>
                            <span className="text-cyan-300">{card.extra.protocol}</span>
                          </div>
                        )}
                        {card.extra.examples && (
                          <div className="bg-black border border-white/20 px-3 py-2 rounded-xl sm:col-span-2">
                            <span className="text-white/55 block mb-0.5">{t.examples}</span>
                            <span className="text-amber-300">{card.extra.examples.slice(0, 120)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-8 flex flex-col">
                    {/* Feedback banner */}
                    {hasAnswered && (
                      <div className={`rounded-[16px] p-6 mb-8 flex items-center gap-3 border shadow-lg ${
                        isAnswerCorrect
                          ? 'bg-[#062c19] border-emerald-700/50 text-emerald-400'
                          : 'bg-[#2b0d14] border-rose-800/50 text-rose-400'
                      }`}>
                        {isAnswerCorrect
                          ? <Check size={24} strokeWidth={3} />
                          : <X size={24} strokeWidth={3} />}
                        <span className="font-sans font-bold text-[18px] tracking-wide">
                          {isAnswerCorrect
                            ? `${t.correct_label}: ${correctDisplay}`
                            : `${t.wrong_label}: ${selectedDisplay}`}
                        </span>
                      </div>
                    )}

                    <p className="font-sans font-medium text-[19px] md:text-[21px] text-white leading-relaxed mb-10">
                      {answered.answer}
                    </p>

                    {answered.merkhilfe && (
                      <div className="mt-auto bg-[#111] border border-white/5 rounded-[16px] p-6">
                        <div className="font-sans font-bold text-[12px] text-zinc-300 mb-2">{t.mnemonic}</div>
                        <div className="font-sans text-[15px] text-zinc-500 leading-relaxed">{answered.merkhilfe}</div>
                      </div>
                    )}

                    {answered.nicht && (
                      <div className={`${answered.merkhilfe ? 'mt-3' : 'mt-auto'} p-4 bg-red-500/10 border-l-2 border-red-300 rounded`}>
                        <span className="text-xs text-red-300 font-semibold block mb-1">{t.not_label}</span>
                        <span className="text-sm text-white/85">{answered.nicht}</span>
                      </div>
                    )}

                    {hasExtra && (
                      <div className={`${answered.merkhilfe || answered.nicht ? 'mt-3' : 'mt-auto'} pt-4 border-t border-white/20 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs overflow-hidden`}>
                        {card.extra.acronym && (
                          <div className="bg-black border border-white/20 px-3 py-2 rounded-xl">
                            <span className="text-white/55 block mb-0.5">{t.acronym}</span>
                            <span className="text-purple-300 font-mono">{card.extra.acronym}</span>
                          </div>
                        )}
                        {card.extra.port && (
                          <div className="bg-black border border-white/20 px-3 py-2 rounded-xl">
                            <span className="text-white/55 block mb-0.5">{t.port}</span>
                            <span className="text-blue-300 font-mono">{card.extra.port}</span>
                          </div>
                        )}
                        {card.extra.protocol && (
                          <div className="bg-black border border-white/20 px-3 py-2 rounded-xl">
                            <span className="text-white/55 block mb-0.5">{t.protocol}</span>
                            <span className="text-cyan-300">{card.extra.protocol}</span>
                          </div>
                        )}
                        {card.extra.examples && (
                          <div className="bg-black border border-white/20 px-3 py-2 rounded-xl sm:col-span-2">
                            <span className="text-white/55 block mb-0.5">{t.examples}</span>
                            <span className="text-amber-300">{card.extra.examples.slice(0, 120)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
})

export default CardFace
