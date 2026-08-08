/**
 * AI_CONTEXT:
 * Role: Pure per-question mastery model of the video recall check — folds the
 *       append-only run history into a pass state per question (≥90% modeled
 *       recall probability, wrong answers only clearable on a LATER day) and
 *       selects the question set of the next run (pending questions plus a
 *       small refresh sample of the already-passed ones).
 * Used by: VideoRecallCheck (selection + result screen), utils/learningUnits
 *          (computeCourseStepState recall gating), VideosView (per-video tally).
 * Important: Deliberately separate from the card scheduler — it never touches
 *            FSRS card state and never records reviews. Pure and deterministic;
 *            `now` is always injected.
 */

/**
 * Bestehens-Modell des Abruf-Checks: Jede Frage eines Videos trägt einen
 * eigenen, rein additiven Abruf-Zustand (Stabilität in Tagen), der NUR aus den
 * gespeicherten Abruf-Läufen abgeleitet wird — der echte FSRS-Kartenplan
 * bleibt unangetastet.
 *
 * Wahrscheinlichkeit: Wir nutzen die FSRS-Vergessenskurve
 * R(t) = (1 + (19/81)·t/S)^(-1/2). Die Stabilität S ist dort per Definition
 * genau die Zeit, nach der R auf 90 % gefallen ist — „Karte ≥ 90 % bestanden“
 * ist damit exakt äquivalent zu „seit der letzten gültigen richtigen Antwort
 * sind höchstens S Tage vergangen“.
 *
 * Falsch-Antworten: Eine falsche Antwort setzt die Frage zurück und kann nur
 * durch eine richtige Antwort an einem SPÄTEREN Kalendertag getilgt werden
 * („die kommenden Tage erneut abgefragt“) — richtige Antworten am selben Tag
 * sind Übung, zählen aber nicht als Tilgung.
 */

const DAY_MS = 86_400_000
/** FSRS-5-Vergessenskurven-Faktor 19/81 (Decay −0,5): R(S) = 0,9. */
const FORGETTING_FACTOR = 19 / 81
/** Schwelle „bestanden“: modellierte Abrufwahrscheinlichkeit pro Frage. */
export const RECALL_PASS_RETENTION = 0.9
/** Stabilität nach der ersten gültigen richtigen Antwort (Tage). */
export const RECALL_BASE_STABILITY_DAYS = 3
/** Wachstumsfaktor je weiterer richtiger Antwort (an einem gültigen Tag). */
export const RECALL_STABILITY_GROWTH = 2.5
const RECALL_MAX_STABILITY_DAYS = 365
/** Folge-Checks: so viele bereits bestandene Fragen kommen als kleine
 *  Auffrischungs-Auswahl zu den offenen Fragen dazu. */
export const RECALL_REFRESH_SAMPLE_SIZE = 3

/** Strukturelle Teilmenge von VideoRecallRun (vermeidet einen Importzyklus mit
 *  utils/learningUnits, das dieses Modul fürs Schritt-Gating importiert). */
export interface RecallRunLike {
  questionIds: string[]
  /** Falsch beantwortete Fragen des Laufs; fehlt bei Alt-Läufen. */
  missedQuestionIds?: string[]
  correct: number
  total: number
  completedAt: number
}

export interface RecallQuestionMastery {
  questionId: string
  /** Frage je beantwortet (auswertbare Läufe)? */
  answered: boolean
  /** Modellierte Abrufwahrscheinlichkeit jetzt (0..1); 0 ohne gültige richtige Antwort. */
  retrievability: number
  /** ≥ 90 % UND kein ungetilgter Fehler → bestanden. */
  passed: boolean
  /** Lokaler Kalendertag des letzten ungetilgten Fehlers (null = keiner). */
  pendingWrongDay: string | null
}

export interface RecallMasteryResult {
  /** Zielmenge in Eingabereihenfolge. */
  questionIds: string[]
  passedQuestionIds: string[]
  /** Nicht bestandene Fragen: nie beantwortet, falsch beantwortet (ungetilgt)
   *  oder unter die 90 %-Schwelle abgeklungen. */
  pendingQuestionIds: string[]
  /** Abruf-Check bestanden: jede Frage der Zielmenge ≥ 90 %. */
  passed: boolean
  byQuestionId: Map<string, RecallQuestionMastery>
}

/** Lokaler Kalendertag (YYYY-MM-DD) eines Zeitstempels. Der Abruf-Check nutzt
 *  bewusst den Kalendertag, nicht den Lerntag-Umbruch des Schedulers — die
 *  „kommende Tage“-Regel ist eine eigene, additive Mechanik. */
