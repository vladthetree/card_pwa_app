/**
 * Offline Detection Service
 * Überwacht Netzwerkstatus und benachrichtigt App
 */

import { isWeb } from '../env'

export type OnlineStatus = 'online' | 'offline' | 'slow'
const IS_DEV = import.meta.env.DEV

interface OfflineStatusListener {
  (status: OnlineStatus): void
}

class OfflineStatusService {
  private listeners: Set<OfflineStatusListener> = new Set()
  private currentStatus: OnlineStatus = isWeb() && !navigator.onLine ? 'offline' : 'online'

  constructor() {
    this.init()
  }

  private init() {
    if (!isWeb()) {
      this.setStatus('online')
      return
    }

    // Überwache Online/Offline Status
    window.addEventListener('online', () => this.setStatus('online'))
    window.addEventListener('offline', () => this.setStatus('offline'))

    // Optionale: Langsame Verbindung erkennen
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection) {
        connection.addEventListener('change', () => this.checkConnectionSpeed())
        this.checkConnectionSpeed()
      }
    }
  }

  private checkConnectionSpeed() {
    const connection = (navigator as any).connection
    if (!connection) return

    const effectiveType = connection.effectiveType
    // 4g = schnell, 3g/4g = mittel, 2g = langsam
    if (effectiveType === '4g') {
      this.setStatus('online')
    } else if (effectiveType === '3g') {
      // Gelegentliche Verzögerungen
      if (this.currentStatus !== 'slow') {
        this.setStatus('slow')
      }
    }
  }

  private setStatus(status: OnlineStatus) {
    if (status === this.currentStatus) return

    this.currentStatus = status
    if (IS_DEV) {
      console.log(`[OfflineStatus] Status changed to: ${status}`)
    }

    // Benachrichtige alle Listener
    this.listeners.forEach(listener => {
      try {
        listener(status)
      } catch (error) {
        console.error('[OfflineStatus] Error in listener:', error)
      }
    })
  }

  public getStatus(): OnlineStatus {
    return this.currentStatus
  }

  public isOnline(): boolean {
    return this.currentStatus !== 'offline'
  }

  public subscribe(listener: OfflineStatusListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}

// Singleton
export const offlineStatusService = new OfflineStatusService()
