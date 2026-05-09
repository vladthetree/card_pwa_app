export type CardVariant = 'standard' | 'mc' | 'ordering' | 'matching'

export function getCardVariant(front: string): CardVariant {
  const trimmed = front.trim()
  if (/^ORDERING:/i.test(trimmed)) return 'ordering'
  if (/^MATCHING:/i.test(trimmed)) return 'matching'
  return 'standard'
}
