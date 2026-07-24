/**
 * AI_CONTEXT: Labs React component/helper for labs View; supports scenario-based Security+ practice flows.
 */
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, ChevronDown, ChevronRight, Compass, Target } from 'lucide-react'
import { LAB_CATEGORIES, LAB_SCENARIOS, LAB_TARGET_INVENTORY, type LabScenario } from '../../data/labScenarios'
import { getDeckSuccessRates } from '../../db/queries'
import { getSecurityObjectiveDeckId, SY0_701_OBJECTIVES } from '../../utils/securityDeckHierarchy'
import { readCompletedLabs, persistCompletedLab } from '../../utils/labProgress'
import { LAB_DIFFICULTY_BADGE } from './labUi'
import LabScenarioView from './LabScenarioView'
import { useSettings } from '../../contexts/SettingsContext'
import { profileScopeId } from '../../services/profileService'
import { recordLabCheck, startOrResumeLabUnit } from '../../services/learningUnitRunner'

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
    recommended: 'Empfohlen für dich',
    recommendedReason: 'Schwächstes Objective: {objective} · {rate} % Quote im Deck',
  },
  en: {
    title: 'Labs', subtitle: 'Interactive security scenarios', scenarios: 'Scenarios', done: 'DONE', min: 'min', back: 'Back',
    recommended: 'Recommended for you',
    recommendedReason: 'Weakest objective: {objective} · {rate}% deck rate',
  },
} as const

interface Props {
  language: 'de' | 'en'
  /** Nur im Vollbild-Modus (mit eigenem Zurück-Pfeil) nötig. */
  onExit?: () => void
  /** Deep Link aus dem Lerneinheiten-Modus: Szenario direkt öffnen. */
  initialScenarioId?: string
  /** Zurück aus dem deep-verlinkten Szenario: zum Aufrufer (Lerneinheiten-
   *  Modus) statt in die Labs-Liste. */
  onBackFromInitialScenario?: () => void
  /** Remediation nach der Abgabe: zurück in den Lerneinheiten-Modus (§13.2). */
  onOpenLearningUnits?: () => void
  /** Als Home-Modus unter der Homebar gerendert: Header ohne Zurück-Pfeil
   *  (Nutzerentscheidung 2026-07-19). */
  embedded?: boolean
}

