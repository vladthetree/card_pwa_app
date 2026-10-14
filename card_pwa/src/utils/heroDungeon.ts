/**
 * AI_CONTEXT: Setzt Reviews, Karten, Decks und Ausrüstung zum Gesamtzustand des Helden zusammen
 * (Gold, Ausrüstungsmacht, Wissen, Dungeon-Etagen je Domäne). Rein und deterministisch (build-Funktionen);
 * die Dexie-Anbindung liegt in db/queries/heroState.ts. Schreibt nie in FSRS oder Karten.
 */
import {
  buildDungeonProgress,
  buildFundedPurchases,
  buildHeroPower,
  computeDayGoldByDay,
  computeEarnedGold,
  computeGearPower,
  countOpenFloors,
  type DayGold,
  type DomainDungeonStats,
  type DungeonProgress,
  type HeroKnowledge,
  type HeroPower,
  type HeroPurchase,
  type HeroSlot,
} from './heroEconomy'
import {
  buildGameMemoryReplay,
  isGameDeep,
  isGameMature,
  type GameCardSummary,
  type GameReviewInput,
} from './heroGameMemory'
import {
  SECURITY_DOMAIN_NUMBERS,
  extractObjectiveCodes,
  type SecurityDomainNumber,
} from './securityDomain'
import { getDayStartMs } from './time'

export interface HeroCardInput {
  id: string
  deckId: string
  tags: readonly string[]
}

export interface HeroStateInput {
  reviews: readonly GameReviewInput[]
  /** Nur lernbare (aktive) Karten. */
  cards: readonly HeroCardInput[]
  deckDomains: ReadonlyMap<string, SecurityDomainNumber>
  purchases: readonly HeroPurchase[]
  equipped: Partial<Record<HeroSlot, number>>
  level: number
  nextDayStartsAt: number
  now: number
}

export interface DomainHeroState {
  domain: SecurityDomainNumber
  stats: DomainDungeonStats
  progress: DungeonProgress
  openFloors: number
}

export interface HeroState {
  earnedGold: number
  spentGold: number
  balance: number
  todayGold: number
  /** Heutiger Deckel erreicht (zusätzliche Reviews zahlen heute nichts mehr). */
  todayCapped: boolean
  funded: HeroPurchase[]
  unfunded: HeroPurchase[]
  gearPower: number
  knowledge: HeroKnowledge
  power: HeroPower
  domains: Record<SecurityDomainNumber, DomainHeroState>
  /** Lerntage mit mindestens einem zahlenden (fälligen) Abruf. */
  studyDays: number
  totalOpenFloors: number
  bossesCleared: number
}

const SOLID_OBJECTIVE_MATURE = 5
const FIRM_OBJECTIVE_MATURE = 12
const VERY_DEEP_STABILITY = 400

export function buildHeroState(input: HeroStateInput): HeroState {
  const replay = buildGameMemoryReplay(input.reviews, input.nextDayStartsAt)
  const days: DayGold[] = computeDayGoldByDay(replay.goldInputs)
  const earnedGold = computeEarnedGold(days)
  const fundedLoadout = buildFundedPurchases(earnedGold, input.purchases)
  const gearPower = computeGearPower(fundedLoadout.funded, input.equipped)

  const todayKey = String(getDayStartMs(input.now, input.nextDayStartsAt))
  const today = days.find(day => day.dayKey === todayKey)
  const studyDays = new Set(
    replay.goldInputs.filter(item => item.wasDue && item.rating >= 2 && item.timeMs >= 1000).map(item => item.dayKey),
  ).size

  const cardsByDomain = new Map<SecurityDomainNumber, HeroCardInput[]>()
  for (const card of input.cards) {
    const domain = input.deckDomains.get(card.deckId)
    if (!domain) continue
    const list = cardsByDomain.get(domain)
    if (list) list.push(card)
    else cardsByDomain.set(domain, [card])
  }

  const knowledge: HeroKnowledge = {
    mature: 0, deep: 0, healed: 0, coveredObjectives: 0, solidObjectives: 0, firmObjectives: 0, veryDeep: 0,
  }
  const domains = {} as Record<SecurityDomainNumber, DomainHeroState>
  let bossesCleared = 0
  let totalOpenFloors = 0

  for (const domain of SECURITY_DOMAIN_NUMBERS) {
    const cards = cardsByDomain.get(domain) ?? []
    const objectives = new Set<string>()
    const matureByObjective = new Map<string, number>()
    let mature = 0
    let deep = 0
    let kept = 0

    for (const card of cards) {
      const codes = extractObjectiveCodes(card.tags)
      codes.forEach(code => objectives.add(code))
      const summary: GameCardSummary | undefined = replay.cards.get(card.id)
      knowledge.healed += summary?.healed ?? 0
      if (!isGameMature(summary)) continue
      mature += 1
      kept += summary?.kept ?? 0
      if (isGameDeep(summary)) deep += 1
      if ((summary?.peakStability ?? 0) >= VERY_DEEP_STABILITY) knowledge.veryDeep += 1
      codes.forEach(code => matureByObjective.set(code, (matureByObjective.get(code) ?? 0) + 1))
    }

    let covered = 0
    for (const code of objectives) {
      const count = matureByObjective.get(code) ?? 0
      if (count >= 1) covered += 1
      if (count >= SOLID_OBJECTIVE_MATURE) knowledge.solidObjectives += 1
      if (count >= FIRM_OBJECTIVE_MATURE) knowledge.firmObjectives += 1
    }

    const stats: DomainDungeonStats = { cards: cards.length, objectives: objectives.size, mature, deep, covered, kept }
    const progress = buildDungeonProgress(stats, gearPower)
    const openFloors = countOpenFloors(progress)
    domains[domain] = { domain, stats, progress, openFloors }
    knowledge.mature += mature
    knowledge.deep += deep
    knowledge.coveredObjectives += covered
    totalOpenFloors += openFloors
    if (progress.bossCleared) bossesCleared += 1
  }

  return {
    earnedGold,
    spentGold: fundedLoadout.spent,
    balance: fundedLoadout.balance,
    todayGold: today?.capped ?? 0,
    todayCapped: (today?.raw ?? 0) >= 52,
    funded: fundedLoadout.funded,
    unfunded: fundedLoadout.unfunded,
    gearPower,
    knowledge,
    power: buildHeroPower(input.level, gearPower, knowledge),
    domains,
    studyDays,
    totalOpenFloors,
    bossesCleared,
  }
}
