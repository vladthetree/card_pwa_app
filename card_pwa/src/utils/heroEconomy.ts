/**
 * AI_CONTEXT: Reine Spielwirtschaft des Helden (Gold, Heldenmacht, Dungeon-Etagen).
 * Abgeleitet aus dem simulierten Vertrag (Grok-Studie, 8.10.2026); Slots/Preise hier auf fünf Slots skaliert.
 * Alles deterministisch, ohne I/O (Verb-Vertrag: build- und compute-Funktionen). Gold wird nie gespeichert: verdient
 * (aus Reviews) minus finanzierte Käufe. Dungeon-Etagen schreiben nie FSRS-Felder und nehmen nie etwas weg.
 * Gates (buildDungeonProgress) lesen NICHT die Heldenmacht-Summe: Level oder Gold-Grind ersetzen kein Wissen.
 */

export const DAY_GOLD_CAP = 52
/** Antworten unter dieser Zeit zahlen kein Gold (Sperre gegen Blindklicks, kein Talentwert). */
export const RETRIEVAL_MS = 1000
export const MATURE_STABILITY = 21
export const DEEP_STABILITY = 60

export type HeroRating = 1 | 2 | 3 | 4
export const HERO_SLOTS = ['weapon', 'offhand', 'head', 'chest', 'relic'] as const
export type HeroSlot = (typeof HERO_SLOTS)[number]
export type HeroTier = 1 | 2 | 3 | 4 | 5
export const HERO_TIERS: readonly HeroTier[] = [1, 2, 3, 4, 5]

/** Macht je Stufe eines Slots; fünf Slots auf Stufe 5 ergeben 145 (Simulation: 144 bei vier Slots). */
const TIER_POWER = [0, 5, 9, 14, 21, 29] as const
/** Preise je Stufe (Simulation: 100/140/170/190/840). */
const TIER_PRICE = [0, 100, 140, 170, 190, 840] as const

const EXAM_FRAC = [0.04, 0.08, 0.12, 0.17, 0.22, 0.28] as const
const EXAM_OBJ = [0.25, 0.25, 0.5, 0.5, 0.75, 0.75] as const
/** Ausrüstungsmacht je Prüfungsetage (Simulationswerte × 0,8 wegen fünf statt vier Slots). */
const EXAM_GEAR = [5, 5, 10, 15, 21, 29] as const
const ASCEND_SPEC = [
  { matureFrac: 0.36, deepFrac: 0.045, keptFrac: 0, gear: 35, objFrac: 0.75 },
  { matureFrac: 0.36, deepFrac: 0.045, keptFrac: 0.28, gear: 45, objFrac: 0.75 },
  { matureFrac: 0.36, deepFrac: 0.045, keptFrac: 0.5, gear: 58, objFrac: 1 },
  { matureFrac: 0.36, deepFrac: 0.045, keptFrac: 0.72, gear: 77, objFrac: 1 },
] as const

export const EXAM_FLOOR_COUNT = EXAM_FRAC.length
export const ASCEND_FLOOR_COUNT = ASCEND_SPEC.length

export function getTierPower(tier: number): number {
  return TIER_POWER[Math.max(0, Math.min(5, Math.floor(tier)))]
}

export function getTierPrice(tier: number): number {
  return TIER_PRICE[Math.max(0, Math.min(5, Math.floor(tier)))]
}

/** Zuschlag aus der Spiel-Stabilität VOR dem Review. */
export function computeMaturityBonus(stability: number): number {
  if (stability >= 180) return 8
  if (stability >= DEEP_STABILITY) return 6
  if (stability >= MATURE_STABILITY) return 4
  if (stability >= 7) return 2
  if (stability >= 1) return 1
  return 0
}

export interface ReviewGoldInput {
  /** Stabile Identität der Review-Zeile (opId oder cardId+timestamp). Replays werden darüber dedupliziert. */
  reviewKey: string
  cardId: string
  /** Lokaler Lerntag. Eine Karte zahlt pro Tag höchstens einmal. */
  dayKey: string
  rating: HeroRating
  timeMs: number
  /** Die Karte war im Spielgedächtnis fällig (nicht vorgezogen). */
  wasDue: boolean
  /** Spiel-Stabilität VOR diesem Review. */
  preGameStability: number
  /** Nur der Review, der eine Karte nach einem Lapse erstmals wieder auf Reife hebt. */
  healedNow?: boolean
}

/** Ein Review. Again zahlt 0 und zieht nie etwas ab; Easy zahlt wie Good. */
export function computeReviewGold(input: ReviewGoldInput): number {
  if (input.rating < 2) return 0
  if (!input.wasDue) return 0
  if (!Number.isFinite(input.timeMs) || input.timeMs < RETRIEVAL_MS) return 0
  const base = input.rating === 2 ? 3 : 4
  return base + computeMaturityBonus(input.preGameStability) + (input.healedNow ? 6 : 0)
}

