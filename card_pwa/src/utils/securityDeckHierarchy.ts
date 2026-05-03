export interface SecurityDeckLike {
  id: string
  name: string
  createdAt: number
  updatedAt?: number
  source?: string
  parentDeckId?: string | null
  isDeleted?: boolean
}

export interface SecurityDeckHierarchyPlan<T extends SecurityDeckLike = SecurityDeckLike> {
  upserts: T[]
  updates: Array<{ id: string; changes: Partial<T> }>
}

export const SY0_701_ROOT_DECKS: Record<string, { name: string; domain: string }> = {
  '1': {
    name: '01_General_Security_Concepts',
    domain: 'General Security Concepts',
  },
  '2': {
    name: '02_Threats_Vulnerabilities_Mitigations',
    domain: 'Threats, Vulnerabilities, and Mitigations',
  },
  '3': {
    name: '03_Security_Architecture',
    domain: 'Security Architecture',
  },
  '4': {
    name: '04_Security_Operations',
    domain: 'Security Operations',
  },
  '5': {
    name: '05_Security_Program_Management_Oversight',
    domain: 'Security Program Management and Oversight',
  },
}

export const SY0_701_OBJECTIVES: Array<{ code: string; title: string; rootDeckName: string }> = [
  { code: '1.1', title: 'Security Controls', rootDeckName: SY0_701_ROOT_DECKS['1'].name },
  { code: '1.2', title: 'Security Concepts', rootDeckName: SY0_701_ROOT_DECKS['1'].name },
  { code: '1.3', title: 'Change Management', rootDeckName: SY0_701_ROOT_DECKS['1'].name },
  { code: '1.4', title: 'Cryptographic Solutions', rootDeckName: SY0_701_ROOT_DECKS['1'].name },
  { code: '2.1', title: 'Threat Actors', rootDeckName: SY0_701_ROOT_DECKS['2'].name },
  { code: '2.2', title: 'Threat Vectors and Attack Surfaces', rootDeckName: SY0_701_ROOT_DECKS['2'].name },
  { code: '2.3', title: 'Types of Vulnerabilities', rootDeckName: SY0_701_ROOT_DECKS['2'].name },
  { code: '2.4', title: 'Indicators of Malicious Activity', rootDeckName: SY0_701_ROOT_DECKS['2'].name },
  { code: '2.5', title: 'Mitigation Techniques', rootDeckName: SY0_701_ROOT_DECKS['2'].name },
  { code: '3.1', title: 'Architecture Models', rootDeckName: SY0_701_ROOT_DECKS['3'].name },
  { code: '3.2', title: 'Applying Security Principles', rootDeckName: SY0_701_ROOT_DECKS['3'].name },
  { code: '3.3', title: 'Protecting Data', rootDeckName: SY0_701_ROOT_DECKS['3'].name },
  { code: '3.4', title: 'Resiliency and Recovery', rootDeckName: SY0_701_ROOT_DECKS['3'].name },
  { code: '4.1', title: 'Security Techniques', rootDeckName: SY0_701_ROOT_DECKS['4'].name },
  { code: '4.2', title: 'Asset Management', rootDeckName: SY0_701_ROOT_DECKS['4'].name },
  { code: '4.3', title: 'Vulnerability Management', rootDeckName: SY0_701_ROOT_DECKS['4'].name },
  { code: '4.4', title: 'Security Monitoring', rootDeckName: SY0_701_ROOT_DECKS['4'].name },
  { code: '4.5', title: 'Enterprise Security', rootDeckName: SY0_701_ROOT_DECKS['4'].name },
  { code: '4.6', title: 'Identity and Access Management', rootDeckName: SY0_701_ROOT_DECKS['4'].name },
  { code: '4.7', title: 'Automation and Orchestration', rootDeckName: SY0_701_ROOT_DECKS['4'].name },
  { code: '4.8', title: 'Incident Response', rootDeckName: SY0_701_ROOT_DECKS['4'].name },
  { code: '4.9', title: 'Security Data Sources', rootDeckName: SY0_701_ROOT_DECKS['4'].name },
  { code: '5.1', title: 'Security Governance', rootDeckName: SY0_701_ROOT_DECKS['5'].name },
  { code: '5.2', title: 'Risk Management', rootDeckName: SY0_701_ROOT_DECKS['5'].name },
  { code: '5.3', title: 'Third-party Risk', rootDeckName: SY0_701_ROOT_DECKS['5'].name },
  { code: '5.4', title: 'Security Compliance', rootDeckName: SY0_701_ROOT_DECKS['5'].name },
  { code: '5.5', title: 'Audits and Assessments', rootDeckName: SY0_701_ROOT_DECKS['5'].name },
  { code: '5.6', title: 'Security Awareness', rootDeckName: SY0_701_ROOT_DECKS['5'].name },
]

