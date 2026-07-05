/**
 * AI_CONTEXT: Reusable settings slider row; keeps range-control spacing and value alignment consistent.
 */
import type { ReactNode } from 'react'
import { UI_TOKENS } from '../constants/ui'

interface SettingsSliderRowProps {
  sectionLabel: ReactNode
  label: ReactNode
  valueLabel: ReactNode
  value: number
  min: number
  max: number
  step: number
  onValueChange: (value: number) => void
  help?: ReactNode
  ariaLabel?: string
  className?: string
}

export function SettingsSliderRow({
  sectionLabel,
  label,
  valueLabel,
  value,
  min,
  max,
  step,
  onValueChange,
  help,
  ariaLabel,
  className = '',
}: SettingsSliderRowProps) {
  return (
    <div className={className}>
      <label className="mb-3 block text-xs font-medium uppercase tracking-wide text-white/50">
        {sectionLabel}
      </label>
      <div className={`${UI_TOKENS.surface.panelSoft} space-y-3 p-4`}>
        <div className="flex min-w-0 items-center justify-between gap-3">
          <span className="min-w-0 text-xs text-white/70">{label}</span>
          <span className="shrink-0 text-xs tabular-nums text-white/60">{valueLabel}</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={event => onValueChange(Number(event.target.value))}
          className="w-full accent-white"
          aria-label={ariaLabel}
        />
        {help && <p className="text-xs text-white/45">{help}</p>}
      </div>
    </div>
  )
}
