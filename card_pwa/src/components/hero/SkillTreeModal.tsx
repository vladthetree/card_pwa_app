/**
 * AI_CONTEXT: Skilltree-Dialog als senkrechte Schiene (Kern + Ast der aktiven Klasse), Touch-Ziele ≥ 44 px.
 * Punkte kommen aus Meilensteinen (utils/skillTree); alle Effekte sind Optik/Komfort. Belegen und Zurücknehmen
 * ist kostenlos und jederzeit möglich; abhängige Knoten werden mit zurückgenommen.
 */
import { useState } from 'react'
import { Dialog } from '../../ui/overlays/Dialog'
import { STRINGS } from '../../contexts/SettingsContext'
import { getHeroClass, type HeroClassId } from '../../data/heroClassCatalog'
import { getSkillIconUrl, getSkillNode, listBranchNodes, type SkillNodeDefinition } from '../../data/skillTreeCatalog'
import { buildAllocationWithout, canAllocateSkillNode } from '../../utils/skillTree'
import { buildHeroSkillContext } from '../../utils/heroSkills'
import { persistHeroSkillNodes } from '../../db/queries/heroLoadout'
import type { HeroSnapshot } from '../../db/queries/heroState'
import { formatTemplate } from '../../utils/formatTemplate'

interface Props {
  isOpen: boolean
  onClose: () => void
  snapshot: HeroSnapshot | null
  classId: HeroClassId
  language: 'de' | 'en'
  level: number
}

const KIND_SHAPE: Record<SkillNodeDefinition['kind'], string> = {
  small: 'rounded-full',
  notable: 'rotate-45 rounded-[6px]',
  keystone: '[clip-path:polygon(25%_5%,75%_5%,100%_50%,75%_95%,25%_95%,0_50%)]',
}

function depthOf(node: SkillNodeDefinition): number {
  let depth = 0
  let current: SkillNodeDefinition | undefined = node
  while (current?.requires) {
    depth += 1
    current = getSkillNode(current.requires)
  }
  return depth
}

export function SkillTreeModal({ isOpen, onClose, snapshot, classId, language, level }: Props) {
  const t = STRINGS[language]
  const [busy, setBusy] = useState(false)
  if (!isOpen) return null

  const classDefinition = getHeroClass(classId)
  const state = snapshot?.state
  const stored = snapshot?.loadout.skillNodeIds ?? []
  const context = state ? buildHeroSkillContext(state, stored, classDefinition.id, level) : null
  const activeIds = context?.resolved.activeIds ?? []
  const dormant = new Set(context?.resolved.dormantIds ?? [])
  const free = context?.resolved.pointsFree ?? 0
  const total = context?.resolved.pointsTotal ?? 0

  const allocate = async (nodeId: string) => {
    if (busy) return
    setBusy(true)
    await persistHeroSkillNodes([...stored.filter(id => id !== nodeId), nodeId])
    setBusy(false)
  }
  const remove = async (nodeId: string) => {
    if (busy) return
    setBusy(true)
    await persistHeroSkillNodes(buildAllocationWithout(stored, nodeId))
    setBusy(false)
  }

  const branches: Array<{ key: string; title: string; nodes: SkillNodeDefinition[] }> = [
    { key: 'core', title: t.hero_skills_core, nodes: listBranchNodes('core') },
    { key: classDefinition.id, title: t[classDefinition.nameKey], nodes: listBranchNodes(classDefinition.id) },
  ]

  return (
    <Dialog
      title={t.hero_skills_title}
      subtitle={formatTemplate(t.hero_skills_points, { free, total })}
      closeLabel={language === 'de' ? 'Skilltree schließen' : 'Close skill tree'}
      onClose={onClose}
      size="lg"
      className="max-h-[calc(100dvh-4rem)] overflow-y-auto p-4 sm:p-5"
    >
      <div className="space-y-4" data-testid="skill-tree">
        <p className="text-[11px] leading-relaxed text-white/50">{t.hero_skills_how}</p>
        {branches.map(branch => (
          <section key={branch.key} aria-label={branch.title}>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-white/50">{branch.title}</h3>
            <ul className="space-y-2">
              {branch.nodes.map(node => {
                const active = activeIds.includes(node.id)
                const isDormant = dormant.has(node.id)
                const allocatable = canAllocateSkillNode(node.id, classDefinition.id, activeIds, free)
                const prereq = node.requires ? getSkillNode(node.requires) : undefined
                const prereqMissing = Boolean(prereq) && !activeIds.includes(prereq?.id ?? '')
                const blockedText = active || allocatable
                  ? null
                  : prereqMissing
                    ? formatTemplate(t.hero_skills_needs, { name: prereq?.name[language] ?? '' })
                    : free < 1 ? t.hero_skills_no_points : null
                return (
                  <li
                    key={node.id}
                    data-testid={`skill-node-${node.id}`}
                    data-state={active ? 'active' : isDormant ? 'dormant' : allocatable ? 'available' : 'locked'}
                    style={{ marginLeft: `${depthOf(node) * 12}px` }}
                    className={`flex items-center gap-3 rounded-ds-xl border p-2.5 ${active ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-[#18181b] bg-[#0c0c0c]'}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-11 w-11 shrink-0 items-center justify-center border ${KIND_SHAPE[node.kind]} ${active ? 'border-emerald-300 bg-emerald-400/20' : allocatable ? 'border-amber-300/60 bg-amber-300/10' : 'border-[#27272a] bg-black/40 opacity-60'}`}
                    >
                      <img
                        src={getSkillIconUrl(node.icon)}
                        alt=""
                        width={28}
                        height={28}
                        draggable={false}
                        className={`h-7 w-7 object-contain [image-rendering:pixelated] ${node.kind === 'notable' ? '-rotate-45' : ''}`}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-zinc-100">
                        {node.name[language]}
                        <span className="ml-2 text-[10px] font-normal uppercase tracking-wide text-white/40">{t[`hero_skill_kind_${node.kind}`]}</span>
                      </p>
                      <p className="text-[11px] leading-snug text-white/55">{node.description[language]}</p>
                      {isDormant && <p className="text-[11px] text-amber-300">{t.hero_skills_dormant}</p>}
                      {blockedText && <p className="text-[11px] text-white/35">{blockedText}</p>}
                    </div>
                    {active ? (
                      <button
                        type="button"
                        onClick={() => { void remove(node.id) }}
                        disabled={busy}
                        className="min-h-11 shrink-0 rounded-ds border border-[#27272a] px-2.5 text-xs text-white/70"
                      >
                        {t.hero_skills_remove}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { void allocate(node.id) }}
                        disabled={!allocatable || busy}
                        className="min-h-11 shrink-0 rounded-ds border border-amber-300/40 bg-amber-300/10 px-2.5 text-xs font-semibold text-amber-200 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        {t.hero_skills_allocate}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </Dialog>
  )
}
