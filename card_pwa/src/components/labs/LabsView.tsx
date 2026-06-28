/**
 * AI_CONTEXT: Labs React component/helper for labs View; supports scenario-based Security+ practice flows.
 */
import { useMemo, useState } from 'react'
import { ArrowLeft, Check, ChevronDown, ChevronRight, Compass, Dices, Target } from 'lucide-react'
import { LAB_CATEGORIES, LAB_SCENARIOS, LAB_TARGET_INVENTORY, type LabScenario } from '../../data/labScenarios'
import { readCompletedLabs, persistCompletedLab } from '../../utils/labProgress'
import { generateFreshLab, type GeneratedLab } from '../../utils/labGenerator'
import { readTrainingSolved, persistTrainingSolved } from '../../utils/labTraining'
import { LAB_DIFFICULTY_BADGE } from './labUi'
import LabScenarioView from './LabScenarioView'

/**
 * Labs — Liste "Interaktive Sicherheits-Szenarien", rekonstruiert aus dem
 * Handy-Screenshot vom 8. Juni 2026 (`…23.38.26.jpeg`): Header mit
 * Fortschritts-Pill ("4 / 71"), aufklappbare Kategorien mit
 * "n/m SZENARIEN"-Zähler, Szenario-Zeilen mit Schwierigkeits-Badge,
 * Dauer + Objective und GESCHAFFT-Status.
 */

const COPY = {
  de: {
    title: 'Labs', subtitle: 'Interaktive Sicherheits-Szenarien', scenarios: 'Szenarien', done: 'GESCHAFFT', min: 'Min', back: 'Zurück',
    training: 'Übungs-Lab generieren', trainingHint: 'Zufällig aus dem Themen-Pool — zählt extra',
  },
  en: {
    title: 'Labs', subtitle: 'Interactive security scenarios', scenarios: 'Scenarios', done: 'DONE', min: 'min', back: 'Back',
    training: 'Generate practice lab', trainingHint: 'Random from the topic pool — counted separately',
  },
} as const

interface Props {
  language: 'de' | 'en'
  onExit: () => void
}

