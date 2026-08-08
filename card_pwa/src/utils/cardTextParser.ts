/**
 * AI_CONTEXT:
 * Role: Parser/normalizer for card front/back text, including standard MC, ordering, matching, HTML stripping, answer extraction, and display-safe text.
 * Used by: StudyView card renderers, VideoRecallCheck, card import, CardFormModal, and variant detection.
 * Important: This is the compatibility layer for stored card text formats; new card encodings must be parsed here before UI code relies on them.
 */
/**
 * TextParser: Zentrale Utilities für Text-Processing
 * Enthält HTML-Stripping und Entity-Normalisierung
 */
export class TextParser {
  private static readonly HTML_PATTERN = /<[^>]*>/g

  private static decodeEntities(text: string): string {
    if (typeof document === 'undefined') return text
    const el = document.createElement('textarea')
    el.innerHTML = text
    return el.value
  }

  /**
   * Entferne HTML-Tags und normalisiere Text
   */
  static stripHtml(text: string): string {
    if (!text) return ''
    return text
      .replace(this.HTML_PATTERN, '')
      .replace(/&nbsp;/g, ' ')
      .trim()
  }

  /**
   * Normalisiere HTML-Entities (z.B. aus PDF-Quellen)
   */
  static normalizeHtmlEntities(text: string): string {
    if (!text) return ''
    const normalized = text
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#39;/g, "'")
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    return this.decodeEntities(normalized).trim()
  }
}

// ─── Question Parser ─────────────────────────────────────────────────────

export interface Question {
  type: 'standard'
  question: string
  options: Record<string, string>
}

// ─── Ordering Types ──────────────────────────────────────────────────────

export interface OrderingQuestion {
  type: 'ordering'
  question: string
  items: string[]
}

export interface OrderingAnswer {
  type: 'ordering'
  correctOrder: number[]  // 0-based indices in correct order
  explanation: string
  merkhilfe: string | null
}

// ─── Matching Types ──────────────────────────────────────────────────────

export interface MatchingQuestion {
  type: 'matching'
  question: string
  pairs: Array<{ left: string; right: string }>
}

export interface MatchingAnswer {
  type: 'matching'
  pairs: Array<{ left: string; right: string }>
  explanation: string
  merkhilfe: string | null
}

export type AnyQuestion = Question | OrderingQuestion | MatchingQuestion
export type AnyAnswer   = Answer   | OrderingAnswer   | MatchingAnswer

/**
 * QuestionParser: Parsst Frage-Seite einer Karte
 * Extrahiert Frage und Multiple-Choice-Optionen
 */
export class QuestionParser {
  private static readonly OPTION_LINE_PATTERN = /^([A-Z]|[0-9]{1,2})\s*[:\)]\s*(.+)$/

  private static uniqueByLabel(entries: Array<{ label: string; value: string }>): Array<{ label: string; value: string }> {
    const seen = new Set<string>()
    const unique: Array<{ label: string; value: string }> = []
    for (const entry of entries) {
      if (seen.has(entry.label)) continue
      seen.add(entry.label)
      unique.push(entry)
    }
    return unique
  }

  private static buildOptionsFromCandidates(
    candidates: Array<{ idx: number; label: string; value: string }>
  ): { options: Record<string, string>; startIdx: number } | null {
    if (candidates.length < 2) return null

    const startCandidate = candidates.find(entry => entry.label === 'A' || entry.label === '1') ?? candidates[0]
    const filtered = candidates.filter(entry => entry.idx >= startCandidate.idx)
    const unique = this.uniqueByLabel(filtered.map(entry => ({ label: entry.label, value: entry.value })))
    if (unique.length < 2) return null

    const options: Record<string, string> = {}
    unique.forEach((entry, index) => {
      const mappedLabel = String.fromCharCode(65 + index)
      options[mappedLabel] = entry.value
    })

    return { options, startIdx: startCandidate.idx }
  }

  /**
   * Parsst die Frage-Seite
   */
  static parse(text: string): Question {
    const normalized = TextParser.normalizeHtmlEntities(text)
    const parsed = this.extractOptions(normalized)
    const options = parsed?.options ?? {}
    const hasOptions = Object.keys(options).length >= 2

    let question = normalized

    if (hasOptions && parsed) {
      const lines = normalized.split('\n')
      question = lines.slice(0, parsed.startLine).join('\n').trim()
    }

    return { type: 'standard', question, options }
  }

  /**
   * Extrahiere Multiple-Choice-Optionen
   * Unterstützt drei Formate:
   * - Inline: "A: Text B: Text C: Text D: Text"
   * - Zeilenweise mit Klammer: "A) Text" auf separaten Zeilen
   * - Zeilenweise mit Doppelpunkt: "A: Text" auf separaten Zeilen
   * @private
   */
  private static extractOptions(text: string): { options: Record<string, string>; startLine: number } | null {
    const lines = text.split('\n')

    // Zeilenweise Optionen sammeln
    const candidates: Array<{ idx: number; label: string; value: string }> = []
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim()
      const lineMatch = trimmed.match(this.OPTION_LINE_PATTERN)
      if (lineMatch) {
        candidates.push({
          idx: i,
          label: lineMatch[1].toUpperCase(),
          value: lineMatch[2].trim(),
        })
      }
    }

    const byLine = this.buildOptionsFromCandidates(candidates)
    if (byLine) {
      return { options: byLine.options, startLine: byLine.startIdx }
    }

    // Inline-Fallback (A: ...B: ...C: ...)
    const inlinePattern = /(?:^|[\s\?\!\.\:\;])([A-Z]|[0-9]{1,2})\s*[:\)]\s*([^\n]+?)(?=(?:[A-Z]|[0-9]{1,2})\s*[:\)]|$)/g
    const inlineCandidates: Array<{ idx: number; label: string; value: string }> = []
    let match: RegExpExecArray | null
    while ((match = inlinePattern.exec(text)) !== null) {
      inlineCandidates.push({
        idx: match.index,
        label: match[1].toUpperCase(),
        value: match[2].trim(),
      })
    }

    const byInline = this.buildOptionsFromCandidates(inlineCandidates)
    if (byInline) {
      const startLine = text.slice(0, byInline.startIdx).split('\n').length - 1
      return { options: byInline.options, startLine }
    }

    return null
  }
}

