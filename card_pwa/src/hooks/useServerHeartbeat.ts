import { useEffect, useRef, useState } from 'react'
import { STRINGS } from '../i18n'
import {
  getSyncReachabilityState,
  startSyncReachabilityRuntime,
  subscribeToSyncReachability,
  type SyncReachabilityState,
} from '../services/syncReachability'

async function sendServiceWorkerStatusNotification(
  nextState: SyncReachabilityState,
  language: 'de' | 'en',
): Promise<void> {
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

export function useServerHeartbeat(language: 'de' | 'en') {
  const [state, setState] = useState<SyncReachabilityState>(() => getSyncReachabilityState())
  const previousStateRef = useRef<SyncReachabilityState | null>(null)

  useEffect(() => {
    const stopRuntime = startSyncReachabilityRuntime()
    const unsubscribe = subscribeToSyncReachability(nextState => {
      setState(nextState)

      if (previousStateRef.current !== null && previousStateRef.current !== nextState) {
        void sendServiceWorkerStatusNotification(nextState, language)
      }

      previousStateRef.current = nextState
    })

    const initialState = getSyncReachabilityState()
    setState(initialState)
    previousStateRef.current = initialState

    return () => {
      unsubscribe()
      stopRuntime()
    }
  }, [language])

  return {
    isConnected: state === 'connected',
    state,
  }
}
