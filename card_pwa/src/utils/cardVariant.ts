import { parseAnswerText, parseQuestionText, type Answer, type Question } from './cardTextParser'

export type CardVariant = 'standard' | 'mc' | 'ordering' | 'matching'

export function getCardVariant(front: string): CardVariant {
  const trimmed = front.trim()
  if (/^ORDERING:/i.test(trimmed)) return 'ordering'
  if (/^MATCHING:/i.test(trimmed)) return 'matching'
  return 'standard'
}

/**
 * M2 Drag-Match (Source of Truth: docs/M2-drag-match.md): genau vier
 * Optionen A-D und genau eine korrekte Antwort. Andere Multiple-Choice-Formen
 * bleiben Standardkarten mit Inline-Auswertung.
 */
export function isDragMatchShape(
  question: Pick<Question, 'options'>,
  answer: Pick<Answer, 'correctOptions'>,
): boolean {
  return Object.keys(question.options).length === 4 && answer.correctOptions.length === 1
}

export function isDragMatchCard(front: string, back: string): boolean {
  return isDragMatchShape(parseQuestionText(front), parseAnswerText(back))
}

/**
 * M3 Free Recall (neu generiert, ohne Originalquelle — Encoding definiert in
 * docs/M3-free-recall.md): eine Karte ist Free-Recall, wenn ihr `front` mit
 * `RECALL:` beginnt (analog ORDERING:/MATCHING:) oder sie den Tag
 * `free-recall` trägt. Bewusst keine Erweiterung von CardVariant, damit
 * bestehende Record<CardVariant, …>-Maps (Editor) unverändert bleiben.
 */
export function isFreeRecallCard(front: string, tags?: string[]): boolean {
  if (/^RECALL:/i.test(front.trim())) return true
  if (!tags) return false
  return tags.some(tag => tag.trim().toLowerCase().replace(/[\s_]+/g, '-') === 'free-recall')
}

/** Entfernt das `RECALL:`-Präfix für die Anzeige des Frage-Texts. */
export function stripFreeRecallPrefix(front: string): string {
  return front.trim().replace(/^RECALL:\s*/i, '')
}
