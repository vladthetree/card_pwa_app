/**
 * AI_CONTEXT: Dungeon-Katalog: je Domäne ein Monster (Idle-/Todes-Streifen mit je 8 Frames) und je Klasse ein
 * Treffer-Effekt (8 Frames, in der Klassenfarbe). Fehlt ein Streifen (noch nicht ausgeliefert), liefert der Katalog '' und die Szene lässt ihn weg.
 */
import type { HeroClassId } from './heroClassCatalog'
import type { SecurityDomainNumber } from '../utils/securityDomain'

export const MONSTER_FRAME_SIZE = 192
export const MONSTER_FRAME_HEIGHT = 208
export const FX_FRAME_SIZE = 128
export const STRIP_FRAMES = 8

const MONSTER_URLS = import.meta.glob('../assets/hero/monsters/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const FX_URLS = import.meta.glob('../assets/hero/fx/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

export interface DungeonMonster {
  domain: SecurityDomainNumber
  nameKey: string
  idle: string
  death: string
}

export function getDungeonMonster(domain: SecurityDomainNumber): DungeonMonster {
  return {
    domain,
    nameKey: `hero_monster_${domain}`,
    idle: MONSTER_URLS[`../assets/hero/monsters/mon-${domain}-idle.png`] ?? '',
    death: MONSTER_URLS[`../assets/hero/monsters/mon-${domain}-death.png`] ?? '',
  }
}

export function getEffectSheet(classId: HeroClassId): string {
  return FX_URLS[`../assets/hero/fx/hit-${classId}.png`] ?? ''
}
