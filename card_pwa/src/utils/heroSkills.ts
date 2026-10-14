/**
 * AI_CONTEXT: Verbindet HeroState/Loadout mit dem Skilltree: Meilensteine → Punkte → wirksame Knoten → Effekte.
 * Rein (build-Funktionen). Eine Stelle für Laden, Skilltree-Dialog und Dungeon-Gang, damit alle dieselben Effekte sehen.
 */
import type { HeroClassId } from '../data/heroClassCatalog'
import type { SkillEffectId } from '../data/skillTreeCatalog'
import type { HeroState } from './heroDungeon'
import { SECURITY_DOMAIN_NUMBERS } from './securityDomain'
import {
  buildActiveSkillEffects,
  buildResolvedSkillTree,
  buildSkillMilestones,
  countSkillPoints,
  type ResolvedSkillTree,
  type SkillMilestone,
} from './skillTree'

export interface HeroSkillContext {
  milestones: SkillMilestone[]
  resolved: ResolvedSkillTree
  effects: Set<SkillEffectId>
}

export function buildHeroSkillContext(
  state: HeroState,
  skillNodeIds: readonly string[],
  classId: HeroClassId,
  level: number,
): HeroSkillContext {
  const milestones = buildSkillMilestones({
    level,
    studyDays: state.studyDays,
    matureByDomain: SECURITY_DOMAIN_NUMBERS.map(domain => state.domains[domain].stats.mature),
    healedLapses: state.knowledge.healed,
  })
  const resolved = buildResolvedSkillTree(skillNodeIds, classId, countSkillPoints(milestones))
  return { milestones, resolved, effects: buildActiveSkillEffects(resolved.activeIds) }
}
