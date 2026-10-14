/**
 * AI_CONTEXT: Begleiter-Katalog: je Klasse eine Reihe von Pixel-Skins (je drei Stufen).
 * Reine Daten + reine Ableitung: die Stufe folgt allein dem bestehenden Level aus buildGamificationProfile —
 * nichts wird gespeichert. Ohne Klassenangabe gilt der Paladin ("Wächter").
 */
import { DEFAULT_HERO_CLASS, getHeroClass, type HeroClassId } from './heroClassCatalog'

export interface CompanionStage {
  id: string
  minLevel: number
  nameKey: string
  sprite: string
}

const SKIN_URLS = import.meta.glob('../assets/hero/skins/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

function skinUrl(classId: HeroClassId, tier: number): string {
  return SKIN_URLS[`../assets/hero/skins/${classId}-${tier}.png`] ?? ''
}

/** Alle Klassen: drei Skins bei Level 1 / 8 / 18. */
const STAGE_THRESHOLDS = [1, 8, 18] as const
const PALADIN_STAGE_IDS = ['squire', 'knight', 'paladin'] as const

const STAGES_BY_CLASS = new Map<HeroClassId, readonly CompanionStage[]>()

export function getCompanionStages(classId: HeroClassId = DEFAULT_HERO_CLASS): readonly CompanionStage[] {
  const id = getHeroClass(classId).id
  const cached = STAGES_BY_CLASS.get(id)
  if (cached) return cached
  const stages: readonly CompanionStage[] = STAGE_THRESHOLDS.map((minLevel, index) => ({
    id: id === 'paladin' ? PALADIN_STAGE_IDS[index] : `${id}-${index + 1}`,
    minLevel,
    nameKey: `companion_${id}_${index + 1}`,
    sprite: skinUrl(id, index + 1),
  }))
  STAGES_BY_CLASS.set(id, stages)
  return stages
}

/** Rückwärtskompatibel: die Paladin-Stufen. */
export const COMPANION_STAGES = getCompanionStages('paladin')

export interface CompanionSnapshot {
  stage: CompanionStage
  stageNumber: number
  stageCount: number
  nextStage: CompanionStage | null
  levelsToNext: number
}

export function buildCompanionSnapshot(level: number, classId: HeroClassId = DEFAULT_HERO_CLASS): CompanionSnapshot {
  const stages = getCompanionStages(classId)
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1
  let index = 0
  for (let i = 0; i < stages.length; i += 1) {
    if (safeLevel >= stages[i].minLevel) index = i
  }
  const nextStage = stages[index + 1] ?? null
  return {
    stage: stages[index],
    stageNumber: index + 1,
    stageCount: stages.length,
    nextStage,
    levelsToNext: nextStage ? nextStage.minLevel - safeLevel : 0,
  }
}