export interface DayGold {
  dayKey: string
  raw: number
  capped: number
}

/** Dedupe über reviewKey, je Karte und Tag zählt das Maximum, die Tagessumme wird gedeckelt. */
export function computeDayGoldByDay(reviews: readonly ReviewGoldInput[]): DayGold[] {
  const seen = new Set<string>()
  const bestByCardDay = new Map<string, { dayKey: string; gold: number }>()
  for (const review of reviews) {
    if (seen.has(review.reviewKey)) continue
    seen.add(review.reviewKey)
    const gold = computeReviewGold(review)
    const key = `${review.dayKey}\u0000${review.cardId}`
    const current = bestByCardDay.get(key)
    if (!current || gold > current.gold) bestByCardDay.set(key, { dayKey: review.dayKey, gold })
  }
  const rawByDay = new Map<string, number>()
  for (const { dayKey, gold } of bestByCardDay.values()) {
    rawByDay.set(dayKey, (rawByDay.get(dayKey) ?? 0) + gold)
  }
  return [...rawByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dayKey, raw]) => ({ dayKey, raw, capped: Math.min(raw, DAY_GOLD_CAP) }))
}

export function computeEarnedGold(days: readonly DayGold[]): number {
  return days.reduce((sum, day) => sum + day.capped, 0)
}

export interface HeroPurchase {
  slot: HeroSlot
  tier: HeroTier
  /** Gewählte Optik-Variante (0–2), rein kosmetisch. */
  variant: number
  pricePaid: number
  purchasedAt: number
}

export function getPurchaseKey(purchase: Pick<HeroPurchase, 'slot' | 'tier'>): string {
  return `${purchase.slot}:${purchase.tier}`
}

export interface FundedLoadout {
  funded: HeroPurchase[]
  unfunded: HeroPurchase[]
  spent: number
  balance: number
}

/**
 * Älteste Käufe zuerst. Fällt verdientes Gold (z. B. durch Undo), verlieren die neuesten Käufe
 * ihre Wirkung, bleiben aber gespeichert und wirken wieder, sobald das Gold reicht.
 */
export function buildFundedPurchases(earnedGold: number, purchases: readonly HeroPurchase[]): FundedLoadout {
  const ordered = [...purchases].sort((a, b) => a.purchasedAt - b.purchasedAt || getPurchaseKey(a).localeCompare(getPurchaseKey(b)))
  const seen = new Set<string>()
  let balance = Math.max(0, Math.floor(earnedGold))
  const funded: HeroPurchase[] = []
  const unfunded: HeroPurchase[] = []
  let spent = 0
  for (const purchase of ordered) {
    const key = getPurchaseKey(purchase)
    if (seen.has(key)) continue
    seen.add(key)
    if (balance >= purchase.pricePaid) {
      balance -= purchase.pricePaid
      spent += purchase.pricePaid
      funded.push(purchase)
    } else {
      unfunded.push(purchase)
    }
  }
  return { funded, unfunded, spent, balance }
}

/** Nächste kaufbare Stufe eines Slots (Stufen müssen der Reihe nach gekauft werden), null wenn alles gekauft. */
export function getNextTier(owned: readonly Pick<HeroPurchase, 'slot' | 'tier'>[], slot: HeroSlot): HeroTier | null {
  let top = 0
  for (const purchase of owned) {
    if (purchase.slot === slot && purchase.tier > top) top = purchase.tier
  }
  return top >= 5 ? null : ((top + 1) as HeroTier)
}

/** Ausrüstungsmacht: pro Slot zählt die ausgerüstete (sonst höchste finanzierte) Stufe. */
export function computeGearPower(
  funded: readonly Pick<HeroPurchase, 'slot' | 'tier'>[],
  equipped: Partial<Record<HeroSlot, number>> = {},
): number {
  let total = 0
  for (const slot of HERO_SLOTS) {
    const ownedTiers = funded.filter(purchase => purchase.slot === slot).map(purchase => purchase.tier)
    if (ownedTiers.length === 0) continue
    const wanted = equipped[slot]
    const tier = wanted !== undefined && ownedTiers.includes(wanted as HeroTier) ? wanted : Math.max(...ownedTiers)
    total += getTierPower(tier)
  }
  return total
}

export interface HeroKnowledge {
  mature: number
  deep: number
  healed: number
  coveredObjectives: number
  solidObjectives: number
  firmObjectives: number
  veryDeep: number
}

