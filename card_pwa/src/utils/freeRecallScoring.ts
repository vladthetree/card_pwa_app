/**
 * AI_CONTEXT: Utility module for free Recall Scoring; provides pure helpers for scheduling, parsing, scoring, tags, video notes, backup, or app data transformations.
 */
/**
 * M3 Free Recall — Auswertung der Selbstbewertung (neu generiert, ohne
 * Originalquelle; siehe docs/M3-free-recall.md). Bewusst als reine Funktion
 * ausgelagert (gleiches Muster wie utils/dragMatchScoring.ts), damit der
 * Score-Pfad im Node/SSR-Test-Setup ohne jsdom testbar ist.
 *
 * "Gewusst" → 1.0: StudyView lässt die freie FSRS-Bewertung 1–4 zu.
 * "Nicht gewusst" → 0.0: StudyView erzwingt Rating 1 (Again) — dieselbe
 * Sonderregel wie bei falschen MC-/Drag-Match-Antworten (P2.2).
 */
export function scoreFreeRecallSelfCheck(known: boolean): number {
  return known ? 1.0 : 0.0
}
