import { useEffect } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import { supportsServiceWorker } from '../env'
import { getSyncConfig, getOrCreateSyncClientId } from '../services/syncConfig'

export function useServiceWorkerConfig() {
  const { settings, isSettingsHydrated } = useSettings()

  useEffect(() => {
    if (!supportsServiceWorker()) return

    const sendConfig = async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        const config = getSyncConfig()
        reg.active?.postMessage({
          type: 'SYNC_CONFIG',
          endpoint: config.endpoint,
          clientId: getOrCreateSyncClientId(),
          authToken: config.authToken,
        })
      } catch {
        // best effort
      }
    }

    void sendConfig()
  }, [])

  useEffect(() => {
    if (!supportsServiceWorker() || !isSettingsHydrated) return

    const sendReminderConfig = async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        reg.active?.postMessage({
          type: 'DAILY_REMINDER_CONFIG',
          enabled: settings.dailyReminderEnabled,
          time: settings.dailyReminderTime,
          language: settings.language,
          nextDayStartsAt: settings.nextDayStartsAt,
        })
      } catch {
        // best effort
      }
    }

    void sendReminderConfig()
  }, [
    isSettingsHydrated,
    settings.dailyReminderEnabled,
    settings.dailyReminderTime,
    settings.language,
    settings.nextDayStartsAt,
  ])

  useEffect(() => {
    if (!supportsServiceWorker() || !isSettingsHydrated) return

    const sendNotificationsConfig = async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        reg.active?.postMessage({
          type: 'SW_NOTIFICATIONS_CONFIG',
          enabled: settings.notificationsEnabled,
          channels: settings.notificationChannels,
        })
      } catch {
        // best effort
      }
    }

    void sendNotificationsConfig()
  }, [isSettingsHydrated, settings.notificationChannels, settings.notificationsEnabled])

  useEffect(() => {
    if (!supportsServiceWorker()) return

    // Periodic Background Sync: SW-Listener existiert bereits für 'card-pwa-periodic-sync'.
    // Die Registrierung muss aus dem Haupt-Thread erfolgen (nicht aus dem SW selbst).
    const registerPeriodicSync = async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        const periodicSync = (reg as ServiceWorkerRegistration & {
          periodicSync?: {
            register: (tag: string, options: { minInterval: number }) => Promise<void>
            getTags: () => Promise<string[]>
          }
        }).periodicSync

        if (!periodicSync) return

        const tags = await periodicSync.getTags()
        if (!tags.includes('card-pwa-periodic-sync')) {
          await periodicSync.register('card-pwa-periodic-sync', {
            minInterval: 2 * 60 * 60 * 1000, // 2 Stunden
          })
        }
      } catch {
        // API nicht unterstützt oder Permission verweigert – best effort
      }
    }

    void registerPeriodicSync()
  }, [])
}