export interface HeroPower {
  levelPart: number
  itemPart: number
  knowledgePart: number
  total: number
}

/** Anzeige-Summe. Sie ist KEINE Tür: buildDungeonProgress liest sie nicht. */
export function buildHeroPower(level: number, itemPower: number, knowledge: HeroKnowledge): HeroPower {
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1
  const levelPart = Math.min(30, safeLevel - 1)
  const itemPart = Math.max(0, itemPower)
  const knowledgePart = 4 * knowledge.mature
    + 2 * knowledge.deep
    + 3 * knowledge.healed
    + 8 * knowledge.coveredObjectives
    + 6 * knowledge.solidObjectives
    + 4 * knowledge.firmObjectives
    + 5 * knowledge.veryDeep
  return { levelPart, itemPart, knowledgePart, total: knowledgePart + itemPart + levelPart }
}

export interface DomainDungeonStats {
  cards: number
  /** Anzahl der in dieser Domäne belegbaren Lernziele (aus Karten-Tags). 0 = Lernziel-Schloss entfällt. */
  objectives: number
  mature: number
  deep: number
  covered: number
  /** Pünktliche Erfolge auf bereits reifen Karten, je Karte höchstens 3. */
  kept: number
}

export interface FloorHint {
  kind: 'exam' | 'ascend'
  floor: number
  needMature: number
  haveMature: number
  needGear: number
  haveGear: number
  needObjectives: number
  haveObjectives: number
  needKept?: number
  haveKept?: number
  needDeep?: number
  haveDeep?: number
}

export interface DungeonProgress {
  examFloors: number
  ascendFloors: number
  bossCleared: boolean
  /** Warum die nächste Etage noch zu ist; null wenn alles offen ist. */
  hint: FloorHint | null
}

function ceilShare(fraction: number, total: number): number {
  if (fraction === 0 || total <= 0) return 0
  // Epsilon: 0,28 * 100 ergibt 28,000000000000004 und ceil würde 29 liefern.
  return Math.max(1, Math.ceil(fraction * total - 1e-9))
}

/**
 * Drei getrennte Schlösser je Etage: reife Karten, abgedeckte Lernziele, Ausrüstung.
 * Das Lernziel-Schloss entfällt, wo die Karten keine Lernziel-Tags tragen (objectives = 0).
 */
export function buildDungeonProgress(stats: DomainDungeonStats, gearPower: number): DungeonProgress {
  let examFloors = 0
  let hint: FloorHint | null = null

  for (let index = 0; index < EXAM_FRAC.length; index += 1) {
    const needMature = ceilShare(EXAM_FRAC[index], stats.cards)
    const needObjectives = ceilShare(EXAM_OBJ[index], stats.objectives)
    const needGear = EXAM_GEAR[index]
    const open = stats.mature >= needMature && stats.covered >= needObjectives && gearPower >= needGear
    if (!open) {
      hint = {
        kind: 'exam',
        floor: index + 1,
        needMature,
        haveMature: stats.mature,
        needGear,
        haveGear: gearPower,
        needObjectives,
        haveObjectives: stats.covered,
      }
      break
    }
    examFloors += 1
  }

  let ascendFloors = 0
  if (examFloors === EXAM_FRAC.length) {
    for (let index = 0; index < ASCEND_SPEC.length; index += 1) {
      const spec = ASCEND_SPEC[index]
      const needMature = ceilShare(spec.matureFrac, stats.cards)
      const needDeep = ceilShare(spec.deepFrac, stats.cards)
      const needKept = spec.keptFrac === 0 ? 0 : Math.ceil(spec.keptFrac * stats.cards - 1e-9)
      const needObjectives = ceilShare(spec.objFrac, stats.objectives)
      const open = stats.mature >= needMature
        && stats.deep >= needDeep
        && stats.kept >= needKept
        && stats.covered >= needObjectives
        && gearPower >= spec.gear
      if (!open) {
        hint = {
          kind: 'ascend',
          floor: index + 1,
          needMature,
          haveMature: stats.mature,
          needDeep,
          haveDeep: stats.deep,
          needKept,
          haveKept: stats.kept,
          needGear: spec.gear,
          haveGear: gearPower,
          needObjectives,
          haveObjectives: stats.covered,
        }
        break
      }
      ascendFloors += 1
    }
  }

  return { examFloors, ascendFloors, bossCleared: examFloors >= EXAM_FRAC.length, hint }
}

/** Gesamtzahl der offenen Etagen einer Domäne (Prüfungsetagen + Aufstiege). */
export function countOpenFloors(progress: DungeonProgress): number {
  return progress.examFloors + progress.ascendFloors
}
