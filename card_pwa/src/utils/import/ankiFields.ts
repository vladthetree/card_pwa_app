import { stripHtml } from './htmlStrip'

export function extractExtra(fieldMap: Record<string, string>) {
  return {
    acronym: stripHtml(fieldMap.Acronym || ''),
    examples: stripHtml(fieldMap.Examples || ''),
    port: stripHtml(fieldMap.Port || ''),
    protocol: stripHtml(fieldMap.Protocol || ''),
  }
}

export function buildFieldMap(fieldNames: string[], flds: string): Record<string, string> {
  const values = flds.split('\x1f')
  const map: Record<string, string> = {}
  fieldNames.forEach((name, i) => {
    map[name] = values[i] || ''
  })
  return map
}

function pickFirstNonEmptyField(fieldMap: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = fieldMap[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value
    }
  }
  return ''
}

function getNonEmptyValues(values: string[]): string[] {
  return values.map(v => v.trim()).filter(Boolean)
}

export function extractFrontBack(fieldMap: Record<string, string>, values: string[]) {
  const nonEmptyValues = getNonEmptyValues(values)

  const frontRaw = pickFirstNonEmptyField(fieldMap, [
    'Front',
    'Vorderseite',
    'Question',
    'Frage',
    'Keyword',
    'Prompt',
    'Text',
  ]) || nonEmptyValues[0] || ''

  const backRaw = pickFirstNonEmptyField(fieldMap, [
    'Back',
    'Rückseite',
    'Answer',
    'Antwort',
    'Definition',
    'Back Extra',
    'Extra',
    'Explanation',
  ]) || nonEmptyValues[1] || ''

  return {
    front: stripHtml(frontRaw),
    back: stripHtml(backRaw),
  }
}
