import { useEffect, useRef, useState } from 'react'
import { STORAGE_KEYS } from '../constants/appIdentity'
import { STRINGS } from '../i18n'

const ENV_SYNC_ENDPOINT = import.meta.env.VITE_SYNC_ENDPOINT as string | undefined
const HEARTBEAT_INTERVAL_MS = 20_000
const HEARTBEAT_TIMEOUT_MS = 4_000

type HeartbeatState = 'connected' | 'disconnected'

interface PersistedSettings {
  sync?: {
    enabled?: boolean
    endpoint?: string
    mode?: 'local' | 'vpn-placeholder'
  }
}

function readSyncSettings(): PersistedSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings)
    return raw ? (JSON.parse(raw) as PersistedSettings) : null
  } catch {
    return null
  }
}

function getSyncEndpoint(): string {
  const persisted = readSyncSettings()
  const enabled = persisted?.sync?.enabled ?? Boolean(ENV_SYNC_ENDPOINT)
  const endpoint = persisted?.sync?.endpoint?.trim() || ENV_SYNC_ENDPOINT || ''
  const mode = persisted?.sync?.mode ?? 'local'

  if (!enabled || mode !== 'local' || !endpoint) {
    return ''
  }

  return endpoint
}

function toHealthUrl(endpoint: string): string {
  try {
    const base = typeof window === 'undefined' ? undefined : window.location.origin
    const url = new URL(endpoint, base)
    url.pathname = '/health'
    url.search = ''
    url.hash = ''
    if (url.origin === base) {
      return `${url.pathname}${url.search}${url.hash}`
    }
    return url.toString()
  } catch {
    return ''
  }
}

async function sendServiceWorkerStatusNotification(nextState: HeartbeatState, language: 'de' | 'en'): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || typeof Notification === 'undefined') {
    return
  }

  if (Notification.permission !== 'granted') {
    return
  }

  const connected = nextState === 'connected'
  const s = STRINGS[language]
  const payload = {
    type: 'SERVER_STATUS_NOTIFICATION',
    title: connected ? s.server_status_connected_title : s.server_status_disconnected_title,
    body: connected ? s.server_status_connected_body : s.server_status_disconnected_body,
    connected,
  }

  try {
    const registration = await navigator.serviceWorker.ready
    registration.active?.postMessage(payload)
    navigator.serviceWorker.controller?.postMessage(payload)
  } catch {
    // no-op: notification is best effort
  }
}

async function checkServerReachable(healthUrl: string): Promise<boolean> {
  if (!navigator.onLine) {
    return false
  }

  if (!healthUrl) {
    return false
  }

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), HEARTBEAT_TIMEOUT_MS)

  try {
    const response = await fetch(healthUrl, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    })
    return response.ok
  } catch {
    return false
  } finally {
    window.clearTimeout(timeout)
  }
}

export function useServerHeartbeat(language: 'de' | 'en') {
  const [state, setState] = useState<HeartbeatState>('disconnected')
  const previousStateRef = useRef<HeartbeatState | null>(null)

  useEffect(() => {
    let disposed = false

    const runHeartbeat = async () => {
      const endpoint = getSyncEndpoint()
      const healthUrl = toHealthUrl(endpoint)
      const reachable = await checkServerReachable(healthUrl)
      const nextState: HeartbeatState = reachable ? 'connected' : 'disconnected'

      if (disposed) return

      setState(nextState)

      if (previousStateRef.current !== null && previousStateRef.current !== nextState) {
        void sendServiceWorkerStatusNotification(nextState, language)
      }

      previousStateRef.current = nextState
    }

    const onServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'SERVER_HEARTBEAT') return
      const next = event.data?.state
      if (next !== 'connected' && next !== 'disconnected') return

      const nextState = next as HeartbeatState
      setState(nextState)

      if (previousStateRef.current !== null && previousStateRef.current !== nextState) {
        void sendServiceWorkerStatusNotification(nextState, language)
      }

      previousStateRef.current = nextState
    }

    void runHeartbeat()

    const interval = window.setInterval(() => {
      navigator.serviceWorker?.controller?.postMessage({ type: 'FORCE_HEARTBEAT_CHECK' })
      void runHeartbeat()
    }, HEARTBEAT_INTERVAL_MS)

    const onOnline = () => {
      void runHeartbeat()
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker?.controller?.postMessage({ type: 'APP_VISIBLE' })
        void runHeartbeat()
      }
    }

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOnline)
    document.addEventListener('visibilitychange', onVisibility)
    navigator.serviceWorker?.addEventListener('message', onServiceWorkerMessage)

    return () => {
      disposed = true
      window.clearInterval(interval)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOnline)
      document.removeEventListener('visibilitychange', onVisibility)
      navigator.serviceWorker?.removeEventListener('message', onServiceWorkerMessage)
    }
  }, [language])

  return {
    isConnected: state === 'connected',
    state,
  }
}
