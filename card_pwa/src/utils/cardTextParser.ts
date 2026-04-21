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
  question: string
  options: Record<string, string>
}

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

    return { question, options }
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
  correct: string | null
  correctOptions: string[]
  answer: string
  merkhilfe: string | null
  nicht: string | null
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
      correct,
      correctOptions,
      answer,
      merkhilfe,
      nicht,
    }
  }
}

/**
 * Legacy Export-Funktionen für Rückwärts-Kompatibilität
 * (werden bald durch die Klassen ersetzt)
 */

export function parseQuestionText(text: string) {
  return QuestionParser.parse(text)
}

export function parseAnswerText(text: string) {
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
