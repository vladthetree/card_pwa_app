/**
 * AI_CONTEXT: Shared chrome for the card-type renderers (CardFace, OrderingCard,
 * MatchingCard, DragMatchCard, FreeRecallCard) — type badge, origin-deck badge,
 * and the card shell/body class builders they all use.
 */
import type { Card } from '../types'

export const TYPE_BADGE: Record<Card['type'], { labelKey: 'type_new' | 'type_learning' | 'type_review' | 'type_relearning'; cls: string }> = {
  new:        { labelKey: 'type_new',        cls: 'border-[--brand-secondary-25] bg-[--brand-secondary-08] text-[--brand-secondary]' },
  learning:   { labelKey: 'type_learning',   cls: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  review:     { labelKey: 'type_review',     cls: 'border-ds-border-strong bg-ds-panel text-ds-muted' },
  relearning: { labelKey: 'type_relearning', cls: 'border-rose-500/30 bg-rose-500/10 text-rose-300' },
}

export function OriginBadge({ deckName }: { deckName?: string }) {
  if (!deckName) return null
  return (
    <span className="max-w-[160px] truncate rounded-[3px] border border-[--brand-secondary-25] bg-[--brand-secondary-12] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[--brand-secondary]">
      {deckName}
    </span>
  )
}

export function getCardShellClass(compact: boolean, toneClass: string, extraBeforeSize = '', extraAfterSize = ''): string {
  const sizeClass = compact ? 'h-full min-h-0' : 'min-h-[280px] sm:min-h-[380px] md:min-h-[440px]'
  return `border ${toneClass} flex flex-col overflow-hidden rounded-ds bg-ds-card shadow-card${extraBeforeSize ? ` ${extraBeforeSize}` : ''} ${sizeClass}${extraAfterSize}`
}

export function getCardBodyClass(compact: boolean): string {
  return compact
    ? 'min-h-0 flex-1 overflow-y-auto px-[14px] py-[16px] no-scrollbar'
    : 'flex-1 overflow-y-auto no-scrollbar px-6 py-6 md:px-8 md:py-8'
}
