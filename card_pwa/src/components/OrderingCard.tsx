/**
 * AI_CONTEXT: Reusable React component for ordering Card; contributes to the card-learning UI and shared app interactions.
 */
import { memo, useMemo, useState, useCallback, useEffect, useRef } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Edit } from 'lucide-react'
import { useReducedMotion } from '../ui/motion'
import { STRINGS, useSettings } from '../contexts/SettingsContext'
import { useHandsetLayout } from '../hooks/useHandsetLayout'
import type { AnswerEvaluatedHandler, Card } from '../types'
import type { OrderingQuestion, OrderingAnswer } from '../utils/cardTextParser'
import { computeOrderingScore } from '../utils/pbqScoring'
import { seededShuffle } from '../utils/hash'

interface Props {
  card: Card
  question: OrderingQuestion
  answer: OrderingAnswer
  flipped: boolean
  onFlip: () => void
  onEdit?: () => void
  onAnswerEvaluated: AnswerEvaluatedHandler
  compact?: boolean
  originDeckName?: string
  /** Antwortseite war schon sichtbar bzw. Karte ist read-only → Sortieren gesperrt. */
  inputLocked?: boolean
}

// Six-dot grip pattern — more recognisable as "draggable" than a single icon
function GripDots({ className }: { className?: string }) {
  return (
    <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" className={className}>
      <circle cx="3" cy="4"  r="1.5" />
      <circle cx="9" cy="4"  r="1.5" />
      <circle cx="3" cy="8"  r="1.5" />
      <circle cx="9" cy="8"  r="1.5" />
      <circle cx="3" cy="12" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
    </svg>
  )
}

interface ItemRowProps {
  id: string
  label: string
  position: number        // 1-based current position in the list
  feedback: 'correct' | 'incorrect' | 'none'
  correctPosition?: number
  submitted: boolean
  isDragOverlay?: boolean
}

