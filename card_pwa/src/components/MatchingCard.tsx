import { memo, useMemo, useReducer, useCallback } from 'react'
import { Edit } from 'lucide-react'
import { useReducedMotion } from 'framer-motion'
import { STRINGS, useSettings } from '../contexts/SettingsContext'
import type { Card } from '../types'
import type { MatchingQuestion, MatchingAnswer } from '../utils/cardTextParser'
import { computeMatchingScore } from '../utils/pbqScoring'

interface Props {
  card: Card
  question: MatchingQuestion
  answer: MatchingAnswer
  flipped: boolean
  onFlip: () => void
  onEdit?: () => void
  onAnswerEvaluated: (score: number) => void
  compact?: boolean
  originDeckName?: string
}

interface MatchState {
  selectedLeft: string | null
  connections: Record<string, string>  // left → right
  submitted: boolean
  score: number | null
}

type MatchAction =
  | { type: 'SELECT_LEFT'; left: string }
  | { type: 'CONNECT'; right: string }
  | { type: 'SUBMIT'; score: number }

function matchingReducer(state: MatchState, action: MatchAction): MatchState {
  switch (action.type) {
    case 'SELECT_LEFT':
      return { ...state, selectedLeft: action.left }
    case 'CONNECT': {
      if (!state.selectedLeft) return state
      return {
        ...state,
        connections: { ...state.connections, [state.selectedLeft]: action.right },
        selectedLeft: null,
      }
    }
    case 'SUBMIT':
      return { ...state, submitted: true, score: action.score, selectedLeft: null }
    default:
      return state
  }
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = result[i]; result[i] = result[j]; result[j] = tmp
  }
  return result
}


