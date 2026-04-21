import { STORAGE_KEYS } from '../constants/appIdentity'

export interface ErrorLogEntry {
  id: string
  timestamp: number
  source: 'window.error' | 'window.unhandledrejection' | 'console.error' | 'error-boundary' | 'sync-queue'
  message: string
  details?: string
}

const MAX_LOG_ENTRIES = 500
let loggingInstalled = false
let originalConsoleError: typeof console.error | null = null

function safeJson(value: unknown): string {
  try {
    if (typeof value === 'string') return value
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function stringifyError(value: unknown): string {
  if (value instanceof Error) return value.message
  if (typeof value === 'string') return value
  return safeJson(value)
}

function stringifyDetails(value: unknown): string | undefined {
  if (value instanceof Error) {
    return value.stack ?? value.message
  }
  if (typeof value === 'string') return value
  const serialized = safeJson(value)
  return serialized === 'undefined' ? undefined : serialized
}

function readLogs(): ErrorLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.errorLog)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as ErrorLogEntry[] : []
  } catch {
    return []
  }
}

function writeLogs(entries: ErrorLogEntry[]): void {
  localStorage.setItem(STORAGE_KEYS.errorLog, JSON.stringify(entries.slice(-MAX_LOG_ENTRIES)))
}

export function logError(
  source: ErrorLogEntry['source'],
  message: string,
  details?: string
): void {
  const entries = readLogs()
  entries.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    timestamp: Date.now(),
    source,
    message,
    details,
  })
  writeLogs(entries)
}

export function getErrorLogs(): ErrorLogEntry[] {
  return readLogs().sort((a, b) => b.timestamp - a.timestamp)
}

export function clearErrorLogs(): void {
  localStorage.removeItem(STORAGE_KEYS.errorLog)
}

export function downloadErrorLogsAsTxt(): void {
  const logs = getErrorLogs()
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `card-pwa-error-log-${stamp}.txt`
  const lines: string[] = [
    '# card-pwa error log',
    `# exportedAt: ${new Date().toISOString()}`,
    `# entries: ${logs.length}`,
    '',
  ]

  for (const entry of logs) {
    lines.push(`[${new Date(entry.timestamp).toISOString()}] ${entry.source}`)
    lines.push(`message: ${entry.message}`)
    if (entry.details) {
      lines.push('details:')
      lines.push(entry.details)
    }
    lines.push('')
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function installGlobalErrorLogging(): () => void {
  if (loggingInstalled) return () => {}
  loggingInstalled = true

  const onWindowError = (event: ErrorEvent) => {
    const message = event.message || 'Unknown window error'
    const details = event.error instanceof Error
      ? stringifyDetails(event.error)
      : [event.filename, event.lineno, event.colno].filter(Boolean).join(':') || undefined
    logError('window.error', message, details)
  }

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    const message = stringifyError(event.reason)
    logError('window.unhandledrejection', message, stringifyDetails(event.reason))
  }

  window.addEventListener('error', onWindowError)
  window.addEventListener('unhandledrejection', onUnhandledRejection)

  if (!originalConsoleError) {
    originalConsoleError = console.error.bind(console)
    console.error = (...args: unknown[]) => {
      const [first, ...rest] = args
      const message = stringifyError(first)
      const details = rest.length > 0 ? rest.map(stringifyDetails).filter(Boolean).join('\n') : undefined
      logError('console.error', message, details)
      originalConsoleError?.(...args)
    }
  }

  return () => {
    window.removeEventListener('error', onWindowError)
    window.removeEventListener('unhandledrejection', onUnhandledRejection)
  }
}