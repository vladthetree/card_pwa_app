/**
 * AI_CONTEXT: Reusable settings switch row; keeps toggle spacing stable across compact mobile layouts.
 */
import type { ReactNode } from 'react'

interface SettingsSwitchRowProps {
  label: ReactNode
  description?: ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void | Promise<void>
  disabled?: boolean
  title?: string
  className?: string
  labelClassName?: string
  descriptionClassName?: string
}

export function SettingsSwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
  title,
  className = '',
  labelClassName = 'text-xs text-white/70',
  descriptionClassName = 'mt-1 text-[11px] leading-relaxed text-white/45',
}: SettingsSwitchRowProps) {
  return (
    <div className={`flex items-start justify-between gap-3 rounded-ds-xl border border-[#18181b] bg-[#0c0c0c] p-3 ${className}`.trim()}>
      <div className="min-w-0 flex-1 pr-1">
        <p className={labelClassName}>{label}</p>
        {description && (
          <p className={descriptionClassName} title={title}>
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => { void onCheckedChange(!checked) }}
        disabled={disabled}
        className={`relative mt-0.5 inline-flex h-7 w-12 min-w-[3rem] shrink-0 items-center rounded-full border p-[3px] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          checked
            ? 'border-emerald-400/40 bg-emerald-500/25'
            : 'border-white/20 bg-white/10'
        }`}
        aria-pressed={checked}
      >
        <span
          className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-[22px]' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
