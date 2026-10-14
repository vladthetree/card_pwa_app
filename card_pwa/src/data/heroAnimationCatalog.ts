/**
 * AI_CONTEXT: Frame-Animationen der Helden-Skins. Je Skin (Klasse + Stufe) gibt es zwei Idle-Schleifen ("idle-a" ruhig,
 * "idle-b" wach) und vier Angriffe ("attack-1" … "attack-4"), jeweils ein Streifen mit 8 Frames. Der Effekt des Angriffs
 * (Schwung, Stoß, Lichtsäule …) ist Teil des Bildes. Fehlt ein Streifen, liefert der Katalog '' und die Oberfläche zeigt
 * den statischen Skin — nichts bricht.
 */
import type { HeroClassId } from './heroClassCatalog'

export const HERO_ANIMATION_FRAMES = 8
/** Ein Frame ist 192 × 224 px groß; die Figur steht mit den Füßen auf einer festen Linie darin (y = 212). */
export const HERO_FRAME_WIDTH = 192
export const HERO_FRAME_HEIGHT = 224
export const HERO_ATTACK_VARIANTS = 4
export const HERO_IDLE_VARIANTS = 2

export type HeroAnimationKind = 'idle-a' | 'idle-b' | 'attack-1' | 'attack-2' | 'attack-3' | 'attack-4'

const ANIMATION_URLS = import.meta.glob('../assets/hero/anim/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

export function getHeroAnimation(classId: HeroClassId, stageNumber: number, kind: HeroAnimationKind): string {
  return ANIMATION_URLS[`../assets/hero/anim/${classId}-${stageNumber}-${kind}.png`] ?? ''
}

/** Angriff nach 0-basiertem Index; Werte außerhalb werden reihum gefaltet. */
export function getHeroAttackKind(variant: number): HeroAnimationKind {
  const index = ((Math.floor(variant) % HERO_ATTACK_VARIANTS) + HERO_ATTACK_VARIANTS) % HERO_ATTACK_VARIANTS
  return `attack-${index + 1}` as HeroAnimationKind
}

export function hasHeroAnimation(classId: HeroClassId, stageNumber: number): boolean {
  return Boolean(getHeroAnimation(classId, stageNumber, 'idle-a'))
}

/** Breite eines Frames bei gegebener Anzeigehöhe. */
export function getHeroFrameWidth(height: number): number {
  return Math.round((height * HERO_FRAME_WIDTH) / HERO_FRAME_HEIGHT)
}

/**
 * Angriffsstreifen für einen Skin: die gewünschte Variante, sonst die erste vorhandene (nicht jede Stufe hat alle vier);
 * '' wenn der Skin gar keinen Angriff hat — die Szene zeigt dann nur den Vorstoß und den Treffer-Effekt.
 */
export function getHeroAttackAnimation(classId: HeroClassId, stageNumber: number, variantIndex: number): string {
  const wanted = getHeroAnimation(classId, stageNumber, getHeroAttackKind(variantIndex))
  if (wanted) return wanted
  for (let index = 0; index < HERO_ATTACK_VARIANTS; index += 1) {
    const url = getHeroAnimation(classId, stageNumber, getHeroAttackKind(index))
    if (url) return url
  }
  return ''
}
