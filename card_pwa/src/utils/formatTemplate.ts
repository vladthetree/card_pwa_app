/**
 * AI_CONTEXT: Setzt {name}-Platzhalter in übersetzten Texten ein (z. B. "{count} Karten").
 */
export function formatTemplate(template: string | undefined, values: Record<string, string | number>): string {
  if (!template) return ''
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match))
}