// ─── Answer Parser ──────────────────────────────────────────────────────

export interface Answer {
  type: 'standard'
  correct: string | null
  correctOptions: string[]
  answer: string
  merkhilfe: string | null
  nicht: string | null
  /** Per canonical option key (A, B, …). Stored under `Nicht:` as
   *  `A | Begründung`; raw `nicht` remains the legacy fallback. */
  incorrectReasons: Record<string, string>
}

/**
 * AnswerParser: Parsst Antwort-Seite einer Karte
 * Extrahiert korrekte Antwort, Merkhilfe und Ausschlüsse
 */
export class AnswerParser {
  private static extractCorrectOptions(text: string): string[] {
    const marker = text.match(/(?:>>\s*)?(?:CORRECT|RICHTIG)\s*:\s*([^\n|]+)/i)
    if (!marker) return []

    return marker[1]
      .split(/[\s,;/|]+/)
      .map(token => token.trim().toUpperCase())
      .filter(token => /^[A-Z]+$/.test(token))
  }

  private static extractIncorrectReasons(text: string | null): Record<string, string> {
    if (!text) return {}
    const reasons: Record<string, string> = {}
    for (const line of text.split('\n')) {
      const match = line.trim().match(/^([A-Z]|[0-9]{1,2})\s*(?:\||:|\))\s*(.+)$/i)
      if (!match) continue
      const key = match[1].toUpperCase()
      const reason = match[2].trim()
      if (reason) reasons[key] = reason
    }
    return reasons
  }

  /**
   * Parsst die Antwort-Seite
   */
  static parse(text: string): Answer {
    const normalized = TextParser.normalizeHtmlEntities(text)

    const correctOptions = this.extractCorrectOptions(normalized)
    const correct = correctOptions[0] ?? null

    // Entferne die Correct-Markierung am Anfang
    const cleaned = normalized
      .replace(/^\s*(?:>>\s*)?(?:CORRECT|RICHTIG)\s*:\s*[^\n|]+\|?\s*/i, '')
      .trim()

    // Finde Sektionen
    const merkhilfeIdx = cleaned.indexOf('Merkhilfe:')
    const nichtIdx = cleaned.indexOf('Nicht:')

    // Parse die Sektionen
    let answer = cleaned
    let merkhilfe: string | null = null
    let nicht: string | null = null

    if (merkhilfeIdx !== -1) {
      answer = cleaned.substring(0, merkhilfeIdx).trim()

      if (nichtIdx !== -1 && nichtIdx > merkhilfeIdx) {
        merkhilfe = cleaned.substring(merkhilfeIdx + 10, nichtIdx).trim()
        nicht = cleaned.substring(nichtIdx + 5).trim()
      } else {
        merkhilfe = cleaned.substring(merkhilfeIdx + 10).trim()
      }
    } else if (nichtIdx !== -1) {
      answer = cleaned.substring(0, nichtIdx).trim()
      nicht = cleaned.substring(nichtIdx + 5).trim()
    }

    return {
      type: 'standard',
      correct,
      correctOptions,
      answer,
      merkhilfe,
      nicht,
      incorrectReasons: this.extractIncorrectReasons(nicht),
    }
  }
}

// ─── Ordering Parser ──────────────────────────────────────────────────────

