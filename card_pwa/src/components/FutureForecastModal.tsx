import { motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { UI_TOKENS } from '../constants/ui'

interface FutureForecastItem {
  dayStartMs: number
  count: number
}

interface Props {
  isOpen: boolean
  language: 'de' | 'en'
  loading: boolean
  forecast: FutureForecastItem[]
  onClose: () => void
}

export default function FutureForecastModal({
  isOpen,
  language,
  loading,
  forecast,
  onClose,
}: Props) {
  const prefersReducedMotion = useReducedMotion()

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={UI_TOKENS.modal.overlay}
    >
      <div className={UI_TOKENS.modal.backdrop} onClick={onClose} />
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: prefersReducedMotion ? 0.12 : 0.2, ease: 'easeOut' }}
        className={`${UI_TOKENS.modal.shell} max-w-3xl p-5 sm:p-6`}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className={UI_TOKENS.modal.title}>
              {language === 'de' ? 'Prognose: Naechste 15 Tage' : 'Forecast: Next 15 Days'}
            </h3>
            <p className={UI_TOKENS.modal.subtitle}>
              {language === 'de'
                ? 'Geplante Zukunftskarten pro Tag'
                : 'Scheduled future cards per day'}
            </p>
          </div>
          <button onClick={onClose} className={UI_TOKENS.modal.closeButton}>
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div
            className="h-56 rounded-xl border animate-pulse"
            style={{
              borderColor: 'var(--brand-primary-25)',
              background: 'linear-gradient(180deg, var(--brand-primary-12), rgba(0,0,0,0.28))',
            }}
          />
        ) : (
          <div
            className="rounded-xl border p-4"
            style={{
              borderColor: 'var(--brand-primary-25)',
              background: 'linear-gradient(180deg, var(--brand-primary-12), rgba(0,0,0,0.32))',
            }}
          >
            {(() => {
              const axisMax = 150
              const axisTicks = [0, 50, 100, 150]
              return (
                <div className="overflow-x-auto pb-1">
                  <div className="h-64 min-w-[38rem] sm:min-w-0 flex gap-3 pr-1">
                    <div
                      className="w-8 shrink-0 h-full flex flex-col justify-between text-[10px] font-mono leading-none py-1"
                      style={{ color: 'var(--brand-secondary-80)' }}
                    >
                      {[...axisTicks].reverse().map((tick) => (
                        <span key={tick} className="tabular-nums">{tick}</span>
                      ))}
                    </div>

                    <div className="relative flex-1 h-full min-w-0">
                      <div className="absolute inset-0 pointer-events-none">
                        {[...axisTicks].reverse().map((tick) => {
                          const top = 100 - (tick / axisMax) * 100
                          return (
                            <div
                              key={tick}
                              className="absolute left-0 right-0 border-t"
                              style={{ borderColor: 'var(--brand-primary-25)', top: `${top}%` }}
                            />
                          )
                        })}
                      </div>

                      <div className="relative h-full flex items-end gap-2">
                        {forecast.map((item) => {
                          const cappedCount = Math.min(item.count, axisMax)
                          const heightPercent = Math.round((cappedCount / axisMax) * 100)
                          const date = new Date(item.dayStartMs)
                          const label = date.toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
                            month: '2-digit',
                            day: '2-digit',
                          })

                          return (
                            <div key={item.dayStartMs} className="flex-1 min-w-0 h-full flex flex-col items-center gap-2">
                              <span className="text-[11px] font-mono tabular-nums" style={{ color: 'var(--brand-secondary)' }}>{item.count}</span>
                              <div className="w-full flex-1 min-h-[150px] flex items-end">
                                <div
                                  className="w-full rounded-t-md border"
                                  style={{
                                    height: `${heightPercent}%`,
                                    minHeight: item.count > 0 ? '10px' : '0px',
                                    background: 'linear-gradient(180deg, var(--brand-secondary-80), var(--brand-primary-50))',
                                    borderColor: 'var(--brand-primary)',
                                    boxShadow: item.count > 0 ? '0 0 0 1px var(--brand-primary-25), inset 0 0 0 1px rgba(255,255,255,0.04)' : 'none',
                                  }}
                                  title={`${label}: ${item.count}`}
                                />
                              </div>
                              <span className="text-[9px] font-mono" style={{ color: 'var(--brand-secondary-80)' }}>
                                {label}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
