/**
 * AI_CONTEXT: Labs React component/helper for lab Scenario View; supports scenario-based Security+ practice flows.
 */
import { useMemo, useState } from 'react'
import { ArrowLeft, Check, GripVertical, Shield, X } from 'lucide-react'
import { Reorder } from 'framer-motion'
import type { LabScenario, LabSingleInteraction, LabWorkflowInteraction } from '../../data/labScenarios'
import { computeDecisionScore, computeMatchingScore, computeOrderingScore } from '../../utils/pbqScoring'
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
    decisionPromptSingle: 'Wähle die richtige Option',
    decisionPromptMultiple: 'Wähle alle zutreffenden Optionen',
    select: '– auswählen –',
    check: 'Antwort prüfen',
    evidence: 'Beweismaterial',
    topology: 'Netzwerktopologie',
    solved: 'Geschafft! Szenario gelöst.',
    failed: 'Noch nicht richtig — korrigiere die markierten Stellen.',
    retry: 'Nochmal versuchen',
    back: 'Zurück',
    remediate: 'Objective vertiefen (Lerneinheiten)',
    workflowProgress: (current: number, total: number) => `Schritt ${current} von ${total}`,
    nextStep: 'Schritt korrekt — weiter zur nächsten Analyse.',
  },
  en: {
    matchPrompt: 'Match each element to its counterpart',
    orderPrompt: 'Drag the rules into the correct order',
    decisionPromptSingle: 'Choose the correct option',
    decisionPromptMultiple: 'Choose all options that apply',
    select: '– select –',
    check: 'Check answer',
    evidence: 'Evidence',
    topology: 'Network topology',
    solved: 'Done! Scenario solved.',
    failed: 'Not correct yet — fix the highlighted parts.',
    retry: 'Try again',
    back: 'Back',
    remediate: 'Deepen this objective (learning units)',
    workflowProgress: (current: number, total: number) => `Step ${current} of ${total}`,
    nextStep: 'Step correct — continue to the next analysis.',
  },
} as const

interface Props {
  language: 'de' | 'en'
  scenario: LabScenario
  onBack: () => void
  onSolved: (scenarioId: string) => void
  /** Jeder Lösungsversuch (auch fehlgeschlagene) mit Antworten und Score-Anteil
   *  0..1 — additive Instrumentierung für das Lerneinheiten-Versuchsprotokoll. */
  onCheck?: (detail: { scenarioId: string; score: number; answerByStepId: Record<string, unknown> }) => void
  /** Nach der Abgabe: Link zur normalen Remediation (Lerneinheiten-Screen, §13.2). */
  onRemediate?: () => void
}

const SECTION_LABEL = 'mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500'
const MONO_BOX = 'whitespace-pre-wrap rounded-ds-xl border border-[#1f1f23] bg-[#0c0c0c] px-3.5 py-3 font-mono text-[13px] leading-[1.6] text-zinc-200'

type SingleStepScenario = Omit<LabScenario, 'interaction'> & { interaction: LabSingleInteraction }
type WorkflowScenario = Omit<LabScenario, 'interaction'> & { interaction: LabWorkflowInteraction }

export default function LabScenarioView(props: Props) {
  if (props.scenario.interaction.type === 'workflow') {
    return <WorkflowLabScenarioView {...props} scenario={props.scenario as WorkflowScenario} />
  }
  return <SingleStepLabScenarioView {...props} scenario={props.scenario as SingleStepScenario} />
}

