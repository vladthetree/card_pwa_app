/**
 * AI_CONTEXT: Utility module for drag Match Scoring; provides pure helpers for scheduling, parsing, scoring, tags, video notes, backup, or app data transformations.
 */
import type { Answer } from './cardTextParser'

/**
 * Pure scoring for the M2 "Drag-Match" study renderer.
 *
 * Extracted here so the correctness contract can be unit-tested without a DOM —
 * the repo's tests run in Node + `renderToStaticMarkup`, not jsdom, so there is
 * no way to simulate a real drag/click. The renderer calls these helpers on the
 * exact code path it ships, so the unit tests cover production behaviour.
 *
 * Correctness is tracked by the card's CANONICAL option key (A/B/C/D parsed from
 * the `front`, matched against `>> CORRECT: X` in the `back`) — NOT by the letter
 * shown on screen. DragMatchCard shuffles the options and relabels them by display
 * position, so the visible letter of the correct answer can differ from the
 * canonical one (verified on the ZTNA card: canonical "B" is shown as "D" in the
 * Drag-Match screenshots from 2026-06-08).
 */
type CorrectMarker = Pick<Answer, 'correct' | 'correctOptions'>

/** The canonical option key (e.g. "B") the card marks as correct, or '' if none. */
export function correctDragMatchKey(answer: CorrectMarker): string {
  return answer.correctOptions[0] ?? answer.correct ?? ''
}

/**
 * 1 for the canonical-correct option, 0 otherwise. Feeds FSRS via
 * `onAnswerEvaluated` exactly like the inline tap-MC path in CardFace.
 */
export function scoreDragMatchChoice(answer: CorrectMarker, chosenKey: string): number {
  const key = correctDragMatchKey(answer)
  return key !== '' && chosenKey === key ? 1 : 0
}
