/**
 * AI_CONTEXT: Dexie-Zugriff auf die Helden-Ausrüstung (Käufe, Ausrüstungswahl, Skill-Belegung).
 * Gold ist abgeleitet (utils/heroDungeon); hier wird nur validiert und gespeichert. Käufe müssen der Reihe
 * nach erfolgen (Stufe n braucht Stufe n−1) und vom Kontostand gedeckt sein; nichts wird je gelöscht oder zurückgebucht.
 */
import { db, type HeroLoadoutRecord } from '../../db'
import {
  HERO_SLOTS,
  HERO_TIERS,
  getNextTier,
  getTierPrice,
  type HeroPurchase,
  type HeroSlot,
  type HeroTier,
} from '../../utils/heroEconomy'
import { getSkillNode } from '../../data/skillTreeCatalog'

export const HERO_LOADOUT_CHANGED_EVENT = 'card-pwa:hero-loadout-changed'
export const LOCAL_HERO_PROFILE_ID = 'local'

export interface HeroLoadout {
  profileId: string
  purchases: HeroPurchase[]
  equipped: Partial<Record<HeroSlot, number>>
  skillNodeIds: string[]
  seenMonsterIds: string[]
  seenFloors: Record<string, number>
  updatedAt: number
}

function isSlot(value: unknown): value is HeroSlot {
  return typeof value === 'string' && (HERO_SLOTS as readonly string[]).includes(value)
}

function isTier(value: unknown): value is HeroTier {
  return typeof value === 'number' && (HERO_TIERS as readonly number[]).includes(value)
}

function normalizeSeenFloors(raw: unknown): Record<string, number> {
  const result: Record<string, number> = {}
  if (!raw || typeof raw !== 'object') return result
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (/^[1-5]$/.test(key) && typeof value === 'number' && Number.isFinite(value) && value >= 0) result[key] = Math.floor(value)
  }
  return result
}

export function normalizeHeroLoadout(raw: Partial<HeroLoadoutRecord> | undefined, profileId = LOCAL_HERO_PROFILE_ID): HeroLoadout {
  const seen = new Set<string>()
  const purchases: HeroPurchase[] = []
  for (const entry of raw?.purchases ?? []) {
    if (!isSlot(entry?.slot) || !isTier(entry?.tier)) continue
    const key = `${entry.slot}:${entry.tier}`
    if (seen.has(key)) continue
    seen.add(key)
    purchases.push({
      slot: entry.slot,
      tier: entry.tier,
      variant: Number.isInteger(entry.variant) && entry.variant >= 0 ? entry.variant : 0,
      // Der Preis kommt immer aus dem Katalog, nie aus gespeicherten Nutzdaten.
      pricePaid: getTierPrice(entry.tier),
      purchasedAt: Number.isFinite(entry.purchasedAt) ? entry.purchasedAt : 0,
    })
  }
  const equipped: Partial<Record<HeroSlot, number>> = {}
  for (const slot of HERO_SLOTS) {
    const tier = raw?.equipped?.[slot]
    if (isTier(tier)) equipped[slot] = tier
  }
  return {
    profileId: raw?.profileId ?? profileId,
    purchases,
    equipped,
    skillNodeIds: [...new Set((raw?.skillNodeIds ?? []).filter(id => typeof id === 'string' && getSkillNode(id)))],
    seenMonsterIds: [...new Set((raw?.seenMonsterIds ?? []).filter(id => typeof id === 'string'))],
    seenFloors: normalizeSeenFloors(raw?.seenFloors),
    updatedAt: Number.isFinite(raw?.updatedAt) ? (raw?.updatedAt as number) : 0,
  }
}

export async function getHeroLoadout(profileId = LOCAL_HERO_PROFILE_ID): Promise<HeroLoadout> {
  return normalizeHeroLoadout(await db.heroLoadout.get(profileId), profileId)
}

function notifyChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(HERO_LOADOUT_CHANGED_EVENT))
}