const rootDeckNameBySection = Object.fromEntries(
  Object.entries(SY0_701_ROOT_DECKS).map(([section, deck]) => [section, deck.name]),
)

const objectiveByCode = new Map(SY0_701_OBJECTIVES.map(objective => [objective.code, objective]))

export function getSecurityObjectiveDeckId(code: string): string {
  return `sy0-701-objective-${code.replace('.', '-')}`
}

export function getSecurityObjectiveDeckName(code: string): string {
  const objective = objectiveByCode.get(code)
  return objective ? `${objective.code} ${objective.title}` : code
}

export function inferSecurityRootDeckName(deckName: string): string | null {
  const exactRoot = Object.values(SY0_701_ROOT_DECKS).find(deck => deck.name === deckName)
  if (exactRoot) return exactRoot.name

  const sectionMatch = deckName.match(/::Section\s+([1-5])\s*:/i)
  if (!sectionMatch) return null
  return rootDeckNameBySection[sectionMatch[1]] ?? null
}

export function inferSecurityObjectiveCode(deckName: string): string | null {
  const objectiveMatch = deckName.match(/::\s*([1-5])\.(\d{1,2})(?:\.\d{1,2})?\s*:/)
  if (!objectiveMatch) return null
  const code = `${objectiveMatch[1]}.${Number(objectiveMatch[2])}`
  return objectiveByCode.has(code) ? code : null
}

export function buildSecurityDeckHierarchyPlan<T extends SecurityDeckLike>(
  decks: T[],
  now = Date.now(),
): SecurityDeckHierarchyPlan<T> {
  const activeDecks = decks.filter(deck => !deck.isDeleted)
  const byId = new Map(activeDecks.map(deck => [deck.id, deck]))
  const byName = new Map(activeDecks.map(deck => [deck.name, deck]))
  const rootIdByName = new Map<string, string>()

  for (const root of Object.values(SY0_701_ROOT_DECKS)) {
    const deck = byName.get(root.name)
    if (deck) rootIdByName.set(root.name, deck.id)
  }

  const upserts: T[] = []
  const updates: Array<{ id: string; changes: Partial<T> }> = []
  const objectiveIdByCode = new Map<string, string>()

  for (const objective of SY0_701_OBJECTIVES) {
    const rootId = rootIdByName.get(objective.rootDeckName)
    if (!rootId) continue

    const objectiveId = getSecurityObjectiveDeckId(objective.code)
    objectiveIdByCode.set(objective.code, objectiveId)
    const objectiveName = getSecurityObjectiveDeckName(objective.code)
    const existing = byId.get(objectiveId)

    if (!existing) {
      upserts.push({
        id: objectiveId,
        name: objectiveName,
        createdAt: now,
        updatedAt: now,
        source: 'system',
        parentDeckId: rootId,
      } as T)
      continue
    }

    const changes: Partial<T> = {}
    if (existing.name !== objectiveName) changes.name = objectiveName as T['name']
    if ((existing.parentDeckId ?? null) !== rootId) changes.parentDeckId = rootId as T['parentDeckId']
    if (existing.source !== 'system') changes.source = 'system' as T['source']
    if (Object.keys(changes).length > 0) {
      changes.updatedAt = now as T['updatedAt']
      updates.push({ id: existing.id, changes })
    }
  }

  const plannedObjectiveIds = new Set([
    ...objectiveIdByCode.values(),
    ...upserts.map(deck => deck.id),
  ])

  for (const deck of activeDecks) {
    const rootName = inferSecurityRootDeckName(deck.name)
    if (rootName === deck.name) {
      if (deck.parentDeckId) {
        updates.push({ id: deck.id, changes: { parentDeckId: null, updatedAt: now } as Partial<T> })
      }
      continue
    }

    if (plannedObjectiveIds.has(deck.id)) continue

    const fallbackRootId = rootName ? rootIdByName.get(rootName) : null
    const expectedParentId = fallbackRootId

    if (expectedParentId && (deck.parentDeckId ?? null) !== expectedParentId) {
      updates.push({
        id: deck.id,
        changes: {
          parentDeckId: expectedParentId,
          updatedAt: now,
        } as Partial<T>,
      })
    }
  }

  return { upserts, updates }
}

export function flattenDeckTree<T extends { subDecks?: T[] }>(decks: T[]): T[] {
  const result: T[] = []
  const visit = (deck: T) => {
    result.push(deck)
    for (const subDeck of deck.subDecks ?? []) visit(subDeck)
  }
  for (const deck of decks) visit(deck)
  return result
}