const TYPE_BADGE: Record<Card['type'], { labelKey: 'type_new' | 'type_learning' | 'type_review' | 'type_relearning'; cls: string }> = {
  new:        { labelKey: 'type_new',        cls: 'border-blue-500/30 bg-blue-500/10 text-blue-500' },
  learning:   { labelKey: 'type_learning',   cls: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  review:     { labelKey: 'type_review',     cls: 'border-rose-500/30 bg-rose-500/10 text-rose-300' },
  relearning: { labelKey: 'type_relearning', cls: 'border-orange-500/30 bg-orange-500/10 text-orange-300' },
}

const MatchingCard = memo(function MatchingCard({
  card, question, answer, flipped, onFlip, onEdit, onAnswerEvaluated, compact = false, originDeckName,
}: Props) {
  const { settings } = useSettings()
  const t = STRINGS[settings.language]
  const prefersReducedMotion = useReducedMotion()
  const badge = TYPE_BADGE[card.type]

  const rightItems = useMemo(
    () => shuffleArray([...new Set(question.pairs.map(p => p.right))]),
    [card.id, card.front]
  )

  const leftItems = useMemo(() => question.pairs.map(p => p.left), [question.pairs])

  const [state, dispatch] = useReducer(matchingReducer, {
    selectedLeft: null,
    connections: {},
    submitted: false,
    score: null,
  })

  const handleLeftTap = useCallback((left: string) => {
    if (state.submitted) return
    dispatch({ type: 'SELECT_LEFT', left })
  }, [state.submitted])

  const handleRightTap = useCallback((right: string) => {
    if (state.submitted || !state.selectedLeft) return
    dispatch({ type: 'CONNECT', right })
  }, [state.submitted, state.selectedLeft])

  const handleSubmit = useCallback(() => {
    if (state.submitted) return
    const s = computeMatchingScore(state.connections, question.pairs)
    dispatch({ type: 'SUBMIT', score: s })
    onAnswerEvaluated(s)
    const delay = prefersReducedMotion ? 300 : (s === 1.0 ? 600 : 1200)
    setTimeout(() => onFlip(), delay)
  }, [state.submitted, state.connections, question.pairs, onAnswerEvaluated, onFlip, prefersReducedMotion])

  const allConnected = leftItems.every(l => !!state.connections[l])
  const scoreCount   = state.score !== null ? Math.round(state.score * question.pairs.length) : 0
  const scoreLabel   = t.ordering_score_label
    .replace('{count}', String(scoreCount))
    .replace('{total}', String(question.pairs.length))

  const cardShellCls = `border border-[#18181b] flex flex-col overflow-hidden rounded-[12px] bg-[#0c0c0c] shadow-card ${
    compact ? 'h-full min-h-0' : 'min-h-[280px] sm:min-h-[420px] md:min-h-[500px]'
  }`

  const renderOriginBadge = () => originDeckName ? (
    <span className="max-w-[160px] truncate rounded-[3px] border border-[--brand-secondary-25] bg-[--brand-secondary-12] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[--brand-secondary]">
      {originDeckName}
    </span>
  ) : null

  // ── FRONT ──────────────────────────────────────────────────────────────────
  if (!flipped) {
    return (
      <div className={`w-full ${compact ? 'h-full' : ''}`}>
        <div className={cardShellCls}>
          {/* Header */}
          <div className="shrink-0 border-b border-[#18181b] px-[14px] py-[8px]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-600">{t.question}</span>
                <span className={`rounded-[3px] border px-1.5 py-px font-mono text-[8px] font-bold uppercase tracking-[0.14em] ${badge.cls}`}>
                  {t[badge.labelKey]}
                </span>
                <span className="rounded-[3px] border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-px font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-cyan-400">
                  {t.matching_type_badge}
                </span>
                {renderOriginBadge()}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-[3px] border border-zinc-700 px-[5px] py-px font-mono text-[9px] font-bold text-zinc-400">A</span>
                {onEdit && (
                  <button onClick={(e) => { e.stopPropagation(); onEdit() }} className="ds-icon-button h-7 w-7" title={t.edit_card}>
                    <Edit size={14} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-[14px] pt-[14px] overscroll-contain">
            {question.question && (
              <p className={`font-mono font-medium leading-[1.55] text-[#f0ede8] ${compact ? 'text-[15px]' : 'text-[16px]'} mb-4`}>
                {question.question}
              </p>
            )}

            {/* Left items with their connections */}
            <div className="flex flex-col gap-2 mb-4">
              {leftItems.map(left => {
                const connected = state.connections[left]
                const isSelected = state.selectedLeft === left
                const feedback = state.submitted
                  ? (state.connections[left] === question.pairs.find(p => p.left === left)?.right ? 'correct' : 'incorrect')
                  : 'none'
                return (
                  <button
                    key={left}
                    type="button"
                    disabled={state.submitted}
                    onClick={(e) => { e.stopPropagation(); handleLeftTap(left) }}
                    className={`grid grid-cols-[1fr_auto] items-center gap-2 rounded-[10px] border min-h-[44px] px-3 text-left transition-all duration-150 ${
                      state.submitted
                        ? feedback === 'correct'
                          ? 'border-emerald-500/60 bg-emerald-500/8 cursor-default'
                          : 'border-rose-500/60 bg-rose-500/8 cursor-default'
                        : isSelected
                        ? 'border-cyan-500/60 bg-cyan-500/12'
                        : 'border-[#27272a] bg-[#0a0a0a] hover:border-[#3f3f46]'
                    }`}
                  >
                    <span className={`font-mono text-[14px] leading-snug ${
                      state.submitted && feedback === 'correct' ? 'text-emerald-300' :
                      state.submitted && feedback === 'incorrect' ? 'text-rose-300' :
                      isSelected ? 'text-cyan-300' : 'text-zinc-200'
                    }`}>
                      {left}
                    </span>
                    {connected && !state.submitted && (
                      <span className="rounded-[6px] border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] text-cyan-400 shrink-0 max-w-[120px] truncate">
                        {connected}
                      </span>
                    )}
                    {state.submitted && connected && (
                      <span className={`rounded-[6px] border px-2 py-0.5 font-mono text-[11px] shrink-0 max-w-[120px] truncate ${
                        feedback === 'correct'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                      }`}>
                        {connected}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Right options (shown when a left item is selected and not submitted) */}
            {state.selectedLeft && !state.submitted && (
              <div className="mb-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-600 mb-2">
                  {t.matching_select_hint}
                </p>
                <div className="flex flex-wrap gap-2">
                  {rightItems.map(right => (
                    <button
                      key={right}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRightTap(right) }}
                      className="min-h-[40px] rounded-[10px] border border-[#27272a] bg-[#0a0a0a] px-4 font-mono text-[13px] text-zinc-200 transition-all duration-150 hover:border-cyan-500/40 hover:bg-cyan-500/8 hover:text-cyan-300 active:scale-[0.98]"
                    >
                      {right}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sticky confirm button */}
          <div className="shrink-0 border-t border-[#18181b] px-[14px] py-[10px]">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleSubmit() }}
              disabled={state.submitted || !allConnected}
              className={`w-full min-h-[44px] rounded-[12px] border font-medium text-sm transition-all duration-200 ${
                state.submitted || !allConnected
                  ? 'border-zinc-700 bg-transparent text-zinc-600 cursor-default'
                  : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 active:scale-[0.99]'
              }`}
            >
              {t.matching_confirm_button}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── BACK ───────────────────────────────────────────────────────────────────
  const bodyClass = compact
    ? 'min-h-0 flex-1 overflow-y-auto px-[14px] py-[16px] no-scrollbar'
    : 'flex-1 overflow-y-auto no-scrollbar px-6 py-6 md:px-8 md:py-8'

  return (
    <div className={`w-full ${compact ? 'h-full' : ''}`}>
      <div className={cardShellCls}>
        <div className="shrink-0 border-b border-[#18181b] px-[14px] py-[8px]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-600">{t.answer}</span>
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
          {state.score !== null && (
            <div className={`mb-3 flex items-center gap-2 rounded-[12px] border px-3 py-2 ${
              state.score === 1.0
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : state.score >= 0.5
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
            }`}>
              <span className={`font-mono font-bold ${compact ? 'text-[13px]' : 'text-sm'}`}>{scoreLabel}</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {question.pairs.map(pair => (
              <div key={pair.left} className="flex items-center gap-2 text-[14px]">
                <span className="text-zinc-300 font-mono">{pair.left}</span>
                <span className="text-zinc-600">→</span>
                <span className="text-[#f0ede8] font-mono font-medium">{pair.right}</span>
              </div>
            ))}
          </div>

          {answer.merkhilfe && (
            <div className="mt-4 border-l-2 border-[--brand-primary-50] bg-[--brand-primary-08] px-[10px] py-[6px]">
              <span className="mb-[2px] block font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-[--brand-primary]">
                {t.mnemonic}
              </span>
              <span className="font-mono text-[12px] italic leading-[1.4] text-zinc-300/70">
                {answer.merkhilfe}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

export default MatchingCard
