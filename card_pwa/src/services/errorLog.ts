/**
 * AI_CONTEXT: Application service for error Log; owns business logic outside React components for learning, sync, profile, update, or session flows.
 */
import { STORAGE_KEYS } from '../constants/appIdentity'
import { triggerDownload } from './downloadFile'
import { generateUuidV7 } from '../utils/id'

export interface ErrorLogEntry {
  id: string
  timestamp: number
  source:
    | 'window.error'
    | 'window.unhandledrejection'
    | 'console.error'
    | 'error-boundary'
    | 'sync-queue'
    | 'profile-api'
    | 'sync-api'
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
  try {
    localStorage.setItem(STORAGE_KEYS.errorLog, JSON.stringify(entries.slice(-MAX_LOG_ENTRIES)))
  } catch {
    // best effort
  }
}

export function logError(
  source: ErrorLogEntry['source'],
  message: string,
  details?: string
): void {
  const entries = readLogs()
  entries.push({
    id: generateUuidV7(),
    timestamp: Date.now(),
    source,
    message,
    details,
  })
  writeLogs(entries)
}

/** Reduziert eine API-Ziel-URL auf Pfad+Query fürs Logging (kein Host/Query-Secret-Leak). */
export function describeApiTarget(target: string): string {
  try {
    const base = typeof window === 'undefined' ? 'http://card-pwa.local' : window.location.origin
    const url = new URL(target, base)
    return `${url.pathname}${url.search}`
  } catch {
    return target.replace(/^https?:\/\/[^/]+/i, '')
  }
}

export function stringifyApiException(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

/** Gemeinsames Log-Format für fehlgeschlagene API-Aufrufe (Sync/Profile). */
export function logApiFailure(
  source: Extract<ErrorLogEntry['source'], 'sync-api' | 'profile-api'>,
  actionLabel: string,
  action: string,
  target: string,
  reason: string,
  details?: string,
): void {
  logError(
    source,
    `${actionLabel}: ${action}`,
    [
      `target: ${describeApiTarget(target)}`,
      `reason: ${reason}`,
      details,
    ].filter(Boolean).join('\n'),
  )
}

export function getErrorLogs(): ErrorLogEntry[] {
  return readLogs().sort((a, b) => b.timestamp - a.timestamp)
}

export function clearErrorLogs(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.errorLog)
  } catch {
    // best effort
  }
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
  triggerDownload(blob, filename)
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
