/**
 * AI_CONTEXT: Vitest coverage for the hero system pieces: security domain inference, skill tree rules, hero state assembly, loadout normalization and hints.
 */
import { describe, it, expect } from 'vitest'
import { buildDeckDomainIndex, extractObjectiveCodes, getDomainFromObjectiveCode, inferSecurityDomainFromDeckId, inferSecurityDomainFromDeckName } from '../../utils/securityDomain'
import {
  MAX_SKILL_POINTS,
  buildActiveSkillEffects,
  buildAllocationWithout,
  buildResolvedSkillTree,
  buildSkillMilestones,
  canAllocateSkillNode,
  countSkillPoints,
} from '../../utils/skillTree'
import { SKILL_NODES, getSkillNode, listBranchNodes } from '../../data/skillTreeCatalog'
import { HERO_CLASSES } from '../../data/heroClassCatalog'
import { buildHeroItem, countHeroCatalogItems, getVariantCount } from '../../data/heroItemCatalog'
import { buildCompanionSnapshot, getCompanionStages } from '../../data/companionCatalog'
import { HERO_SLOTS, getTierPower, getTierPrice, type HeroTier } from '../../utils/heroEconomy'
import { buildHeroState } from '../../utils/heroDungeon'
import { buildFloorHintLines } from '../../utils/heroHints'
import { normalizeHeroLoadout } from '../../db/queries/heroLoadout'
import { STRINGS } from '../../i18n'

const DAY = 86_400_000
const T0 = new Date('2026-10-12T10:00:00').getTime()

describe('securityDomain', () => {
  it('leitet Domänen aus stabilen Deck-IDs ab', () => {
    expect(inferSecurityDomainFromDeckId('newinfo-chapter-2')).toBe(2)
    expect(inferSecurityDomainFromDeckId('sy0-701-objective-4-6')).toBe(4)
    expect(inferSecurityDomainFromDeckId('sy0701-security-ports')).toBe(4)
    expect(inferSecurityDomainFromDeckId('irgendwas')).toBeNull()
    expect(inferSecurityDomainFromDeckName('03_Security_Architecture')).toBe(3)
  })
  it('erkennt die echten Deck-IDs und -Namen der Datenbank', () => {
    const real = [
      ['newinfo-chapter-1-domain-1-general-security-concepts', 'Chapter 1: Domain 1.0: General Security Concepts', 1],
      ['newinfo-chapter-2-domain-2-threats-vulnerabilities-mitigations', 'Chapter 2: Domain 2.0: Threats, Vulnerabilities, and Mitigations', 2],
      ['newinfo-chapter-3-domain-3-security-architecture', 'Chapter 3: Domain 3.0: Security Architecture', 3],
      ['newinfo-chapter-4-domain-4-security-operations', 'Chapter 4: Domain 4.0: Security Operations', 4],
      ['newinfo-chapter-5-domain-5-security-program-management-oversight', 'Chapter 5: Domain 5.0: Security Program Management and Oversight', 5],
      ['1773008953575', '01_General_Security_Concepts', 1],
      ['sy0-701-objective-4-6', '4.6 Identity and Access Management', 4],
      ['sy0701-security-ports', 'Security+ SY0-701 · Ports & Protokolle', 4],
    ] as const
    const index = buildDeckDomainIndex(real.map(([id, name]) => ({ id, name })))
    for (const [id, , domain] of real) expect(index.get(id), id).toBe(domain)
    // Namensbasiert, auch wenn die ID nichts verrät:
    expect(inferSecurityDomainFromDeckName('Chapter 3: Domain 3.0: Security Architecture')).toBe(3)
    for (const id of ['pbq-test-deck-001', 'sy0-701-acronyms-bonus', 'sy0-701-not-relevant-archive']) {
      expect(buildDeckDomainIndex([{ id, name: 'x' }]).has(id)).toBe(false)
    }
  })
  it('vererbt die Domäne über die Elternkette', () => {
    const index = buildDeckDomainIndex([
      { id: 'root', name: '05_Security_Program_Management_Oversight' },
      { id: 'child', name: 'Unterdeck', parentDeckId: 'root' },
      { id: 'enkel', name: 'Noch tiefer', parentDeckId: 'child' },
      { id: 'lose', name: 'Ohne Bezug' },
    ])
    expect(index.get('enkel')).toBe(5)
    expect(index.has('lose')).toBe(false)
  })
  it('liest nur gültige Lernziel-Codes aus Tags', () => {
    expect(extractObjectiveCodes(['5.1', 'Objective 4.5', '9.9', 'version 1.23.4', 'Zufall'])).toEqual(['5.1', '4.5'])
    expect(getDomainFromObjectiveCode('4.5')).toBe(4)
  })
})

