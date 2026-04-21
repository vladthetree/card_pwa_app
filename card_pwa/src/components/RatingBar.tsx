import { useReducedMotion } from 'framer-motion'
import { STRINGS, useSettings } from '../contexts/SettingsContext'
import { UI_TOKENS } from '../constants/ui'
import type { Rating } from '../types'

interface Props {
  onRate: (rating: Rating) => void
  disabled?: boolean
  maxRating?: Rating
  layout?: 'row' | 'grid'
  className?: string
}

const RATINGS: Array<{ key: Rating; colorKey: keyof typeof UI_TOKENS.rating; hotkey: string }> = [
  { key: 1, colorKey: 'again', hotkey: '1' },
  { key: 2, colorKey: 'hard',  hotkey: '2' },
  { key: 3, colorKey: 'good',  hotkey: '3' },
  { key: 4, colorKey: 'easy',  hotkey: '4' },
]

const HAPTICS: Record<Rating, number | number[]> = {
  1: [28, 55, 28],
  2: [24],
  3: 14,
  4: [8, 40, 8],
}

export default function RatingBar({ onRate, disabled = false, maxRating = 4, layout = 'row', className = '' }: Props) {
  const { settings } = useSettings()
  const t = STRINGS[settings.language]
  const prefersReducedMotion = useReducedMotion()

  const handleRate = (key: Rating) => {
    if (disabled) return
    if (typeof navigator.vibrate === 'function' && !prefersReducedMotion) {
      navigator.vibrate(HAPTICS[key] ?? 16)
    }
    onRate(key)
  }

  const labels: Record<Rating, string> = {
    1: t.rating_again,
    2: t.rating_hard,
    3: t.rating_good,
    4: t.rating_easy,
  }
  const lockedLabel = settings.language === 'de' ? 'Gesperrt' : 'Locked'

  const containerClass = layout === 'grid'
    ? 'grid h-full grid-cols-2 gap-2'
    : 'flex gap-1.5 sm:gap-2 overflow-x-auto pb-1'

  return (
    <div className={`${containerClass} ${className}`.trim()}>
      {RATINGS.map(({ key, colorKey, hotkey }) => {
        const locked = key > maxRating
        const isDisabled = disabled || locked

        return (
          <button
            key={key}
            onClick={() => handleRate(key)}
            disabled={isDisabled}
            aria-disabled={isDisabled}
            aria-label={locked ? `${labels[key]} (${lockedLabel})` : `${labels[key]} (${hotkey})`}
            title={disabled ? t.please_wait : locked ? lockedLabel : `${labels[key]} (${hotkey})`}
            className={`btn-rating group ${
              layout === 'grid' ? 'h-full min-h-[72px] px-3 py-4' : 'py-4 px-4 min-w-[120px] sm:min-w-0'
            } ${UI_TOKENS.rating[colorKey]} ${
              isDisabled ? 'opacity-45 cursor-not-allowed saturate-50' : 'cursor-pointer'
            } ${prefersReducedMotion || isDisabled ? '' : 'btn-rating-hover-scale active:scale-[0.98]'}`}
          >
            <span className="block font-sans font-bold text-sm tracking-wide leading-tight">{labels[key]}</span>
            <kbd className="block text-[10px] opacity-55 font-mono mt-1 leading-none not-italic group-hover:opacity-90 transition-opacity">
              {locked ? lockedLabel : hotkey}
            </kbd>
          </button>
        )
      })}
    </div>
  )
}