function WorkflowLabScenarioView({ language, scenario, onBack, onSolved, onCheck, onRemediate }: Omit<Props, 'scenario'> & { scenario: WorkflowScenario }) {
  const copy = COPY[language]
  const badge = LAB_DIFFICULTY_BADGE[scenario.difficulty]
  const steps = scenario.interaction.steps
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answerByStepId, setAnswerByStepId] = useState<Record<string, string[]>>({})
  const [result, setResult] = useState<'idle' | 'failed' | 'solved'>('idle')
  const current = steps[currentIndex]
  const selected = answerByStepId[current.stepId] ?? []

  const toggle = (optionId: string) => {
    if (result === 'solved') return
    if (result === 'failed') setResult('idle')
    const previous = answerByStepId[current.stepId] ?? []
    const next = current.interaction.selectionMode === 'single'
      ? [optionId]
      : previous.includes(optionId)
        ? previous.filter(id => id !== optionId)
        : [...previous, optionId]
    setAnswerByStepId(values => ({ ...values, [current.stepId]: next }))
  }

  const scoreAll = (answers: Record<string, string[]>) => steps.reduce(
    (sum, step) => sum + computeDecisionScore(answers[step.stepId] ?? [], step.interaction.correctIds),
    0,
  ) / steps.length

  const handleCheck = () => {
    if (selected.length === 0 || result === 'solved') return
    const stepScore = computeDecisionScore(selected, current.interaction.correctIds)
    const normalizedAnswers: Record<string, unknown> = Object.fromEntries(
      Object.entries(answerByStepId).map(([stepId, values]) => [stepId, [...values]]),
    )
    if (stepScore !== 1) {
      setResult('failed')
      onCheck?.({ scenarioId: scenario.id, score: scoreAll(answerByStepId), answerByStepId: normalizedAnswers })
      return
    }
    if (currentIndex < steps.length - 1) {
      setCurrentIndex(index => index + 1)
      setResult('idle')
      return
    }
    setResult('solved')
    onCheck?.({ scenarioId: scenario.id, score: 1, answerByStepId: normalizedAnswers })
    onSolved(scenario.id)
  }

  const retry = () => {
    setAnswerByStepId(values => ({ ...values, [current.stepId]: [] }))
    setResult('idle')
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
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

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" data-study-scroll="allow">
        <div className="mx-auto w-full max-w-5xl">
          <p className="font-mono text-[15px] leading-[1.6] text-ds-fg">{scenario.description}</p>
          {scenario.topology && <div className={`${MONO_BOX} mt-4`}>{scenario.topology}</div>}
          <div className="mt-5 flex items-center gap-2" aria-label={copy.workflowProgress(currentIndex + 1, steps.length)}>
            {steps.map((step, index) => (
              <span key={step.stepId} className={`h-1.5 flex-1 rounded-full ${index <= currentIndex ? 'bg-violet-400' : 'bg-[#27272a]'}`} />
            ))}
          </div>
          <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-violet-300">
            {copy.workflowProgress(currentIndex + 1, steps.length)} · {current.title}
          </div>
          {current.evidence && (
            <div className="mt-4">
              <p className={SECTION_LABEL}>{copy.evidence}</p>
              <div className={MONO_BOX}>{current.evidence}</div>
            </div>
          )}
          <p className="mt-5 font-mono text-[14px] leading-relaxed text-zinc-100">{current.prompt}</p>
          <p className={`${SECTION_LABEL} mt-5`}>
            {current.interaction.selectionMode === 'single' ? copy.decisionPromptSingle : copy.decisionPromptMultiple}
          </p>
          <div className="flex flex-col gap-2" role={current.interaction.selectionMode === 'single' ? 'radiogroup' : 'group'}>
            {current.interaction.options.map(option => {
              const picked = selected.includes(option.id)
              const correct = current.interaction.correctIds.includes(option.id)
              const showCorrect = result === 'failed' && correct
              const showWrong = result === 'failed' && picked && !correct
              return (
                <button
                  key={option.id}
                  type="button"
                  role={current.interaction.selectionMode === 'single' ? 'radio' : 'checkbox'}
                  aria-checked={picked}
                  disabled={result === 'solved'}
                  onClick={() => toggle(option.id)}
                  className={`flex items-start justify-between gap-2.5 rounded-ds-2xl border bg-[#0c0c0c] px-3.5 py-3 text-left transition-colors ${
                    showCorrect ? 'border-emerald-500/50' : showWrong ? 'border-rose-500/60' : picked ? 'border-[--brand-secondary-50]' : 'border-[#1f1f23]'
                  }`}
                >
                  <span className="min-w-0 flex-1 font-mono text-[14px] leading-snug text-zinc-100">{option.text}</span>
                  {showCorrect && <Check size={15} className="mt-0.5 shrink-0 text-emerald-400" />}
                  {showWrong && <X size={15} className="mt-0.5 shrink-0 text-rose-400" />}
                </button>
              )
            })}
          </div>
          {result === 'failed' && (
            <div className="mt-4 rounded-ds-xl border border-rose-500/40 bg-rose-500/8 px-3.5 py-3">
              <p className="font-mono text-[13px] text-rose-300">{copy.failed}</p>
              <button type="button" onClick={retry} className="mt-2 rounded-ds-lg border border-[#27272a] px-3 py-2 font-mono text-[12px] text-zinc-300">{copy.retry}</button>
            </div>
          )}
          {result === 'solved' && (
            <div className="mt-4 rounded-ds-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-3">
              <p className="flex items-center gap-2 font-mono text-[13px] text-emerald-300"><Check size={15} /> {copy.solved}</p>
              {onRemediate && <button type="button" onClick={onRemediate} className="mt-2 rounded-ds-lg border border-[#27272a] px-3 py-2 font-mono text-[12px] text-zinc-300">{copy.remediate}</button>}
            </div>
          )}
        </div>
      </div>
      <div className="shrink-0 border-t border-[#18181b] bg-[#050505] px-4 pb-safe-3 pt-3">
        <button
          type="button"
          data-testid="lab-check-answer"
          onClick={handleCheck}
          disabled={selected.length === 0 || result === 'solved'}
          className="min-h-[52px] w-full rounded-ds-2xl border border-violet-500/60 bg-violet-500/10 px-4 font-mono text-[15px] text-zinc-100 disabled:border-[#1f1f23] disabled:text-zinc-600"
        >
          {result === 'solved' ? copy.solved : copy.check}
        </button>
      </div>
    </div>
  )
}