describe('skill tree', () => {
  it('hat 21 Knoten: 6 im Kern und 5 je Klasse, mit gültigen Vorgängern', () => {
    expect(SKILL_NODES).toHaveLength(6 + 5 * HERO_CLASSES.length)
    expect(listBranchNodes('core')).toHaveLength(6)
    for (const definition of HERO_CLASSES) expect(listBranchNodes(definition.id)).toHaveLength(5)
    for (const node of SKILL_NODES) {
      if (node.requires) expect(getSkillNode(node.requires)?.branch).toBe(node.branch)
      expect(node.name.de && node.name.en && node.description.de).toBeTruthy()
    }
  })
  it('leitet Punkte aus Meilensteinen ab, nicht aus Klicks', () => {
    const none = buildSkillMilestones({ level: 1, studyDays: 0, matureByDomain: [0, 0, 0, 0, 0], healedLapses: 0 })
    expect(countSkillPoints(none)).toBe(0)
    const some = buildSkillMilestones({ level: 12, studyDays: 31, matureByDomain: [15, 3, 0, 20, 0], healedLapses: 6 })
    expect(countSkillPoints(some)).toBe(2 + 2 + 2 + 1)
    const all = buildSkillMilestones({ level: 40, studyDays: 999, matureByDomain: [99, 99, 99, 99, 99], healedLapses: 99 })
    expect(countSkillPoints(all)).toBe(MAX_SKILL_POINTS)
  })
  it('verlangt den Vorgänger, die richtige Klasse und freie Punkte', () => {
    expect(canAllocateSkillNode('core-1', 'paladin', [], 1)).toBe(true)
    expect(canAllocateSkillNode('core-2', 'paladin', [], 5)).toBe(false)
    expect(canAllocateSkillNode('mage-1', 'paladin', [], 5)).toBe(false)
    expect(canAllocateSkillNode('paladin-1', 'paladin', [], 0)).toBe(false)
    expect(canAllocateSkillNode('core-1', 'paladin', ['core-1'], 3)).toBe(false)
  })
  it('lässt überzählige Knoten ruhen statt sie zu löschen (z. B. nach Undo)', () => {
    const resolved = buildResolvedSkillTree(['core-1', 'core-2', 'core-3'], 'paladin', 2)
    expect(resolved.activeIds).toEqual(['core-1', 'core-2'])
    expect(resolved.dormantIds).toEqual(['core-3'])
    expect(resolved.pointsFree).toBe(0)
  })
  it('lässt Knoten anderer Klassen ruhen und holt sie beim Zurückwechseln wieder', () => {
    const asPaladin = buildResolvedSkillTree(['core-1', 'mage-1'], 'paladin', 5)
    expect(asPaladin.activeIds).toEqual(['core-1'])
    expect(asPaladin.dormantIds).toEqual(['mage-1'])
    expect(buildResolvedSkillTree(['core-1', 'mage-1'], 'mage', 5).activeIds).toEqual(['core-1', 'mage-1'])
  })
  it('entfernt beim Zurücknehmen auch abhängige Knoten', () => {
    expect(buildAllocationWithout(['core-1', 'core-2', 'core-4', 'core-3'], 'core-2')).toEqual(['core-1', 'core-3'])
  })
  it('liefert Effekte nur für aktive Knoten', () => {
    expect([...buildActiveSkillEffects(['core-1', 'core-2'])].sort()).toEqual(['run-quick', 'scene-torch'])
  })
})

describe('Item- und Klassenkatalog', () => {
  it('hat 3 Klassen und mehr als 80 Item-Varianten, alle mit Bild und beiden Namen', () => {
    expect(HERO_CLASSES).toHaveLength(3)
    expect(countHeroCatalogItems()).toBeGreaterThan(80)
    for (const definition of HERO_CLASSES) {
      for (const slot of HERO_SLOTS) {
        for (const tier of [1, 2, 3, 4, 5] as HeroTier[]) {
          for (let variant = 0; variant < getVariantCount(definition.id, slot, tier); variant += 1) {
            const item = buildHeroItem(definition.id, slot, tier, variant)
            expect(item.icon, `${definition.id}-${slot}-${tier}-${variant}`).toBeTruthy()
            expect(item.name.de).toBeTruthy()
            expect(item.name.en).toBeTruthy()
            expect(item.power).toBe(getTierPower(tier))
            expect(item.price).toBe(getTierPrice(tier))
          }
        }
      }
    }
  })
  it('benennt Gegenstände passend zu Geschlecht und Stufe', () => {
    expect(buildHeroItem('paladin', 'weapon', 3, 0).name.de).toBe('Feines Stahlschwert')
    expect(buildHeroItem('paladin', 'chest', 5, 0).name.en).toBe('Legendary sun plate')
    expect(buildHeroItem('paladin', 'head', 2, 0).name.de).toBe('Robuster Eisenhut')
  })
  it('gibt jeder Klasse Skins für alle drei Stufen', () => {
    for (const definition of HERO_CLASSES) {
      const stages = getCompanionStages(definition.id)
      expect(stages).toHaveLength(3)
      for (const stage of stages) expect(stage.sprite).toBeTruthy()
    }
    expect(buildCompanionSnapshot(9, 'mage').stage.nameKey).toBe('companion_mage_2')
    expect(buildCompanionSnapshot(30, 'rogue').nextStage).toBeNull()
  })
  it('hat Übersetzungen für alle Klassen- und Stufennamen', () => {
    for (const definition of HERO_CLASSES) {
      for (const lang of ['de', 'en'] as const) {
        expect(STRINGS[lang][definition.nameKey]).toBeTruthy()
        expect(STRINGS[lang][definition.roleKey]).toBeTruthy()
        for (const stage of getCompanionStages(definition.id)) expect(STRINGS[lang][stage.nameKey]).toBeTruthy()
      }
    }
  })
})

