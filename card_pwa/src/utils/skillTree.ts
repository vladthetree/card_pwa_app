/**
 * AI_CONTEXT: Reine Skilltree-Logik: Skillpunkte aus Meilensteinen, gültige Belegung, aktive Effekte.
 * Punkte werden nie gezählt (Klicks/Reviews), sondern aus Kartenstand und Lerntagen NEU abgeleitet:
 * Undo oder Sync-Lag lassen überzählige Knoten von der Spitze her ruhen, ohne sie zu löschen.
 */
import {
  getSkillNode,
  SKILL_NODES,
  type SkillEffectId,
  type SkillNodeDefinition,
} from '../data/skillTreeCatalog'
import type { HeroClassId } from '../data/heroClassCatalog'

export interface SkillMilestoneInput {
  level: number
  /** Lerntage mit mindestens einem zahlenden (fälligen) Abruf. */
  studyDays: number
  /** Reife Karten je Domäne 1–5. */
  matureByDomain: readonly number[]
  healedLapses: number
}

export interface SkillMilestone {
  id: string
  reached: boolean
}

const LEVEL_MILESTONES = [7, 12, 20, 30] as const
const STUDY_DAY_MILESTONES = [10, 30, 60, 120, 240] as const
const DOMAIN_MATURE_MILESTONE = 15
const HEALED_MILESTONES = [5, 15, 30] as const

export function buildSkillMilestones(input: SkillMilestoneInput): SkillMilestone[] {
  const milestones: SkillMilestone[] = []
  for (const level of LEVEL_MILESTONES) milestones.push({ id: `level-${level}`, reached: input.level >= level })
  for (const days of STUDY_DAY_MILESTONES) milestones.push({ id: `days-${days}`, reached: input.studyDays >= days })
  input.matureByDomain.forEach((mature, index) => {
    milestones.push({ id: `domain-${index + 1}`, reached: mature >= DOMAIN_MATURE_MILESTONE })
  })
  for (const healed of HEALED_MILESTONES) milestones.push({ id: `healed-${healed}`, reached: input.healedLapses >= healed })
  return milestones
}

export function countSkillPoints(milestones: readonly SkillMilestone[]): number {
  return milestones.filter(milestone => milestone.reached).length
}

export const MAX_SKILL_POINTS = LEVEL_MILESTONES.length + STUDY_DAY_MILESTONES.length + 5 + HEALED_MILESTONES.length

export interface ResolvedSkillTree {
  /** Belegte und zurzeit wirksame Knoten (aktiver Ast + Kern, innerhalb der verfügbaren Punkte). */
  activeIds: string[]
  /** Gespeichert, aber ruhend (anderer Klassenast oder Punkte reichen gerade nicht). */
  dormantIds: string[]
  pointsTotal: number
  pointsSpent: number
  pointsFree: number
}

/** Ein Knoten ist belegbar, wenn er zum Kern oder zur aktiven Klasse gehört und sein Vorgänger aktiv ist. */
export function canAllocateSkillNode(
  nodeId: string,
  classId: HeroClassId,
  activeIds: readonly string[],
  pointsFree: number,
): boolean {
  const definition = getSkillNode(nodeId)
  if (!definition || pointsFree < 1) return false
  if (activeIds.includes(nodeId)) return false
  if (definition.branch !== 'core' && definition.branch !== classId) return false
  return definition.requires === null || activeIds.includes(definition.requires)
}

export function buildResolvedSkillTree(
  allocatedIds: readonly string[],
  classId: HeroClassId,
  pointsTotal: number,
): ResolvedSkillTree {
  const unique = [...new Set(allocatedIds)].filter(id => getSkillNode(id))
  const usable = unique.filter(id => {
    const branch = (getSkillNode(id) as SkillNodeDefinition).branch
    return branch === 'core' || branch === classId
  })
  const activeIds: string[] = []
  for (const id of usable) {
    const definition = getSkillNode(id) as SkillNodeDefinition
    // Vorgänger müssen vor dem Knoten belegt (und wirksam) sein; Punkte begrenzen von der Spitze her.
    if (activeIds.length >= pointsTotal) break
    if (definition.requires === null || activeIds.includes(definition.requires)) activeIds.push(id)
  }
  const activeSet = new Set(activeIds)
  const dormantIds = unique.filter(id => !activeSet.has(id))
  return {
    activeIds,
    dormantIds,
    pointsTotal,
    pointsSpent: activeIds.length,
    pointsFree: Math.max(0, pointsTotal - activeIds.length),
  }
}

export function buildActiveSkillEffects(activeIds: readonly string[]): Set<SkillEffectId> {
  const effects = new Set<SkillEffectId>()
  for (const id of activeIds) {
    const definition = getSkillNode(id)
    if (definition) effects.add(definition.effect)
  }
  return effects
}

/** Entfernt einen Knoten samt aller davon abhängigen Knoten (kein Verwaisen). */
export function buildAllocationWithout(allocatedIds: readonly string[], nodeId: string): string[] {
  const removed = new Set<string>([nodeId])
  let changed = true
  while (changed) {
    changed = false
    for (const definition of SKILL_NODES) {
      if (!removed.has(definition.id) && definition.requires && removed.has(definition.requires)) {
        removed.add(definition.id)
        changed = true
      }
    }
  }
  return allocatedIds.filter(id => !removed.has(id))
}
