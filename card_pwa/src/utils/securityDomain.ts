/**
 * AI_CONTEXT: Leitet für Karten/Decks die SY0-701-Domäne (1–5) und Lernziel-Codes (1.1–5.6) ab.
 * Rein (build-, infer- und extract-Funktionen, kein I/O). Grundlage der Dungeon-Etagen: jede Domäne ist ein Dungeon.
 * Quellen der Zuordnung: stabile Deck-IDs (Kapitel-/Lernziel-Decks), Root-Deck-Namen, Elternkette.
 */
import { SY0_701_OBJECTIVES } from './securityDeckHierarchy'

export type SecurityDomainNumber = 1 | 2 | 3 | 4 | 5
export const SECURITY_DOMAIN_NUMBERS: readonly SecurityDomainNumber[] = [1, 2, 3, 4, 5]

const VALID_OBJECTIVE_CODES: ReadonlySet<string> = new Set(SY0_701_OBJECTIVES.map(objective => objective.code))
const MAX_PARENT_DEPTH = 8

function toDomain(value: string | undefined): SecurityDomainNumber | null {
  const parsed = Number(value)
  return parsed >= 1 && parsed <= 5 && Number.isInteger(parsed) ? (parsed as SecurityDomainNumber) : null
}

export function inferSecurityDomainFromDeckId(deckId: string): SecurityDomainNumber | null {
  // Echte IDs lauten z. B. "newinfo-chapter-1-domain-1-general-security-concepts".
  const chapter = deckId.match(/^newinfo-chapter-([1-5])(?:-|$)/)
  if (chapter) return toDomain(chapter[1])
  const objective = deckId.match(/^sy0-701-objective-([1-5])-\d+$/)
  if (objective) return toDomain(objective[1])
  // Port-/Protokoll-Deck: Lernziel 4.5 (Security Operations).
  if (deckId === 'sy0701-security-ports') return 4
  return null
}

export function inferSecurityDomainFromDeckName(name: string): SecurityDomainNumber | null {
  const root = name.match(/^0([1-5])_/)
  if (root) return toDomain(root[1])
  const section = name.match(/::Section\s+([1-5])\s*:/i)
  if (section) return toDomain(section[1])
  // "Chapter 3: Domain 3.0: Security Architecture"
  const chapter = name.match(/^Chapter\s+([1-5])\s*:/i)
  if (chapter) return toDomain(chapter[1])
  return null
}

export interface DeckDomainSource {
  id: string
  name: string
  parentDeckId?: string | null
}

/** Deck-ID → Domäne, inkl. Vererbung über die Elternkette. Decks ohne Bezug fehlen in der Map. */
export function buildDeckDomainIndex(decks: readonly DeckDomainSource[]): Map<string, SecurityDomainNumber> {
  const byId = new Map(decks.map(deck => [deck.id, deck]))
  const resolved = new Map<string, SecurityDomainNumber | null>()

  const resolve = (deckId: string, depth: number): SecurityDomainNumber | null => {
    if (resolved.has(deckId)) return resolved.get(deckId) ?? null
    const deck = byId.get(deckId)
    let domain = inferSecurityDomainFromDeckId(deckId)
    if (domain === null && deck) domain = inferSecurityDomainFromDeckName(deck.name)
    if (domain === null && deck?.parentDeckId && depth < MAX_PARENT_DEPTH) {
      domain = resolve(deck.parentDeckId, depth + 1)
    }
    resolved.set(deckId, domain)
    return domain
  }

  const index = new Map<string, SecurityDomainNumber>()
  for (const deck of decks) {
    const domain = resolve(deck.id, 0)
    if (domain !== null) index.set(deck.id, domain)
  }
  return index
}

/** Gültige Lernziel-Codes aus Tags wie "5.1" oder "Objective 4.5". */
export function extractObjectiveCodes(tags: readonly string[] | undefined): string[] {
  if (!tags || tags.length === 0) return []
  const codes = new Set<string>()
  for (const tag of tags) {
    for (const match of String(tag).matchAll(/(?<![\d.])([1-5]\.\d{1,2})(?![\d.])/g)) {
      if (VALID_OBJECTIVE_CODES.has(match[1])) codes.add(match[1])
    }
  }
  return [...codes]
}

export function getDomainFromObjectiveCode(code: string): SecurityDomainNumber | null {
  return toDomain(code.split('.')[0])
}
