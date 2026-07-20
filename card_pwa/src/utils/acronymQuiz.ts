/**
 * AI_CONTEXT:
 * Role: Pure builder for acronym recognition questions ("Wofür steht X?") from the generated SY0-701 acronym crosswalk.
 * Used by: AcronymPracticeView.
 * Important: Deterministic given a seed — no I/O, no scheduling side effects.
 */
import type { AcronymMeaning } from '../data/sy0701Acronyms'

export interface AcronymQuestion {
  id: string
  abbr: string
  correctMeaning: string
  options: string[]
  correctIndex: number
  /** Kurzer Disambiguierungs-Hinweis für mehrdeutige Abkürzungen (z. B. MAC, PAM). */
  contextHint?: string
}

/**
 * Handverfasste Disambiguierung für die mehrdeutigen Abkürzungen (SY0-701:
 * MAC, PAM, RA, RBAC, SAN) — ohne Hinweis wären zwei Fragen zur selben
 * Abkürzung nicht unterscheidbar. Verankert an den Messer-Videos "Access
 * Controls" (MAC/RBAC), "Operating System Security" (MAC), "Certificates"
 * (SAN) sowie Standard-Security+-Begriffsabgrenzung (PAM, RA).
 */
const AMBIGUOUS_CONTEXT_HINTS: Record<string, string> = {
  'acr:sy0701:v7:mac:mandatory-access-control': 'Zugriffsmodell: Admin vergibt Labels wie „geheim"',
  'acr:sy0701:v7:mac:media-access-control': 'Netzwerk: feste Hardware-Adresse einer Netzwerkkarte',
  'acr:sy0701:v7:mac:message-authentication-code': 'Kryptografie: prüft Integrität/Echtheit einer Nachricht',
  'acr:sy0701:v7:pam:privileged-access-management': 'Verwaltung besonders privilegierter Konten',
  'acr:sy0701:v7:pam:pluggable-authentication-modules': 'Linux/Unix-Framework für Auth-Module',
  'acr:sy0701:v7:ra:recovery-agent': 'kann verschlüsselte Daten im Notfall wiederherstellen',
  'acr:sy0701:v7:ra:registration-authority': 'PKI: prüft Identität vor Zertifikatsausstellung',
  'acr:sy0701:v7:rbac:role-based-access-control': 'Rechte hängen an der Job-Rolle (Manager, Director, …)',
  'acr:sy0701:v7:rbac:rule-based-access-control': 'Rechte durch feste, system-erzwungene Regeln gesteuert',
  'acr:sy0701:v7:san:storage-area-network': 'dediziertes Hochgeschwindigkeits-Speichernetzwerk',
  'acr:sy0701:v7:san:subject-alternative-name': 'Zertifikatsfeld für zusätzliche/Wildcard-Hostnamen',
}

/** Mulberry32 — kleiner, deterministischer PRNG (keine Krypto-Anforderung, nur stabile Frage-Reihenfolge/Distraktoren). */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0
  }
  return h >>> 0
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function pickDistractors(pool: AcronymMeaning[], excludeAbbr: string, count: number, rand: () => number): string[] {
  const candidates = pool.filter(a => a.abbr !== excludeAbbr)
  const shuffled = shuffle(candidates, rand)
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of shuffled) {
    if (seen.has(c.meaning)) continue
    seen.add(c.meaning)
    out.push(c.meaning)
    if (out.length === count) break
  }
  return out
}

/**
 * Baut je Akronym-Bedeutungspaar eine "Wofür steht X?"-Frage mit 3
 * Distraktoren aus anderen Bedeutungen (nie derselben Abkürzung — das
 * verhindert eine zweite gültige Antwort bei mehrdeutigen Abkürzungen).
 */
export function buildAcronymQuestions(
  acronyms: readonly AcronymMeaning[],
  seed: number,
): AcronymQuestion[] {
  const rand = mulberry32(seed)
  const pool = [...acronyms]
  return acronyms.map(a => {
    const distractors = pickDistractors(pool, a.abbr, 3, rand)
    const options = shuffle([a.meaning, ...distractors], rand)
    return {
      id: a.acronymMeaningId,
      abbr: a.abbr,
      correctMeaning: a.meaning,
      options,
      correctIndex: options.indexOf(a.meaning),
      contextHint: AMBIGUOUS_CONTEXT_HINTS[a.acronymMeaningId],
    }
  })
}

/** Seed aus einem String ableiten (z. B. Datum oder Profil-ID) — stabile Session-Reihenfolge ohne globalen Zufallszustand. */
export function seedFrom(text: string): number {
  return hashString(text)
}

/** Zieht `count` Fragen deterministisch gemischt aus dem vollen Pool (für eine Übungsrunde statt aller 336 auf einmal). */
export function pickAcronymQuestions(
  all: readonly AcronymQuestion[],
  count: number,
  seed: number,
): AcronymQuestion[] {
  const rand = mulberry32(seed)
  return shuffle([...all], rand).slice(0, Math.min(count, all.length))
}
