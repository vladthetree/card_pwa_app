/**
 * AI_CONTEXT: Utility module for videoRecallCardView; builds the recall-check
 * view-model for a deck card or curated transcript question (used by
 * VideoRecallCheck and TagCollectionPanel).
 */
import type { Card } from '../types'
import type { TranscriptQuestion } from '../data/messerTranscriptQuestions'
import {
  parseQuestion,
  parseAnswer,
  parseMcAnswer,
  stripHtml,
  type MatchingAnswer,
  type OrderingAnswer,
} from './cardTextParser'
import { MESSER_VIDEO_BY_QUESTION_ID, normalizeMesserVideoTitle } from '../data/messerVideoQuestionMap'

export const MESSER_RECALL_QUESTION_PATTERN = /^(M([1-5])-\d{3}):\s+\S/
const NON_MESSER_RECALL_TAGS = new Set(['acronyms', 'acronym-bonus', 'pbq', 'drag-drop'])

/**
 * Karte gehört genau dann in den Abruf-Check, wenn sie eine fertige
 * Messer-MC-Frage ist UND laut generiertem Mapping zu genau diesem Video
 * gehört. Fragen ohne Mapping-Eintrag werden bewusst ausgeschlossen —
 * lieber weniger Fragen als Fragen aus dem falschen Video (in dem Fall das
 * Mapping neu generieren, siehe messerVideoQuestionMap.ts).
 */
export function isProfessorMesserRecallCard(card: Card, objective?: string, videoTitle?: string): boolean {
  const match = MESSER_RECALL_QUESTION_PATTERN.exec(card.front.trim())
  if (!match) return false
  const [, questionId, domain] = match

  const objectiveDomain = objective?.split('.')[0]
  if (objectiveDomain && domain !== objectiveDomain) return false

  if (card.tags.some(tag => NON_MESSER_RECALL_TAGS.has(tag.trim().toLowerCase()))) return false

  if (videoTitle) {
    const mappedTitle = MESSER_VIDEO_BY_QUESTION_ID[questionId]
    if (!mappedTitle) return false
    return normalizeMesserVideoTitle(mappedTitle) === normalizeMesserVideoTitle(videoTitle)
  }
  return true
}

export interface RecallCardView {
  prompt: string
  /** MC-Optionen in Anzeigereihenfolge; leer bei Ordering/Matching/Plain. */
  options: Array<{ label: string; text: string; correct: boolean }>
  answer: string
  merkhilfe: string | null
}

/**
 * Bereitet eine Karte für die Abruf-Ansicht auf: MC-Fragen strukturiert
 * (Optionen einzeln, korrekte markiert, Erklärung/Merkhilfe getrennt),
 * alle anderen Typen als schlichte Frage/Antwort-Ansicht.
 */
export function buildRecallCardView(card: Card, optionOrder?: readonly number[]): RecallCardView {
  const question = parseQuestion(card.front)
  const prompt = (question.question || stripHtml(card.front))
    .replace(/^M[1-5]-\d{3}:\s*/, '') // interne Fragen-ID, für Lernende nur Rauschen
    .trim()

  let answer = ''
  let options: RecallCardView['options'] = []
  let merkhilfe: string | null = null

  if (question.type === 'ordering') {
    const parsed = parseAnswer(card.back, 'ordering') as OrderingAnswer
    const ordered = parsed.correctOrder
      .map((idx, position) => `${position + 1}. ${question.items[idx] ?? ''}`.trim())
      .filter(Boolean)
      .join('\n')
    answer = [ordered, parsed.explanation].filter(Boolean).join('\n\n')
    merkhilfe = parsed.merkhilfe
  } else if (question.type === 'matching') {
    const parsed = parseAnswer(card.back, 'matching') as MatchingAnswer
    answer = parsed.pairs.map(pair => `${pair.left} = ${pair.right}`).join('\n')
    merkhilfe = parsed.merkhilfe
  } else {
    const parsed = parseMcAnswer(card.back)
    const sourceOptions = Object.entries(question.options)
    const order = optionOrder && optionOrder.length === sourceOptions.length
      ? optionOrder
      : sourceOptions.map((_entry, index) => index)
    options = order.map((sourceIndex, position) => {
      const [sourceLabel, text] = sourceOptions[sourceIndex]
      return {
        label: OPTION_LABELS[position] ?? String(position + 1),
        text: stripHtml(text).trim(),
        correct: parsed.correctOptions.includes(sourceLabel),
      }
    })
    merkhilfe = parsed.merkhilfe
    // Ohne erkannte korrekte Option gäbe die Optionsliste beim Aufdecken keine
    // Antwort preis — dann lieber die schlichte Text-Ansicht.
    if (options.length > 0 && !options.some(option => option.correct)) options = []
    if (options.length > 0) {
      // Optionen samt Markierung übernehmen die Antwort-Rolle; übrig bleibt die
      // Erklärung. Wiederholt sie eingangs nur den Text der korrekten Option
      // (Kartenformat "C | Confidentiality\n\nErklärung…"), fällt das weg.
      answer = parsed.answer
      const correctText = options.find(option => option.correct)?.text
      const answerLines = stripHtml(answer).trim().split('\n')
      if (correctText && answerLines[0]?.trim() === correctText) {
        answer = answerLines.slice(1).join('\n').trim()
      }
    } else {
      answer = [
        parsed.correct && question.options[parsed.correct]
          ? `${parsed.correct}: ${question.options[parsed.correct]}`
          : '',
        parsed.answer,
      ].filter(Boolean).join('\n\n')
    }
  }

  const cleanPrompt = stripHtml(prompt).trim()
  const cleanAnswer = stripHtml(answer).trim()
  return {
    prompt: cleanPrompt || '—',
    options,
    answer: cleanAnswer || (options.length > 0 ? '' : stripHtml(card.back).trim() || '—'),
    merkhilfe: merkhilfe ? stripHtml(merkhilfe).trim() || null : null,
  }
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const

/**
 * Bereitet eine kuratierte Transkript-Frage für die Abruf-Ansicht auf.
 * `order` ist eine Permutation der Options-Indizes (Mischen pro Session, damit
 * sich nicht die Buchstabenposition statt des Inhalts einprägt).
 */
export function buildTranscriptQuestionView(
  question: TranscriptQuestion,
  order: readonly number[] = [0, 1, 2, 3],
): RecallCardView {
  return {
    prompt: question.q,
    options: order.map((sourceIndex, position) => ({
      label: OPTION_LABELS[position],
      text: question.options[sourceIndex],
      correct: sourceIndex === question.correct,
    })),
    answer: question.why,
    merkhilfe: null,
  }
}

/** Ein Quiz-Eintrag: gemappte Deck-Karte oder kuratierte Transkript-Frage. */
export interface RecallQuizItem {
  source: 'deck' | 'transcript'
  view: RecallCardView
  /** Nur bei `source === 'deck'` gesetzt (für den Study-Handoff). */
  card?: Card
  /** Stabile Fragen-ID (M-ID der Karte bzw. T-ID der Transkriptfrage). */
  questionId?: string
}

/** T-ID einer Transkriptfrage: positional, 1-basiert (`T006-01` = erste Frage
 *  von Video 006) — identisch zur Vergabe im Content-Map-Generator. */
export function transcriptQuestionId(videoIndex: number, position: number): string {
  return `T${String(videoIndex).padStart(3, '0')}-${String(position + 1).padStart(2, '0')}`
}