export default function LabsView({ language, onExit }: Props) {
  const copy = COPY[language]
  const [completed, setCompleted] = useState<Set<string>>(() => readCompletedLabs())
  const [trainingSolved, setTrainingSolved] = useState<Set<string>>(() => readTrainingSolved())
  const [activeScenario, setActiveScenario] = useState<LabScenario | null>(null)
  const [activeTraining, setActiveTraining] = useState<GeneratedLab | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const totalInventory = Math.max(LAB_TARGET_INVENTORY, LAB_SCENARIOS.length)
  const byCategory = useMemo(() => {
    const map = new Map<string, LabScenario[]>()
    for (const category of LAB_CATEGORIES) map.set(category.id, [])
    for (const scenario of LAB_SCENARIOS) map.get(scenario.categoryId)?.push(scenario)
    return map
  }, [])

  const handleSolved = (scenarioId: string) => {
    setCompleted(persistCompletedLab(scenarioId))
  }

  const startTraining = (categoryId: string) => {
    const generated = generateFreshLab(categoryId, trainingSolved)
    if (generated) setActiveTraining(generated)
  }

  const handleTrainingSolved = (generated: GeneratedLab) => {
    setTrainingSolved(persistTrainingSolved(generated.signature))
  }

  const toggleCategory = (categoryId: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  if (activeTraining) {
    return (
      <LabScenarioView
        language={language}
        scenario={activeTraining.scenario}
        onBack={() => setActiveTraining(null)}
        onSolved={() => handleTrainingSolved(activeTraining)}
      />
    )
  }

  if (activeScenario) {
    return (
      <LabScenarioView
        language={language}
        scenario={activeScenario}
        onBack={() => setActiveScenario(null)}
        onSolved={handleSolved}
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-[#18181b] bg-[#050505] px-4 pb-3 pt-safe-2">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onExit} className="ds-icon-button flex h-11 w-11 shrink-0" aria-label={copy.back}>
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[22px] font-bold leading-tight text-white">{copy.title}</div>
            <div className="truncate font-mono text-[12px] text-zinc-500">{copy.subtitle}</div>
          </div>
          {trainingSolved.size > 0 && (
            <span
              data-testid="labs-training-progress"
              className="flex shrink-0 items-center gap-1.5 rounded-[10px] border border-blue-500/30 bg-blue-500/10 px-2.5 py-1.5 font-mono text-[12px] font-bold text-blue-300"
            >
              <Dices size={13} strokeWidth={1.5} />
              {trainingSolved.size}
            </span>
          )}
          <span
            data-testid="labs-progress"
            className="flex shrink-0 items-center gap-1.5 rounded-[10px] border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 font-mono text-[12px] font-bold text-emerald-300"
          >
            <Target size={13} strokeWidth={1.5} />
            {completed.size} / {totalInventory}
          </span>
        </div>
      </div>

      {/* Kategorien */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3" data-study-scroll="allow">
        <div className="flex flex-col gap-3">
          {LAB_CATEGORIES.map(category => {
            const scenarios = byCategory.get(category.id) ?? []
            if (scenarios.length === 0) return null
            const doneCount = scenarios.filter(s => completed.has(s.id)).length
            const isCollapsed = collapsed.has(category.id)
            return (
              <section key={category.id} className="rounded-[14px] border border-[#18181b] bg-[#0a0a0a] p-3">
                <button
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className="flex w-full items-center gap-3 text-left"
                  aria-expanded={!isCollapsed}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border border-[#1f1f23] bg-[#0c0c0c] text-zinc-400">
                    <Compass size={18} strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate font-mono text-[16px] font-bold text-white">{category.title}</span>
                      <span className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-400">
                        {doneCount}/{scenarios.length} {copy.scenarios}
                      </span>
                    </span>
                    <span className="block truncate font-mono text-[12px] text-zinc-500">{category.subtitle}</span>
                  </span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-zinc-500 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                  />
                </button>

                {!isCollapsed && (
                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      data-testid={`lab-training-${category.id}`}
                      onClick={() => startTraining(category.id)}
                      className="flex w-full items-center gap-3 rounded-[12px] border border-dashed border-[--brand-primary-50] bg-[--brand-primary-08] px-3 py-3 text-left transition-colors hover:border-[--brand-primary]"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-[--brand-primary-25] bg-[#0c0c0c] text-[--brand-primary]">
                        <Dices size={15} strokeWidth={1.5} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-[13px] text-zinc-100">{copy.training}</span>
                        <span className="mt-0.5 block truncate font-mono text-[10px] text-zinc-500">{copy.trainingHint}</span>
                      </span>
                      <ChevronRight size={15} className="shrink-0 text-zinc-600" />
                    </button>
                    {scenarios.map(scenario => {
                      const badge = LAB_DIFFICULTY_BADGE[scenario.difficulty]
                      const isDone = completed.has(scenario.id)
                      return (
                        <button
                          key={scenario.id}
                          type="button"
                          data-testid={`lab-scenario-${scenario.id}`}
                          onClick={() => setActiveScenario(scenario)}
                          className="flex w-full items-center gap-3 rounded-[12px] border border-[#1f1f23] bg-[#0c0c0c] px-3 py-3 text-left transition-colors hover:border-[#3f3f46]"
                        >
                          <span className={`shrink-0 rounded-[6px] border px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.14em] ${badge.cls}`}>
                            {badge.label}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-mono text-[14px] text-zinc-100">{scenario.title}</span>
                            <span className="mt-0.5 block truncate font-mono text-[11px] text-zinc-500">
                              {scenario.minutes} {copy.min} · {scenario.objective}
                            </span>
                          </span>
                          {isDone && (
                            <span className="flex shrink-0 items-center gap-1 rounded-[8px] border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-300">
                              <Check size={11} strokeWidth={2} /> {copy.done}
                            </span>
                          )}
                          <ChevronRight size={15} className="shrink-0 text-zinc-600" />
                        </button>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
