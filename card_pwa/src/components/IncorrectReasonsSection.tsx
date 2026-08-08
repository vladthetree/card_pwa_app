/**
 * AI_CONTEXT:
 * Role: Shared MC reveal section mapping canonical option IDs to full option text and German/English rationale labels.
 * Used by: CardFace and DragMatchCard.
 * Important: Never display shuffled letters as stored identity; keys remain canonical while the learner sees option text.
 */
import { STRINGS, useSettings } from '../contexts/SettingsContext'
import type { Answer } from '../utils/cardTextParser'

interface Props {
  answer: Answer
  options: Record<string, string>
  selectedKey?: string | null
  compact?: boolean
}

export default function IncorrectReasonsSection({ answer, options, selectedKey, compact = false }: Props) {
  const { settings } = useSettings()
  const t = STRINGS[settings.language]
  const correctKeys = new Set(answer.correctOptions.length > 0
    ? answer.correctOptions
    : (answer.correct ? [answer.correct] : []))
  const entries = Object.entries(answer.incorrectReasons)
    .filter(([key, reason]) => !correctKeys.has(key) && Boolean(options[key]) && Boolean(reason.trim()))

  if (entries.length === 0 && !answer.nicht) return null

  return (
    <section
      className="mt-3 rounded-ds border border-rose-300/30 bg-rose-500/10 px-3 py-2.5"
      data-testid="incorrect-reasons"
    >
      <h3 className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-rose-300">
        {t.why_not}
      </h3>
      {entries.length > 0 ? (
        <div className="flex flex-col gap-2">
          {entries.map(([key, reason]) => {
            const selected = selectedKey === key
            return (
              <div
                key={key}
                className={`rounded-ds border px-2.5 py-2 ${selected
                  ? 'border-rose-400/60 bg-rose-500/15'
                  : 'border-ds-border bg-ds-floor/60'}`}
                data-selected-wrong-option={selected ? 'true' : undefined}
              >
                <div className={`${compact ? 'text-[11px]' : 'text-xs'} font-sans font-semibold text-zinc-100`}>
                  {options[key]}
                </div>
                <div className={`${compact ? 'text-[11px]' : 'text-xs'} mt-1 font-sans leading-relaxed text-zinc-300`}>
                  {reason}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-xs leading-relaxed text-white/85">{answer.nicht}</p>
      )}
    </section>
  )
}