export default function LabsView({ language, onExit, initialScenarioId, onBackFromInitialScenario, onOpenLearningUnits, embedded = false }: Props) {
  const copy = COPY[language]
  const { profile, isProfileHydrated } = useSettings()
  const labProfileId = isProfileHydrated ? profileScopeId(profile) : null
  const [completed, setCompleted] = useState<Set<string>>(() => readCompletedLabs())
  const [activeScenario, setActiveScenario] = useState<LabScenario | null>(
    () => LAB_SCENARIOS.find(scenario => scenario.id === initialScenarioId) ?? null,
  )
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const totalInventory = Math.max(LAB_TARGET_INVENTORY, LAB_SCENARIOS.length)

  // Transfer-Kopplung: Labs zum schwächsten Objective (Deck-Quote) vorschlagen,
  // statt die Auswahl allein dem Zufall/der Neugier zu überlassen. Nur bei
  // belastbarer Datenlage (≥ 10 Reviews) und echter Schwäche (< 80 %).
  const [weakSpot, setWeakSpot] = useState<{ code: string; rate: number; labs: LabScenario[] } | null>(null)
  useEffect(() => {
    let cancelled = false
    const deckIds = SY0_701_OBJECTIVES.map(objective => getSecurityObjectiveDeckId(objective.code))
    void getDeckSuccessRates(deckIds).then(rates => {
      if (cancelled) return
      const ranked = SY0_701_OBJECTIVES
        .map(objective => ({ code: objective.code, stats: rates[getSecurityObjectiveDeckId(objective.code)] }))
        .filter(entry => entry.stats && entry.stats.total >= 10 && entry.stats.rate < 80)
        .sort((a, b) => a.stats.rate - b.stats.rate)
      for (const entry of ranked) {
        const labs = LAB_SCENARIOS.filter(scenario => scenario.objective.startsWith(`${entry.code} `))
        if (labs.length > 0) {
          setWeakSpot({ code: entry.code, rate: entry.stats.rate, labs })
          return
        }
      }
      setWeakSpot(null)
    }).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  const byCategory = useMemo(() => {
    const map = new Map<string, LabScenario[]>()
    for (const category of LAB_CATEGORIES) map.set(category.id, [])
    for (const scenario of LAB_SCENARIOS) map.get(scenario.categoryId)?.push(scenario)
    return map
  }, [])

  const handleSolved = (scenarioId: string) => {
    setCompleted(persistCompletedLab(scenarioId))
  }

  // Lerneinheiten-Instrumentierung (additiv, §13.2): Öffnen eines Registry-
  // Szenarios startet/fortsetzt den eingefrorenen Labversuch samt Lab-Unit;
  // Trainings-Labs (generiert) bleiben bewusst außen vor.
  useEffect(() => {
    if (!activeScenario || labProfileId === null) return
    void startOrResumeLabUnit({
      profileId: labProfileId,
      scenario: activeScenario,
      language,
    }).catch(error => console.error('[LabsView] Lab-Unit-Start fehlgeschlagen', error))
  }, [activeScenario, labProfileId, language])

  const handleScenarioCheck = (detail: { scenarioId: string; score: number; answerByStepId: Record<string, unknown> }) => {
    if (labProfileId === null) return
    void recordLabCheck({
      profileId: labProfileId,
      scenarioId: detail.scenarioId,
      answerByStepId: detail.answerByStepId,
      score: detail.score,
    }).catch(error => console.error('[LabsView] Lab-Versuch speichern fehlgeschlagen', error))
  }

  const toggleCategory = (categoryId: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  if (activeScenario) {
    return (
      <LabScenarioView
        language={language}
        scenario={activeScenario}
        onBack={() => {
          // Deep-Link aus dem Lerneinheiten-Screen: Zurück führt dorthin,
          // nicht in die Labs-Liste. Selbst gewählte Szenarien bleiben normal.
          if (onBackFromInitialScenario && activeScenario.id === initialScenarioId) {
            onBackFromInitialScenario()
            return
          }
          setActiveScenario(null)
        }}
        onSolved={handleSolved}
        onCheck={handleScenarioCheck}
        onRemediate={onOpenLearningUnits}
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-[#18181b] bg-[#050505] px-4 pb-3 pt-safe-2">
        <div className="flex items-center gap-3">
          {!embedded && (
            <button type="button" onClick={onExit} className="ds-icon-button flex h-11 w-11 shrink-0" aria-label={copy.back}>
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[22px] font-bold leading-tight text-white">{copy.title}</div>
            <div className="truncate font-mono text-[12px] text-zinc-500">{copy.subtitle}</div>
          </div>
          <span
            data-testid="labs-progress"
            className="flex shrink-0 items-center gap-1.5 rounded-ds-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 font-mono text-[12px] font-bold text-emerald-300"
          >
            <Target size={13} strokeWidth={1.5} />
            {completed.size} / {totalInventory}
          </span>
        </div>
      </div>

      {/* Kategorien */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3" data-study-scroll="allow">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
          {weakSpot && (() => {
            const unsolved = weakSpot.labs.filter(lab => !completed.has(lab.id))
            const picks = (unsolved.length > 0 ? unsolved : weakSpot.labs).slice(0, 2)
            return (
              <section data-testid="labs-recommended" className="rounded-ds-2xl border border-amber-400/25 bg-amber-400/[0.04] p-3">
                <div className="flex items-center gap-2 px-1">
                  <Compass size={14} strokeWidth={1.5} className="shrink-0 text-amber-300" />
                  <span className="font-mono text-[12px] font-bold text-amber-200">{copy.recommended}</span>
                  <span className="min-w-0 flex-1 truncate text-right font-mono text-[10px] text-zinc-500">
                    {copy.recommendedReason
                      .replace('{objective}', weakSpot.code)
                      .replace('{rate}', String(weakSpot.rate))}
                  </span>
                </div>
                <div className="mt-2.5 flex flex-col gap-2">
                  {picks.map(scenario => {
                    const badge = LAB_DIFFICULTY_BADGE[scenario.difficulty]
                    return (
                      <button
                        key={scenario.id}
                        type="button"
                        data-testid={`lab-recommended-${scenario.id}`}
                        onClick={() => setActiveScenario(scenario)}
                        className="flex w-full items-center gap-3 rounded-ds-xl border border-[#1f1f23] bg-[#0c0c0c] px-3 py-3 text-left transition-colors hover:border-amber-400/50"
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
                        <ChevronRight size={15} className="shrink-0 text-zinc-600" />
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })()}

          {LAB_CATEGORIES.map(category => {
            const scenarios = byCategory.get(category.id) ?? []
            if (scenarios.length === 0) return null
            const doneCount = scenarios.filter(s => completed.has(s.id)).length
            const isCollapsed = collapsed.has(category.id)
            return (
              <section key={category.id} className="rounded-ds-2xl border border-[#18181b] bg-[#0a0a0a] p-3">
                <button
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className="flex w-full items-center gap-3 text-left"
                  aria-expanded={!isCollapsed}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-ds-xl border border-[#1f1f23] bg-[#0c0c0c] text-zinc-400">
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
                    {scenarios.map(scenario => {
                      const badge = LAB_DIFFICULTY_BADGE[scenario.difficulty]
                      const isDone = completed.has(scenario.id)
                      return (
                        <button
                          key={scenario.id}
                          type="button"
                          data-testid={`lab-scenario-${scenario.id}`}
                          onClick={() => setActiveScenario(scenario)}
                          className="flex w-full items-center gap-3 rounded-ds-xl border border-[#1f1f23] bg-[#0c0c0c] px-3 py-3 text-left transition-colors hover:border-[#3f3f46]"
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
                            <span className="flex shrink-0 items-center gap-1 rounded-ds border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-300">
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