export class OrderingParser {
  private static readonly HEADER = /^ORDERING:\s*/i
  private static readonly ITEM   = /^(\d+)[.)]\s+(.+)$/

  static isOrdering(text: string): boolean {
    return this.HEADER.test(text.trim())
  }

  static parse(text: string): OrderingQuestion {
    const normalized = TextParser.normalizeHtmlEntities(text)
    const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean)

    const itemLines: string[] = []
    const questionLines: string[] = []
    let headerSeen = false

    for (const line of lines) {
      if (!headerSeen) { headerSeen = true; continue }
      const m = line.match(this.ITEM)
      if (m) {
        itemLines.push(m[2].trim())
      } else {
        questionLines.push(line)
      }
    }

    return { type: 'ordering', question: questionLines.join(' ').trim(), items: itemLines }
  }
}

export class OrderingAnswerParser {
  private static readonly ORDER_LINE = /^CORRECT_ORDER:\s*([\d,\s]+)/i

  static parse(text: string): OrderingAnswer {
    const normalized = TextParser.normalizeHtmlEntities(text)
    const lines = normalized.split('\n')

    let correctOrder: number[] = []
    const rest: string[] = []

    for (const line of lines) {
      const m = line.match(this.ORDER_LINE)
      if (m) {
        correctOrder = m[1].split(',')
          .map(s => parseInt(s.trim(), 10) - 1)  // 1-based → 0-based
          .filter(n => !isNaN(n))
      } else {
        rest.push(line)
      }
    }

    const joined = rest.join('\n').trim()
    const merkhilfeIdx = joined.indexOf('Merkhilfe:')
    const explanation = merkhilfeIdx !== -1 ? joined.slice(0, merkhilfeIdx).trim() : joined
    const merkhilfe  = merkhilfeIdx !== -1 ? joined.slice(merkhilfeIdx + 10).trim() : null

    return { type: 'ordering', correctOrder, explanation, merkhilfe }
  }
}

// ─── Matching Parser ──────────────────────────────────────────────────────

export class MatchingParser {
  private static readonly HEADER = /^MATCHING:\s*/i
  private static readonly PAIR   = /^(.+?)\s*>>\s*(.+)$/

  static isMatching(text: string): boolean {
    return this.HEADER.test(text.trim())
  }

  static parse(text: string): MatchingQuestion {
    const normalized = TextParser.normalizeHtmlEntities(text)
    const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean)

    const pairs: Array<{ left: string; right: string }> = []
    const questionLines: string[] = []
    let headerSeen = false

    for (const line of lines) {
      if (!headerSeen) { headerSeen = true; continue }
      const m = line.match(this.PAIR)
      if (m) {
        pairs.push({ left: m[1].trim(), right: m[2].trim() })
      } else {
        questionLines.push(line)
      }
    }

    return { type: 'matching', question: questionLines.join(' ').trim(), pairs }
  }
}

export class MatchingAnswerParser {
  private static readonly PAIR = /^(.+?)\s*=\s*(.+)$/

  static parse(text: string): MatchingAnswer {
    const normalized = TextParser.normalizeHtmlEntities(text)
    const lines = normalized.split('\n')
    const pairs: Array<{ left: string; right: string }> = []
    const rest: string[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      const m = trimmed.match(this.PAIR)
      if (m && !trimmed.startsWith('Merkhilfe')) {
        pairs.push({ left: m[1].trim(), right: m[2].trim() })
      } else {
        rest.push(line)
      }
    }

    const joined = rest.join('\n').trim()
    const idx = joined.indexOf('Merkhilfe:')
    const explanation = idx !== -1 ? joined.slice(0, idx).trim() : joined
    const merkhilfe = idx !== -1 ? joined.slice(idx + 10).trim() : null

    return { type: 'matching', pairs, explanation, merkhilfe }
  }
}

// ─── Dispatch Functions ───────────────────────────────────────────────────

export function parseQuestion(text: string): AnyQuestion {
  if (OrderingParser.isOrdering(text)) return OrderingParser.parse(text)
  if (MatchingParser.isMatching(text))  return MatchingParser.parse(text)
  return QuestionParser.parse(text)
}

export function parseAnswer(text: string, questionType: AnyQuestion['type']): AnyAnswer {
  if (questionType === 'ordering') return OrderingAnswerParser.parse(text)
  if (questionType === 'matching') return MatchingAnswerParser.parse(text)
  return AnswerParser.parse(text)
}

/**
 * MC-only-Varianten: parsen Multiple-Choice direkt, ohne die Ordering/Matching-
 * Erkennung von parseQuestion/parseAnswer. Für Aufrufer, die den Kartentyp
 * bereits kennen (z. B. der MC-Zweig in buildRecallCardView).
 */

export function parseMcQuestion(text: string) {
  return QuestionParser.parse(text)
}

export function parseMcAnswer(text: string) {
  return AnswerParser.parse(text)
}

export function stripHtml(text: string): string {
  return TextParser.stripHtml(text)
}

export function normalizeHtmlEntities(text: string): string {
  return TextParser.normalizeHtmlEntities(text)
}

export function formatDeckName(name: string): string {
  return name.replace(/_/g, ' ')
}