function SingleStepLabScenarioView({ language, scenario, onBack, onSolved, onCheck, onRemediate }: Omit<Props, 'scenario'> & { scenario: SingleStepScenario }) {
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

  // Decision-Zustand: gewählte Options-IDs.
  const [decisionSelected, setDecisionSelected] = useState<string[]>([])

  const [result, setResult] = useState<'idle' | 'solved' | 'failed'>('idle')

  const allSelected = interaction.type === 'matching'
    ? interaction.items.every(item => Boolean(selections[item.left]))
    : interaction.type === 'decision'
    ? decisionSelected.length > 0
    : true

  const toggleDecisionOption = (optionId: string) => {
    if (result === 'solved') return
    if (result === 'failed') setResult('idle')
    if (interaction.type !== 'decision') return
    if (interaction.selectionMode === 'single') {
      setDecisionSelected([optionId])
      return
    }
    setDecisionSelected(prev => (
      prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId]
    ))
  }

  const handleCheck = () => {
    if (result === 'solved') return
    let score = 0
    if (interaction.type === 'matching') {
      score = computeMatchingScore(selections, interaction.items)
    } else if (interaction.type === 'ordering') {
      score = computeOrderingScore(order, interaction.correctOrder, interaction.steps)
    } else {
      score = computeDecisionScore(decisionSelected, interaction.correctIds)
    }
    onCheck?.({
      scenarioId: scenario.id,
      score,
      // 'step-1' = kanonische Schritt-ID des §13.2-Snapshots (labSnapshot.ts).
      answerByStepId: interaction.type === 'matching'
        ? { 'step-1': { ...selections } }
        : interaction.type === 'ordering'
        ? { 'step-1': [...order] }
        : { 'step-1': [...decisionSelected] },
    })
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
    if (interaction.type === 'decision') setDecisionSelected([])
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
        <div className="mx-auto w-full max-w-5xl">
          <p className="font-mono text-[15px] leading-[1.6] text-ds-fg">{scenario.description}</p>

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
            {interaction.type === 'matching'
              ? copy.matchPrompt
              : interaction.type === 'ordering'
              ? copy.orderPrompt
              : interaction.selectionMode === 'single'
              ? copy.decisionPromptSingle
              : copy.decisionPromptMultiple}
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

          {interaction.type === 'decision' && (
            <div className="flex flex-col gap-2" role={interaction.selectionMode === 'single' ? 'radiogroup' : 'group'}>
              {interaction.options.map(option => {
                const isPicked = decisionSelected.includes(option.id)
                const isCorrect = interaction.correctIds.includes(option.id)
                const highlight = result !== 'idle' && isPicked && isCorrect
                const missedCorrect = result !== 'idle' && !isPicked && isCorrect
                const wrongPick = result !== 'idle' && isPicked && !isCorrect
                const borderCls = highlight || missedCorrect
                  ? 'border-emerald-500/50'
                  : wrongPick
                  ? 'border-rose-500/60'
                  : isPicked
                  ? 'border-[--brand-secondary-50]'
                  : 'border-[#1f1f23]'
                return (
                  <button
                    key={option.id}
                    type="button"
                    role={interaction.selectionMode === 'single' ? 'radio' : 'checkbox'}
                    aria-checked={isPicked}
                    disabled={result === 'solved'}
                    onClick={() => toggleDecisionOption(option.id)}
                    className={`flex items-start justify-between gap-2.5 rounded-ds-2xl border ${borderCls} bg-[#0c0c0c] px-3.5 py-3 text-left transition-colors`}
                  >
                    <span className="min-w-0 flex-1 font-mono text-[14px] leading-snug text-zinc-100">{option.text}</span>
                    {highlight && <Check size={15} className="mt-0.5 shrink-0 text-emerald-400" strokeWidth={2} />}
                    {missedCorrect && <Check size={15} className="mt-0.5 shrink-0 text-emerald-400/50" strokeWidth={2} />}
                    {wrongPick && <X size={15} className="mt-0.5 shrink-0 text-rose-400" strokeWidth={2} />}
                  </button>
                )
              })}
            </div>
          )}

          {/* Ergebnis-Feedback (⚠️ neu generiert, kein Screenshot des gelösten Zustands) */}
          {result === 'solved' && (
            <div className="mt-4 rounded-ds-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-3">
              <p className="flex items-center gap-2 font-mono text-[13px] text-emerald-300">
                <Check size={15} strokeWidth={2} /> {copy.solved}
              </p>
              {onRemediate && (
                <button
                  type="button"
                  onClick={onRemediate}
                  className="mt-2 rounded-ds-lg border border-[#27272a] bg-[#0a0a0a] px-3 py-2 font-mono text-[12px] text-zinc-300 transition-colors hover:border-[#3f3f46] hover:text-white"
                >
                  {copy.remediate}
                </button>
              )}
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