describe('buildHeroState', () => {
  const decks = [{ id: 'newinfo-chapter-1', name: 'K1' }, { id: 'newinfo-chapter-2', name: 'K2' }]
  const deckDomains = buildDeckDomainIndex(decks)
  const cards = [
    ...Array.from({ length: 10 }, (_, i) => ({ id: `a${i}`, deckId: 'newinfo-chapter-1', tags: i < 5 ? ['1.1'] : ['1.2'] })),
    ...Array.from({ length: 4 }, (_, i) => ({ id: `b${i}`, deckId: 'newinfo-chapter-2', tags: [] as string[] })),
    { id: 'fremd', deckId: 'unbekannt', tags: [] as string[] },
  ]
  const base = { cards, deckDomains, purchases: [], equipped: {}, level: 1, nextDayStartsAt: 0, now: T0 + 5 * DAY }

  it('zählt Karten je Domäne und ignoriert Decks ohne Domäne', () => {
    const state = buildHeroState({ ...base, reviews: [] })
    expect(state.domains[1].stats.cards).toBe(10)
    expect(state.domains[1].stats.objectives).toBe(2)
    expect(state.domains[2].stats.cards).toBe(4)
    expect(state.domains[3].stats.cards).toBe(0)
    expect(state.earnedGold).toBe(0)
    expect(state.totalOpenFloors).toBe(0)
  })
  it('zahlt Gold für ehrliche Reviews, deckelt es und zeigt es als heutiges Gold', () => {
    const reviews = Array.from({ length: 6 }, (_, i) => ({
      reviewKey: `r${i}`, cardId: `a${i}`, rating: 3 as const, timeMs: 3500, timestamp: T0 + 5 * DAY + i * 1000,
    }))
    const state = buildHeroState({ ...base, reviews })
    expect(state.earnedGold).toBe(24)
    expect(state.todayGold).toBe(24)
    expect(state.balance).toBe(24)
    expect(state.studyDays).toBe(1)
  })
  it('lässt Käufe ohne Gold ruhen und rechnet nichts davon in die Macht', () => {
    const purchases = [{ slot: 'weapon' as const, tier: 1 as const, variant: 0, pricePaid: 100, purchasedAt: 1 }]
    const state = buildHeroState({ ...base, reviews: [], purchases })
    expect(state.unfunded).toHaveLength(1)
    expect(state.gearPower).toBe(0)
  })
  it('liefert Hinweiszeilen für die nächste Etage', () => {
    const state = buildHeroState({ ...base, reviews: [] })
    const lines = buildFloorHintLines(state.domains[1].progress.hint, STRINGS.de)
    expect(lines.some(line => line.includes('reife Karten'))).toBe(true)
    expect(lines.some(line => line.includes('Ausrüstungsmacht'))).toBe(true)
    expect(buildFloorHintLines(null, STRINGS.de)).toEqual([])
  })
})

describe('normalizeHeroLoadout', () => {
  it('nimmt Preise nie aus gespeicherten Daten und verwirft doppelte oder ungültige Käufe', () => {
    const loadout = normalizeHeroLoadout({
      purchases: [
        { slot: 'weapon', tier: 2, variant: 1, pricePaid: 1, purchasedAt: 5 },
        { slot: 'weapon', tier: 2, variant: 0, pricePaid: 9999, purchasedAt: 6 },
        { slot: 'kaputt', tier: 1, variant: 0, pricePaid: 100, purchasedAt: 1 },
        { slot: 'head', tier: 9, variant: 0, pricePaid: 100, purchasedAt: 1 },
      ],
      equipped: { weapon: 2, head: 7 },
      skillNodeIds: ['core-1', 'core-1', 'erfunden'],
      seenFloors: { '1': 3, '9': 2, '2': -1 },
    } as never)
    expect(loadout.purchases).toHaveLength(1)
    expect(loadout.purchases[0]).toMatchObject({ slot: 'weapon', tier: 2, variant: 1, pricePaid: 140 })
    expect(loadout.equipped).toEqual({ weapon: 2 })
    expect(loadout.skillNodeIds).toEqual(['core-1'])
    expect(loadout.seenFloors).toEqual({ '1': 3 })
  })
})
