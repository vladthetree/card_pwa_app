interface ParsedOptions {
  question: string
  options: Array<{ label: string; text: string }>
}

function indexToLabel(index: number): string {
  let n = index
  let result = ''
  do {
    result = String.fromCharCode(65 + (n % 26)) + result
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return result
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function dedupeByLabel<T extends { label: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  const result: T[] = []
  for (const item of items) {
    if (seen.has(item.label)) continue
    seen.add(item.label)
    result.push(item)
  }
  return result
}

function pickStartIndex<T extends { label: string; idx: number }>(items: T[]): number {
  const starter = items.find(item => item.label === 'A' || item.label === '1')
  return starter ? starter.idx : items[0]?.idx ?? 0
}

function parseLineOptions(lines: string[]): ParsedOptions | null {
  const parsed: Array<{ idx: number; label: string; text: string }> = []

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (!trimmed) continue

    const letterMatch = trimmed.match(/^([A-Z])\s*[\)\]:.\-]\s*(.+)$/)
    if (letterMatch) {
      parsed.push({ idx: i, label: letterMatch[1].toUpperCase(), text: letterMatch[2].trim() })
      continue
    }

    const numericMatch = trimmed.match(/^([0-9]{1,2})\s*[\)\]:.\-]\s*(.+)$/)
    if (numericMatch) {
      parsed.push({ idx: i, label: numericMatch[1], text: numericMatch[2].trim() })
    }
  }

  if (parsed.length < 2) return null

  const firstIdx = pickStartIndex(parsed)
  const question = lines.slice(0, firstIdx).join('\n').trim()

  const options = dedupeByLabel(
    parsed
      .filter(entry => entry.idx >= firstIdx)
      .sort((a, b) => a.idx - b.idx)
      .map(({ label, text }) => ({ label, text }))
  )

  if (options.length < 2) return null

  return { question, options }
}

function parseInlineOptions(front: string): ParsedOptions | null {
  const parsed: Array<{ idx: number; label: string; text: string }> = []

  const letterPattern = /(?:^|[\s\?\!\.\:\;])([A-Z])\s*[\):.]\s*([^\n]+?)(?=(?:[A-Z]\s*[\):.])|$)/g
  let m: RegExpExecArray | null
  while ((m = letterPattern.exec(front)) !== null) {
    parsed.push({ idx: m.index, label: m[1].toUpperCase(), text: m[2].trim() })
  }

  if (parsed.length < 2) {
    const numericPattern = /(?:^|[\s\?\!\.\:\;])([0-9]{1,2})\s*[\):.]\s*([^\n]+?)(?=(?:[0-9]{1,2}\s*[\):.])|$)/g
    while ((m = numericPattern.exec(front)) !== null) {
      parsed.push({ idx: m.index, label: m[1], text: m[2].trim() })
    }
  }

  if (parsed.length < 2) return null

  const firstIdx = pickStartIndex(parsed)
  const options = dedupeByLabel(
    parsed
      .filter(entry => entry.idx >= firstIdx)
      .sort((a, b) => a.idx - b.idx)
      .map(({ label, text }) => ({ label, text }))
  )

  if (options.length < 2) return null

  const question = front.slice(0, firstIdx).trim()

  return { question, options }
}

function parseOptions(front: string): ParsedOptions | null {
  const lines = front.split('\n')
  return parseLineOptions(lines) ?? parseInlineOptions(front)
}

function parseCorrectMarkers(back: string): string[] {
  const marker = back.match(/^\s*(?:>>\s*)?(?:CORRECT|RICHTIG):\s*([^\n|]+)/i)
  if (!marker) return []
  return marker[1]
    .split(/[\s,;/|]+/)
    .map(token => token.trim().toUpperCase())
    .filter(Boolean)
}

function stripCorrectMarker(back: string): string {
  return back.replace(/^\s*(?:>>\s*)?(?:CORRECT|RICHTIG):\s*[^\n|]+\s*\|?\s*/i, '').trim()
}

function mapCorrectMarkers(
  tokens: string[],
  options: Array<{ sourceLabel: string; text: string; letter: string }>,
  answerText: string
): string[] {
  if (tokens.length === 0 && answerText) {
    const byText = options.find(opt => normalizeWhitespace(opt.text) === normalizeWhitespace(answerText))
    return byText ? [byText.letter] : []
  }

  const mapped = new Set<string>()

  for (const token of tokens) {
    const byLabel = options.find(opt => opt.sourceLabel === token)
    if (byLabel) {
      mapped.add(byLabel.letter)
      continue
    }

    if (/^[0-9]+$/.test(token)) {
      const idx = Number(token) - 1
      if (idx >= 0 && idx < options.length) {
        mapped.add(options[idx].letter)
      }
      continue
    }

    const byLetter = options.find(opt => opt.letter === token)
    if (byLetter) {
      mapped.add(byLetter.letter)
    }
  }

  return Array.from(mapped)
}

export function normalizeImportedMcCard(front: string, back: string): { front: string; back: string } {
  const parsed = parseOptions(front)
  if (!parsed) return { front, back }

  const normalizedOptions = parsed.options.map((opt, idx) => ({
    letter: indexToLabel(idx),
    text: opt.text.trim(),
    sourceLabel: opt.label.toUpperCase(),
  }))

  if (normalizedOptions.length < 2) return { front, back }

  const answerText = stripCorrectMarker(back)
  const correctTokens = parseCorrectMarkers(back)
  const mappedCorrect = mapCorrectMarkers(correctTokens, normalizedOptions, answerText)

  const rebuiltFrontLines = [
    parsed.question,
    ...normalizedOptions.map(opt => `${opt.letter}: ${opt.text}`),
  ].filter(Boolean)

  if (mappedCorrect.length === 0) {
    return {
      front: rebuiltFrontLines.join('\n').trim(),
      back,
    }
  }

  return {
    front: rebuiltFrontLines.join('\n').trim(),
    back: `>> CORRECT: ${mappedCorrect.join(',')} | ${answerText || ' '}`.trim(),
  }
}