function ItemRow({ id, label, position, feedback, correctPosition, submitted, isDragOverlay = false }: ItemRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragOverlay ? undefined : transition,
  }

  let borderCls = 'border-ds-border'
  let bgCls     = 'bg-ds-floor'
  let numCls    = 'text-zinc-600'
  let textCls   = 'text-zinc-200'

  if (submitted) {
    if (feedback === 'correct')   { borderCls = 'border-emerald-500/50'; bgCls = 'bg-emerald-500/8'; numCls = 'text-emerald-600'; textCls = 'text-emerald-300' }
    if (feedback === 'incorrect') { borderCls = 'border-rose-500/50';    bgCls = 'bg-rose-500/8';    numCls = 'text-rose-600/70'; textCls = 'text-rose-300' }
  }

  const elevationCls = isDragOverlay
    ? 'scale-[1.02] rotate-[0.5deg] border-[--brand-secondary-50] bg-ds-panel shadow-[0_8px_24px_rgba(0,0,0,0.55)]'
    : isDragging
    ? 'opacity-30'
    : ''

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex min-h-[52px] items-stretch rounded-ds border ${borderCls} ${bgCls} ${elevationCls} transition-colors duration-150`}
    >
      {/* Position badge */}
      <div className="flex w-9 shrink-0 items-center justify-center border-r border-ds-border">
        <span className={`font-mono text-[11px] font-bold ${numCls}`}>{position}</span>
      </div>

      {/* Label */}
      <div className="flex min-w-0 flex-1 items-center px-3 py-2">
        <span className={`font-mono text-[14px] leading-snug ${textCls}`}>{label}</span>
        {submitted && feedback === 'incorrect' && correctPosition !== undefined && (
          <span className="ml-auto shrink-0 pl-2 font-mono text-[9px] text-zinc-500">
            → #{correctPosition + 1}
          </span>
        )}
      </div>

      {/* Drag handle — full-height, right side */}
      {!submitted && (
        <div
          {...attributes}
          {...listeners}
          className="flex w-10 shrink-0 cursor-grab items-center justify-center touch-none border-l border-[#1f1f22] active:cursor-grabbing"
          aria-label={`Drag to reorder position ${position}`}
        >
          <GripDots className="text-zinc-600" />
        </div>
      )}
    </div>
  )
}

const TYPE_BADGE: Record<Card['type'], { labelKey: 'type_new' | 'type_learning' | 'type_review' | 'type_relearning'; cls: string }> = {
  new:        { labelKey: 'type_new',        cls: 'border-[--brand-secondary-25] bg-[--brand-secondary-08] text-[--brand-secondary]' },
  learning:   { labelKey: 'type_learning',   cls: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  review:     { labelKey: 'type_review',     cls: 'border-ds-border-strong bg-ds-panel text-ds-muted' },
  relearning: { labelKey: 'type_relearning', cls: 'border-rose-500/30 bg-rose-500/10 text-rose-300' },
}

const OrderingCard = memo(function OrderingCard({
  card, question, answer, flipped, onFlip, onEdit, onAnswerEvaluated, compact = false, originDeckName, inputLocked = false,
}: Props) {
  const { settings } = useSettings()
  const t = STRINGS[settings.language]
  const { isHandsetLandscape } = useHandsetLayout()
  const prefersReducedMotion = useReducedMotion()
  const badge = TYPE_BADGE[card.type]

  // Seeded statt Math.random: Reload/Resume darf die Ausgangsreihenfolge
  // der Sortier-Items nicht verändern.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shuffledItems = useMemo(() => seededShuffle(`${card.id}:${card.front}`, question.items), [card.id, card.front])
  const [order, setOrder]         = useState<string[]>(shuffledItems)
  const [activeId, setActiveId]   = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore]         = useState<number | null>(null)
  const submittedRef = useRef(false)
  const flipTimerRef = useRef<number | null>(null)
  const prevFlippedRef = useRef(false)

  useEffect(() => {
    submittedRef.current = false

    return () => {
      if (flipTimerRef.current !== null) {
        window.clearTimeout(flipTimerRef.current)
        flipTimerRef.current = null
      }
    }
  }, [card.id])

  // Manueller Flip auf die Rückseite verwirft den pending Auto-Flip —
  // sonst togglet der Timer die Karte zurück auf die Vorderseite.
  useEffect(() => {
    const was = prevFlippedRef.current
    prevFlippedRef.current = flipped
    if (flipped && !was && flipTimerRef.current !== null) {
      window.clearTimeout(flipTimerRef.current)
      flipTimerRef.current = null
    }
  }, [flipped])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { distance: 8 } }),
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (over && active.id !== over.id) {
      setOrder(prev => {
        const oldIdx = prev.indexOf(String(active.id))
        const newIdx = prev.indexOf(String(over.id))
        return arrayMove(prev, oldIdx, newIdx)
      })
    }
  }, [])

  const handleSubmit = useCallback(() => {
    if (submitted || submittedRef.current || inputLocked) return
    submittedRef.current = true
    const s = computeOrderingScore(order, answer.correctOrder, question.items)
    setScore(s)
    setSubmitted(true)
    onAnswerEvaluated(s, {
      selected: order.join(' → '),
      correct: answer.correctOrder.map(i => question.items[i]).join(' → '),
    })
    const delay = prefersReducedMotion ? 300 : (s === 1.0 ? 600 : 1200)
    if (flipTimerRef.current !== null) {
      window.clearTimeout(flipTimerRef.current)
    }
    flipTimerRef.current = window.setTimeout(() => {
      flipTimerRef.current = null
      onFlip()
    }, delay)
  }, [submitted, order, answer.correctOrder, question.items, inputLocked, onAnswerEvaluated, onFlip, prefersReducedMotion])

  const correctItems = useMemo(
    () => answer.correctOrder.map(i => question.items[i]),
    [answer.correctOrder, question.items]
  )

  const getFeedback = useCallback((idx: number): 'correct' | 'incorrect' => {
    return order[idx] === correctItems[idx] ? 'correct' : 'incorrect'
  }, [order, correctItems])

  const getCorrectPosition = useCallback((item: string): number => {
    return correctItems.indexOf(item)
  }, [correctItems])

  const scoreCount = score !== null ? Math.round(score * question.items.length) : 0
  const scoreLabel = t.ordering_score_label
    .replace('{count}', String(scoreCount))
    .replace('{total}', String(question.items.length))

  // Compact landscape: slightly smaller items
  void isHandsetLandscape

  const cardShellCls = `flex flex-col overflow-hidden rounded-ds border border-transparent bg-ds-card shadow-card card-gradient-border ${
    compact ? 'h-full min-h-0' : 'min-h-[280px] sm:min-h-[380px] md:min-h-[440px]'
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
          <div className="shrink-0 border-b border-ds-border px-[14px] py-[8px]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ds-muted">
                  {t.question}
                </span>
                <span className={`rounded-[3px] border px-1.5 py-px font-mono text-[8px] font-bold uppercase tracking-[0.14em] ${badge.cls}`}>
                  {t[badge.labelKey]}
                </span>
                <span className="rounded-[3px] border border-[--brand-secondary-25] bg-[--brand-secondary-08] px-1.5 py-px font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[--brand-secondary]">
                  {t.ordering_type_badge}
                </span>
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

          {/* Scrollable list */}
          <div className={`min-h-0 flex-1 overflow-y-auto no-scrollbar px-[12px] pt-[12px] overscroll-contain ${compact ? '' : 'pb-[12px]'}`}>
            {question.question && (
              <p className={`font-mono font-medium leading-[1.55] text-ds-fg ${compact ? 'text-[15px]' : 'text-[16px]'} mb-4`}>
                {question.question}
              </p>
            )}

            <DndContext
              autoScroll={false}
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={order} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-[6px]">
                  {order.map((item, idx) => (
                    <ItemRow
                      key={item}
                      id={item}
                      label={item}
                      position={idx + 1}
                      feedback={submitted ? getFeedback(idx) : 'none'}
                      correctPosition={submitted && getFeedback(idx) === 'incorrect' ? getCorrectPosition(item) : undefined}
                      submitted={submitted || inputLocked}
                    />
                  ))}
                </div>
              </SortableContext>

              {/* Floating card shown while dragging */}
              <DragOverlay dropAnimation={prefersReducedMotion ? null : { duration: 180, easing: 'ease' }}>
                {activeId ? (
                  <ItemRow
                    id={activeId}
                    label={activeId}
                    position={order.indexOf(activeId) + 1}
                    feedback="none"
                    submitted={false}
                    isDragOverlay
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>

          {/* Sticky confirm */}
          <div className="shrink-0 border-t border-ds-border px-[14px] py-[10px]">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleSubmit() }}
              disabled={submitted || inputLocked}
              className={`min-h-[44px] w-full rounded-ds border text-sm font-medium transition-all duration-200 ${
                submitted || inputLocked
                  ? 'border-zinc-700 bg-transparent text-zinc-600 cursor-default'
                  : 'border-[--brand-secondary-50] bg-[--brand-secondary-08] text-[--brand-secondary] hover:bg-[--brand-secondary-12] active:scale-[0.99]'
              }`}
            >
              {inputLocked && !submitted ? t.answer_revealed_locked : t.ordering_confirm_button}
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
        <div className="shrink-0 border-b border-ds-border px-[14px] py-[8px]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ds-muted">{t.answer}</span>
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
          {score !== null && (
            <div className={`mb-3 flex items-center gap-2 rounded-ds border px-3 py-2 ${
              score === 1.0
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : score >= 0.5
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
            }`}>
              <span className={`font-mono font-bold ${compact ? 'text-[13px]' : 'text-sm'}`}>{scoreLabel}</span>
            </div>
          )}

          {/* Korrekte Reihenfolge immer zeigen — das Vorderseiten-Feedback
              (→ #n) verschwindet nach dem Auto-Flip. */}
          {correctItems.length > 0 && (
            <div className="mb-3 flex flex-col gap-1.5">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-400">
                {t.correct_label}
              </span>
              {correctItems.map((item, idx) => (
                <div key={idx} className="flex items-baseline gap-2 rounded-ds border border-ds-border bg-ds-floor px-3 py-1.5">
                  <span className="shrink-0 font-mono text-[11px] font-bold text-emerald-400">#{idx + 1}</span>
                  <span className="font-mono text-[13px] leading-snug text-zinc-200">{item}</span>
                </div>
              ))}
            </div>
          )}

          <p className={`${compact ? 'text-[15px]' : 'text-[19px] md:text-[21px]'} font-mono font-medium leading-[1.55] text-ds-fg`}>
            {answer.explanation}
          </p>

          {answer.merkhilfe && (
            <div className={`${answer.explanation ? 'mt-3' : 'mt-0'} border-l-2 border-[--brand-primary-50] bg-[--brand-primary-08] px-[10px] py-[6px]`}>
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

export default OrderingCard
