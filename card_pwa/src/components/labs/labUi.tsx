import type { LabDifficulty } from '../../data/labScenarios'

/**
 * Schwierigkeits-Badges, Farbgebung rekonstruiert aus den Labs-Screenshots
 * (`…23.38.26.jpeg`: EINSTEIGER blau, FORTGESCHRITTEN amber; `…23.39.17.jpeg`:
 * EXPERTE rot/rose).
 */
export const LAB_DIFFICULTY_BADGE: Record<LabDifficulty, { label: string; cls: string }> = {
  einsteiger: { label: 'Einsteiger', cls: 'border-sky-500/40 bg-sky-500/10 text-sky-300' },
  fortgeschritten: { label: 'Fortgeschritten', cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
  experte: { label: 'Experte', cls: 'border-rose-500/40 bg-rose-500/10 text-rose-300' },
}
