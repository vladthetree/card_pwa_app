/**
 * AI_CONTEXT: Skilltree des Helden — 21 Knoten: 6 im Kern, je 5 pro Klasse (3 Klassen). Jeder Knoten hat genau einen
 * Spiel-/Komfort-Effekt (EffectId); KEIN Knoten ändert FSRS, Kartenauswahl, Gold, Preise oder Etagen-Regeln.
 * Reihenfolge der Knoten je Ast: 1 klein, 2 klein (braucht 1), 3 Notable (braucht 2), 4 klein (braucht 2), 5 Keystone (braucht 3).
 */
import type { HeroClassId } from './heroClassCatalog'

export type SkillNodeKind = 'small' | 'notable' | 'keystone'

/** Wirkungen, die die Dungeon-Szene und die Auswertung tatsächlich umsetzen. */
export type SkillEffectId =
  | 'run-quick'
  | 'scene-torch'
  | 'door-icon'
  | 'calm'
  | 'trail'
  | 'aura'
  | 'pose-hold'
  | 'summary-objectives'
  | 'summary-healed'
  | 'numbers-big'
  | 'frame-glow'

export interface SkillNodeDefinition {
  id: string
  kind: SkillNodeKind
  branch: HeroClassId | 'core'
  requires: string | null
  effect: SkillEffectId
  /** Nummer des Icons im Sheet (skill-NN.png). */
  icon: number
  name: { de: string; en: string }
  description: { de: string; en: string }
}

const ICON_URLS = import.meta.glob('../assets/hero/skills/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

export function getSkillIconUrl(icon: number): string {
  return ICON_URLS[`../assets/hero/skills/skill-${String(icon).padStart(2, '0')}.png`] ?? ''
}

const EFFECT_TEXT: Record<SkillEffectId, { de: string; en: string }> = {
  'run-quick': { de: 'Der Dungeon-Lauf am Sessionende ist deutlich kürzer.', en: 'The dungeon run at the end of a session is much shorter.' },
  'scene-torch': { de: 'Fackeln erhellen den Dungeon-Flur.', en: 'Torches light the dungeon corridor.' },
  'door-icon': { de: 'Offene Etagen erscheinen als Türen in der Übersicht.', en: 'Open floors appear as doors in the overview.' },
  calm: { de: 'Stiller Gang: kein Wackeln, keine Zahlen, nur ruhige Bilder.', en: 'Quiet run: no shaking, no numbers, only calm visuals.' },
  trail: { de: 'Ein Funkenschweif folgt jedem Schlag.', en: 'A spark trail follows every strike.' },
  aura: { de: 'Ein Leuchten in der Klassenfarbe umgibt den Helden.', en: 'A glow in your class colour surrounds the hero.' },
  'pose-hold': { de: 'Der Held hält nach dem Schlag kurz die Pose.', en: 'The hero holds the pose briefly after a strike.' },
  'summary-objectives': { de: 'Die Auswertung nennt die berührten Lernziele.', en: 'The summary names the objectives you touched.' },
  'summary-healed': { de: 'Die Auswertung zeigt geheilte Fehler (Lapses).', en: 'The summary shows healed lapses.' },
  'numbers-big': { de: 'Schadenszahlen werden größer gezeichnet (nur Optik).', en: 'Damage numbers are drawn larger (visual only).' },
  'frame-glow': { de: 'Gegenstände im Inventar leuchten in ihrer Stufenfarbe.', en: 'Inventory items glow in their tier colour.' },
}

function node(
  id: string, kind: SkillNodeKind, branch: SkillNodeDefinition['branch'], requires: string | null,
  effect: SkillEffectId, icon: number, de: string, en: string,
): SkillNodeDefinition {
  return { id, kind, branch, requires, effect, icon, name: { de, en }, description: EFFECT_TEXT[effect] }
}

export const SKILL_NODES: readonly SkillNodeDefinition[] = [
  // Kern
  node('core-1', 'small', 'core', null, 'run-quick', 24, 'Kurze Wege', 'Short paths'),
  node('core-2', 'small', 'core', 'core-1', 'scene-torch', 14, 'Fackelschein', 'Torchlight'),
  node('core-3', 'small', 'core', 'core-1', 'trail', 21, 'Heller Funke', 'Bright spark'),
  node('core-4', 'notable', 'core', 'core-2', 'door-icon', 13, 'Türenkenner', 'Door sense'),
  node('core-5', 'small', 'core', 'core-3', 'numbers-big', 33, 'Wuchtiger Schlag', 'Heavy strike'),
  node('core-6', 'keystone', 'core', 'core-4', 'calm', 19, 'Stiller Gang', 'Quiet run'),
  // Paladin
  node('paladin-1', 'small', 'paladin', null, 'aura', 1, 'Schildglanz', 'Shield shine'),
  node('paladin-2', 'small', 'paladin', 'paladin-1', 'pose-hold', 12, 'Standhaft', 'Steadfast'),
  node('paladin-3', 'notable', 'paladin', 'paladin-2', 'summary-objectives', 30, 'Eidzeile', 'Oath line'),
  node('paladin-4', 'small', 'paladin', 'paladin-2', 'numbers-big', 33, 'Wuchtschlag', 'Mighty blow'),
  node('paladin-5', 'keystone', 'paladin', 'paladin-3', 'frame-glow', 28, 'Sonnenwacht', 'Sun watch'),
  // Magier
  node('mage-1', 'small', 'mage', null, 'trail', 4, 'Funkenflug', 'Spark flight'),
  node('mage-2', 'small', 'mage', 'mage-1', 'aura', 15, 'Kristalllicht', 'Crystal light'),
  node('mage-3', 'notable', 'mage', 'mage-2', 'summary-objectives', 7, 'Runenzeile', 'Rune line'),
  node('mage-4', 'small', 'mage', 'mage-2', 'numbers-big', 2, 'Scharfer Blick', 'Sharp eye'),
  node('mage-5', 'keystone', 'mage', 'mage-3', 'frame-glow', 21, 'Sternenring', 'Star ring'),
  // Schurke
  node('rogue-1', 'small', 'rogue', null, 'run-quick', 24, 'Schattenschritt', 'Shadow step'),
  node('rogue-2', 'small', 'rogue', 'rogue-1', 'trail', 11, 'Klingenspur', 'Blade trail'),
  node('rogue-3', 'notable', 'rogue', 'rogue-2', 'summary-objectives', 5, 'Schlüsselblick', 'Keen look'),
  node('rogue-4', 'small', 'rogue', 'rogue-2', 'aura', 27, 'Nachtschimmer', 'Night shimmer'),
  node('rogue-5', 'keystone', 'rogue', 'rogue-3', 'frame-glow', 25, 'Schwarzer Rahmen', 'Black frame'),
]

const BY_ID = new Map(SKILL_NODES.map(definition => [definition.id, definition]))

export function getSkillNode(id: string): SkillNodeDefinition | undefined {
  return BY_ID.get(id)
}

export function listBranchNodes(branch: HeroClassId | 'core'): SkillNodeDefinition[] {
  return SKILL_NODES.filter(definition => definition.branch === branch)
}
