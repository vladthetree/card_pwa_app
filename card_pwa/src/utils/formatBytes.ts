/**
 * AI_CONTEXT: Utility module for formatBytes; formats a byte count for display,
 * auto-scaling to the largest fitting unit (B/KB/MB/GB).
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value < 10 && unit > 1 ? 1 : 0)} ${units[unit]}`
}
