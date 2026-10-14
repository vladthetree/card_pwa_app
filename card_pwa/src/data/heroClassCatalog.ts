/**
 * AI_CONTEXT: Klassen des Helden (Paladin, Magier, Schurke — je drei Entwicklungsstufen mit eigenen Animationen).
 * Die Klasse ist Darstellung und Metapher: sie wählt Optik, Effekt-Verb, Itemfamilie und den Domänen-Bezug —
 * sie ändert nie Karten, FSRS-Planung oder die Wirtschaftsregeln.
 */
import type { SecurityDomainNumber } from '../utils/securityDomain'

export type HeroClassId = 'paladin' | 'mage' | 'rogue'
export type HeroArchetype = 'heavy' | 'light' | 'cloth'
export type HeroEffectKind = 'slash' | 'bolt' | 'stab'

export interface HeroClassDefinition {
  id: HeroClassId
  archetype: HeroArchetype
  effect: HeroEffectKind
  /** Passende Prüfungsdomäne (Metapher, nicht Zwang). */
  domain: SecurityDomainNumber
  nameKey: string
  roleKey: string
  /** Akzentfarbe für Aura/Rahmen. */
  accent: string
}

export const DEFAULT_HERO_CLASS: HeroClassId = 'paladin'

export const HERO_CLASSES: readonly HeroClassDefinition[] = [
  { id: 'paladin', archetype: 'heavy', effect: 'slash', domain: 4, nameKey: 'hero_class_paladin', roleKey: 'hero_class_paladin_role', accent: '#e9c46a' },
  { id: 'mage', archetype: 'cloth', effect: 'bolt', domain: 1, nameKey: 'hero_class_mage', roleKey: 'hero_class_mage_role', accent: '#4cc9f0' },
  { id: 'rogue', archetype: 'light', effect: 'stab', domain: 2, nameKey: 'hero_class_rogue', roleKey: 'hero_class_rogue_role', accent: '#9d4edd' },
]

const BY_ID = new Map(HERO_CLASSES.map(definition => [definition.id, definition]))

export function isHeroClassId(value: unknown): value is HeroClassId {
  return typeof value === 'string' && BY_ID.has(value as HeroClassId)
}

export function getHeroClass(id: HeroClassId | string | null | undefined): HeroClassDefinition {
  return (id && BY_ID.get(id as HeroClassId)) || (BY_ID.get(DEFAULT_HERO_CLASS) as HeroClassDefinition)
}