export function formatLocalDayOf(ms: number): string {
  const date = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** FSRS-Vergessenskurve: Wahrscheinlichkeit nach `elapsedDays` bei Stabilität S. */
export function computeRecallRetrievability(stabilityDays: number, elapsedDays: number): number {
  if (stabilityDays <= 0) return 0
  const t = Math.max(0, elapsedDays)
  return Math.pow(1 + (FORGETTING_FACTOR * t) / stabilityDays, -0.5)
}

interface QuestionFoldState {
  answered: boolean
  stabilityDays: number
  correctStreak: number
  lastCountedCorrectAt: number | null
  pendingWrongDay: string | null
}

/** Antwort-Ereignisse pro Frage aus der Lauf-Historie. Alt-Läufe ohne
 *  `missedQuestionIds` sind nur auswertbar, wenn alles richtig war
 *  (correct === total) — sonst ist die Zuordnung mehrdeutig und der Lauf
 *  zählt nicht in den Pro-Frage-Zustand (wohl aber in Summen-Zähler). */
function foldRuns(runs: readonly RecallRunLike[]): Map<string, QuestionFoldState> {
  const byQuestionId = new Map<string, QuestionFoldState>()
  const chronological = [...runs].sort((a, b) => a.completedAt - b.completedAt)
  for (const run of chronological) {
    const missed = run.missedQuestionIds
    if (!missed && run.correct !== run.total) continue
    const missedSet = new Set(missed ?? [])
    const day = formatLocalDayOf(run.completedAt)
    for (const questionId of run.questionIds) {
      const state: QuestionFoldState = byQuestionId.get(questionId) ?? {
        answered: false,
        stabilityDays: 0,
        correctStreak: 0,
        lastCountedCorrectAt: null,
        pendingWrongDay: null,
      }
      state.answered = true
      if (missedSet.has(questionId)) {
        state.stabilityDays = 0
        state.correctStreak = 0
        state.lastCountedCorrectAt = null
        state.pendingWrongDay = day
      } else if (state.pendingWrongDay !== null && day <= state.pendingWrongDay) {
        // Richtig am Tag des Fehlers: Übung ohne Tilgung („kommende Tage“).
      } else {
        state.pendingWrongDay = null
        state.correctStreak += 1
        state.stabilityDays = Math.min(
          RECALL_MAX_STABILITY_DAYS,
          RECALL_BASE_STABILITY_DAYS * Math.pow(RECALL_STABILITY_GROWTH, state.correctStreak - 1),
        )
        state.lastCountedCorrectAt = run.completedAt
      }
      byQuestionId.set(questionId, state)
    }
  }
  return byQuestionId
}

/** Bestehens-Zustand der Zielmenge `questionIds` aus der Lauf-Historie. */
export function computeRecallMastery(input: {
  runs: readonly RecallRunLike[]
  questionIds: readonly string[]
  now: number
}): RecallMasteryResult {
  const folded = foldRuns(input.runs)
  const byQuestionId = new Map<string, RecallQuestionMastery>()
  const passedQuestionIds: string[] = []
  const pendingQuestionIds: string[] = []

  for (const questionId of input.questionIds) {
    const state = folded.get(questionId)
    const elapsedDays = state?.lastCountedCorrectAt !== null && state?.lastCountedCorrectAt !== undefined
      ? (input.now - state.lastCountedCorrectAt) / DAY_MS
      : Number.POSITIVE_INFINITY
    const retrievability = state ? computeRecallRetrievability(state.stabilityDays, elapsedDays) : 0
    const passed =
      state !== undefined
      && state.pendingWrongDay === null
      && state.lastCountedCorrectAt !== null
      && retrievability >= RECALL_PASS_RETENTION
    const mastery: RecallQuestionMastery = {
      questionId,
      answered: state?.answered ?? false,
      retrievability,
      passed,
      pendingWrongDay: state?.pendingWrongDay ?? null,
    }
    byQuestionId.set(questionId, mastery)
    ;(passed ? passedQuestionIds : pendingQuestionIds).push(questionId)
  }

  return {
    questionIds: [...input.questionIds],
    passedQuestionIds,
    pendingQuestionIds,
    passed: input.questionIds.length > 0 && pendingQuestionIds.length === 0,
    byQuestionId,
  }
}

/** Kumulierte Richtig/Falsch-Zähler eines Videos über alle Läufe. */
export function computeRecallRunTally(runs: readonly Pick<RecallRunLike, 'correct' | 'total'>[]): {
  correct: number
  wrong: number
} {
  let correct = 0
  let wrong = 0
  for (const run of runs) {
    correct += Math.max(0, run.correct)
    wrong += Math.max(0, run.total - run.correct)
  }
  return { correct, wrong }
}

// Deterministischer Shuffle (xmur3 + mulberry32), bewusst lokal dupliziert:
// utils/learningUnits importiert dieses Modul — die Gegenrichtung wäre ein Zyklus.
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return (h ^= h >>> 16) >>> 0
  }
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const rand = mulberry32(xmur3(seed)())
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Fragenmenge des nächsten Laufs: Erst-Check (oder alles offen/alles bestanden)
 * fragt IMMER die komplette Zielmenge; Folge-Checks fragen alle offenen Fragen
 * plus eine kleine Auffrischungs-Auswahl der bereits bestandenen. Gleicher Seed
 * (z. B. Video + Kalendertag) → gleiche Zusammenstellung.
 */
export function selectRecallRunQuestionIds(input: {
  questionIds: readonly string[]
  pendingQuestionIds: readonly string[]
  seed: string
}): string[] {
  const target = new Set(input.questionIds)
  const pending = input.pendingQuestionIds.filter(id => target.has(id))
  if (pending.length === 0 || pending.length === input.questionIds.length) {
    return seededShuffle(input.questionIds, input.seed)
  }
  const pendingSet = new Set(pending)
  const passedPool = input.questionIds.filter(id => !pendingSet.has(id))
  const refresh = seededShuffle(passedPool, `${input.seed}|refresh`).slice(0, RECALL_REFRESH_SAMPLE_SIZE)
  return seededShuffle([...pending, ...refresh], `${input.seed}|mix`)
}