export async function persistHeroLoadout(loadout: HeroLoadout): Promise<HeroLoadout> {
  const normalized = normalizeHeroLoadout({ ...loadout, updatedAt: Date.now() }, loadout.profileId)
  await db.heroLoadout.put(normalized as HeroLoadoutRecord)
  notifyChanged()
  return normalized
}

export type PurchaseResult =
  | { ok: true; loadout: HeroLoadout }
  | { ok: false; reason: 'order' | 'funds' | 'variant' }

/**
 * Kauft die nächste Stufe eines Slots. `balance` ist das aktuell abgeleitete Gold; `maxVariant` die Zahl der
 * Optik-Varianten dieser Stufe. Schlägt ohne Nebenwirkung fehl, wenn Reihenfolge oder Gold nicht stimmen.
 */
export async function purchaseHeroItem(params: {
  slot: HeroSlot
  tier: HeroTier
  variant: number
  balance: number
  variantCount: number
  profileId?: string
}): Promise<PurchaseResult> {
  const profileId = params.profileId ?? LOCAL_HERO_PROFILE_ID
  return db.transaction('rw', db.heroLoadout, async () => {
    const current = await getHeroLoadout(profileId)
    if (getNextTier(current.purchases, params.slot) !== params.tier) return { ok: false, reason: 'order' } as const
    if (params.variant < 0 || params.variant >= params.variantCount) return { ok: false, reason: 'variant' } as const
    const price = getTierPrice(params.tier)
    if (params.balance < price) return { ok: false, reason: 'funds' } as const
    const next: HeroLoadout = {
      ...current,
      purchases: [...current.purchases, { slot: params.slot, tier: params.tier, variant: params.variant, pricePaid: price, purchasedAt: Date.now() }],
      equipped: { ...current.equipped, [params.slot]: params.tier },
    }
    const saved = normalizeHeroLoadout({ ...next, updatedAt: Date.now() }, profileId)
    await db.heroLoadout.put(saved as HeroLoadoutRecord)
    return { ok: true, loadout: saved } as const
  }).then(result => {
    if (result.ok) notifyChanged()
    return result
  })
}

/** Optik-Variante eines bereits gekauften Gegenstands wechseln (kostenlos, rein kosmetisch). */
export async function setHeroItemVariant(slot: HeroSlot, tier: HeroTier, variant: number, variantCount: number, profileId = LOCAL_HERO_PROFILE_ID) {
  if (variant < 0 || variant >= variantCount) return
  const current = await getHeroLoadout(profileId)
  const purchases = current.purchases.map(purchase => (purchase.slot === slot && purchase.tier === tier ? { ...purchase, variant } : purchase))
  await persistHeroLoadout({ ...current, purchases })
}

export async function setHeroEquippedTier(slot: HeroSlot, tier: HeroTier, profileId = LOCAL_HERO_PROFILE_ID) {
  const current = await getHeroLoadout(profileId)
  if (!current.purchases.some(purchase => purchase.slot === slot && purchase.tier === tier)) return
  await persistHeroLoadout({ ...current, equipped: { ...current.equipped, [slot]: tier } })
}

export async function persistHeroSkillNodes(skillNodeIds: string[], profileId = LOCAL_HERO_PROFILE_ID) {
  const current = await getHeroLoadout(profileId)
  await persistHeroLoadout({ ...current, skillNodeIds })
}

export async function persistHeroSeenMonsters(monsterIds: string[], profileId = LOCAL_HERO_PROFILE_ID) {
  const current = await getHeroLoadout(profileId)
  const merged = [...new Set([...current.seenMonsterIds, ...monsterIds])]
  if (merged.length === current.seenMonsterIds.length) return
  await persistHeroLoadout({ ...current, seenMonsterIds: merged })
}

/** Merkt die gesehene Etagenzahl einer Domäne; sie sinkt nie (Hochwasser). */
export async function persistHeroSeenFloors(domain: number, openFloors: number, profileId = LOCAL_HERO_PROFILE_ID) {
  const current = await getHeroLoadout(profileId)
  const key = String(domain)
  if ((current.seenFloors[key] ?? -1) >= openFloors) return
  await persistHeroLoadout({ ...current, seenFloors: { ...current.seenFloors, [key]: openFloors } })
}
