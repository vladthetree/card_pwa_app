/**
 * AI_CONTEXT: Labs React component/helper for lab Scenario View; supports scenario-based Security+ practice flows.
 */
import { useMemo, useState } from 'react'
import { ArrowLeft, Check, GripVertical, Shield, X } from 'lucide-react'
import { Reorder } from 'framer-motion'
import type { LabScenario } from '../../data/labScenarios'
import { computeMatchingScore, computeOrderingScore } from '../../utils/pbqScoring'
import { LAB_DIFFICULTY_BADGE } from './labUi'

/**
 * Lab-Szenario-Detail, rekonstruiert aus den Handy-Screenshots vom 8. Juni 2026
 * (`…23.38.47/.57.jpeg` Matching per Dropdown, `…23.39.17/.49.jpeg` Ordering
 * per Drag): Beschreibung → BEWEISMATERIAL/NETZWERKTOPOLOGIE → Ziel-Callout →
 * Interaktion → fixer "Antwort prüfen"-Button. Scoring über die bestehenden
 * PBQ-Helfer (`utils/pbqScoring.ts`). Ergebnis-Feedback ist ⚠️ neu generiert
 * (kein Screenshot des gelösten Zustands vorhanden).
 */

const COPY = {
  de: {
    matchPrompt: 'Ordne jedem Element rechts das richtige Pendant zu',
    orderPrompt: 'Ziehe die Regeln in die richtige Reihenfolge',
    select: '– auswählen –',
    check: 'Antwort prüfen',
    evidence: 'Beweismaterial',
    topology: 'Netzwerktopologie',
    solved: 'Geschafft! Szenario gelöst.',
    failed: 'Noch nicht richtig — korrigiere die markierten Stellen.',
    retry: 'Nochmal versuchen',
    back: 'Zurück',
  },
  en: {
    matchPrompt: 'Match each element to its counterpart',
    orderPrompt: 'Drag the rules into the correct order',
    select: '– select –',
    check: 'Check answer',
    evidence: 'Evidence',
    topology: 'Network topology',
    solved: 'Done! Scenario solved.',
    failed: 'Not correct yet — fix the highlighted parts.',
    retry: 'Try again',
    back: 'Back',
  },
} as const

interface Props {
  language: 'de' | 'en'
  scenario: LabScenario
  onBack: () => void
  onSolved: (scenarioId: string) => void
}

const SECTION_LABEL = 'mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500'
const MONO_BOX = 'whitespace-pre-wrap rounded-ds-xl border border-[#1f1f23] bg-[#0c0c0c] px-3.5 py-3 font-mono text-[13px] leading-[1.6] text-zinc-200'

