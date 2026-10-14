/**
 * AI_CONTEXT: Übersetzt eine FloorHint (warum die nächste Etage noch zu ist) in kurze, sachliche Zeilen —
 * nur, was konkret fehlt, nie als Schuldhinweis. Rein.
 */
import type { FloorHint } from './heroEconomy'
import { formatTemplate } from './formatTemplate'

export function buildFloorHintLines(hint: FloorHint | null, t: Record<string, string>): string[] {
  if (!hint) return []
  const lines: string[] = []
  const missingMature = hint.needMature - hint.haveMature
  if (missingMature > 0) lines.push(formatTemplate(t.hero_run_hint_mature, { n: missingMature }))
  const missingObjectives = hint.needObjectives - hint.haveObjectives
  if (missingObjectives > 0) lines.push(formatTemplate(t.hero_run_hint_objectives, { n: missingObjectives }))
  const missingDeep = (hint.needDeep ?? 0) - (hint.haveDeep ?? 0)
  if (missingDeep > 0) lines.push(formatTemplate(t.hero_run_hint_deep, { n: missingDeep }))
  const missingKept = (hint.needKept ?? 0) - (hint.haveKept ?? 0)
  if (missingKept > 0) lines.push(formatTemplate(t.hero_run_hint_kept, { n: missingKept }))
  const missingGear = hint.needGear - hint.haveGear
  if (missingGear > 0) lines.push(formatTemplate(t.hero_run_hint_gear, { n: missingGear }))
  return lines
}