export default function LabScenarioView({ language, scenario, onBack, onSolved }: Props) {
  const copy = COPY[language]
  const badge = LAB_DIFFICULTY_BADGE[scenario.difficulty]
  const interaction = scenario.interaction

  // Matching-Zustand: links → gewählte Option. Optionen einmal pro Szenario mischen.
  const [selections, setSelections] = useState<Record<string, string>>({})
  const shuffledOptions = useMemo(() => {
    if (interaction.type !== 'matching') return []
    const out = [...interaction.options]
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = out[i]; out[i] = out[j]; out[j] = tmp
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.id])

  // Ordering-Zustand: aktuelle Reihenfolge (Strings aus `steps`).
  const [order, setOrder] = useState<string[]>(
    interaction.type === 'ordering' ? interaction.steps : [],
  )

  const [result, setResult] = useState<'idle' | 'solved' | 'failed'>('idle')

  const allSelected = interaction.type !== 'matching'
    || interaction.items.every(item => Boolean(selections[item.left]))

  const handleCheck = () => {
    if (result === 'solved') return
    let score = 0
    if (interaction.type === 'matching') {
      score = computeMatchingScore(selections, interaction.items)
    } else {
      score = computeOrderingScore(order, interaction.correctOrder, interaction.steps)
    }
    if (score === 1) {
      setResult('solved')
      onSolved(scenario.id)
    } else {
      setResult('failed')
    }
  }

  const handleRetry = () => {
    setResult('idle')
    if (interaction.type === 'matching') setSelections({})
  }

  const matchingFeedback = (left: string, right: string): 'none' | 'ok' | 'wrong' => {
    if (result === 'idle') return 'none'
    return selections[left] === right ? 'ok' : 'wrong'
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header: Zurück, Objective + Titel, Schwierigkeits-Badge */}
      <div className="shrink-0 border-b border-[#18181b] bg-[#050505] px-4 pb-3 pt-safe-2">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="ds-icon-button flex h-11 w-11 shrink-0" aria-label={copy.back}>
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              <Shield size={11} strokeWidth={1.5} />
              <span className="truncate">{scenario.objective}</span>
            </div>
            <div className="mt-0.5 truncate font-mono text-[17px] font-bold text-white">{scenario.title}</div>
          </div>
          <span className={`shrink-0 rounded-[6px] border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] ${badge.cls}`}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Inhalt */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" data-study-scroll="allow">
        <p className="font-mono text-[15px] leading-[1.6] text-[#f0ede8]">{scenario.description}</p>

        {scenario.evidence && (
          <div className="mt-4">
            <p className={SECTION_LABEL}>{copy.evidence}</p>
            <div className={MONO_BOX}>{scenario.evidence}</div>
          </div>
        )}

        {scenario.topology && (
          <div className="mt-4">
            <p className={SECTION_LABEL}>{copy.topology}</p>
            <div className={MONO_BOX}>{scenario.topology}</div>
          </div>
        )}

        {scenario.goal && (
          <div className="mt-4 rounded-ds-lg border-l-2 border-amber-400/80 bg-amber-500/8 px-3.5 py-3 font-mono text-[13px] leading-[1.6] text-amber-100/90">
            {scenario.goal}
          </div>
        )}

        {/* Interaktion */}
        <p className={`${SECTION_LABEL} mt-6`}>
          {interaction.type === 'matching' ? copy.matchPrompt : copy.orderPrompt}
        </p>

        {interaction.type === 'matching' && (
          <div className="flex flex-col gap-3">
            {interaction.items.map(item => {
              const feedback = matchingFeedback(item.left, item.right)
              const borderCls = feedback === 'ok'
                ? 'border-emerald-500/50'
                : feedback === 'wrong'
                ? 'border-rose-500/60'
                : 'border-[#1f1f23]'
              return (
                <div key={item.left} className={`rounded-ds-2xl border ${borderCls} bg-[#0c0c0c] px-3.5 py-3`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-mono text-[14px] leading-snug text-zinc-100">{item.left}</p>
                    {feedback === 'ok' && <Check size={15} className="mt-0.5 shrink-0 text-emerald-400" strokeWidth={2} />}
                    {feedback === 'wrong' && <X size={15} className="mt-0.5 shrink-0 text-rose-400" strokeWidth={2} />}
                  </div>
                  <select
                    value={selections[item.left] ?? ''}
                    disabled={result === 'solved'}
                    onChange={e => {
                      setSelections(prev => ({ ...prev, [item.left]: e.target.value }))
                      if (result === 'failed') setResult('idle')
                    }}
                    className="mt-2.5 w-full appearance-none rounded-ds-lg border border-[#27272a] bg-[#0a0a0a] px-3 py-2.5 font-mono text-[14px] text-zinc-200 outline-none focus:border-[#3f3f46]"
                  >
                    <option value="">{copy.select}</option>
                    {shuffledOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
        )}

        {interaction.type === 'ordering' && (
          <Reorder.Group axis="y" values={order} onReorder={(next) => { setOrder(next); if (result === 'failed') setResult('idle') }} className="flex flex-col gap-3">
            {order.map((step, index) => {
              const correctStep = interaction.steps[interaction.correctOrder[index]]
              const feedback = result === 'idle' ? 'none' : (step === correctStep ? 'ok' : 'wrong')
              const borderCls = feedback === 'ok'
                ? 'border-emerald-500/50'
                : feedback === 'wrong'
                ? 'border-rose-500/60'
                : 'border-[#1f1f23]'
              return (
                <Reorder.Item
                  key={step}
                  value={step}
                  drag={result === 'solved' ? false : 'y'}
                  className={`flex items-stretch rounded-ds-2xl border ${borderCls} bg-[#0c0c0c]`}
                >
                  <div className="flex w-10 shrink-0 items-center justify-center border-r border-[#1f1f23]">
                    <span className="font-mono text-[13px] text-zinc-500">{index + 1}</span>
                  </div>
                  <div className="flex min-w-0 flex-1 items-center px-3 py-3">
                    <span className="font-mono text-[13.5px] leading-snug text-zinc-100">{step}</span>
                  </div>
                  <div className="flex w-10 shrink-0 cursor-grab touch-none items-center justify-center text-zinc-600 active:cursor-grabbing">
                    <GripVertical size={16} strokeWidth={1.5} />
                  </div>
                </Reorder.Item>
              )
            })}
          </Reorder.Group>
        )}

        {/* Ergebnis-Feedback (⚠️ neu generiert, kein Screenshot des gelösten Zustands) */}
        {result === 'solved' && (
          <div className="mt-4 flex items-center gap-2 rounded-ds-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-3 font-mono text-[13px] text-emerald-300">
            <Check size={15} strokeWidth={2} /> {copy.solved}
          </div>
        )}
        {result === 'failed' && (
          <div className="mt-4 rounded-ds-xl border border-rose-500/40 bg-rose-500/8 px-3.5 py-3">
            <p className="font-mono text-[13px] text-rose-300">{copy.failed}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-2 rounded-ds-lg border border-[#27272a] bg-[#0a0a0a] px-3 py-2 font-mono text-[12px] text-zinc-300 transition-colors hover:border-[#3f3f46] hover:text-white"
            >
              {copy.retry}
            </button>
          </div>
        )}
      </div>

      {/* Fixe Aktionsleiste: "Antwort prüfen" */}
      <div className="shrink-0 border-t border-[#18181b] bg-[#050505] px-4 pb-safe-3 pt-3">
        <button
          type="button"
          data-testid="lab-check-answer"
          onClick={handleCheck}
          disabled={!allSelected || result === 'solved'}
          className={`w-full min-h-[52px] rounded-ds-2xl border px-4 font-mono text-[15px] transition-all duration-150 ${
            result === 'solved'
              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
              : allSelected
              ? 'border-violet-500/60 bg-violet-500/10 text-zinc-100 hover:bg-violet-500/20 active:scale-[0.99]'
              : 'border-[#1f1f23] bg-[#0c0c0c] text-zinc-600'
          }`}
        >
          {result === 'solved' ? copy.solved : copy.check}
        </button>
      </div>
    </div>
  )
}
