import { useEffect } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import { supportsServiceWorker } from '../env'
import { subscribeToWebPushNotifications } from '../services/webPush'

export function useWebPushSubscription() {
  const { settings, isSettingsHydrated } = useSettings()

  useEffect(() => {
    if (!isSettingsHydrated) return
    if (!settings.notificationsEnabled) return
    if (!settings.notificationChannels.dailyReminder.enabled) return
    if (!settings.dailyReminderEnabled) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

    void subscribeToWebPushNotifications(settings.language, {
      enabled: settings.dailyReminderEnabled,
      time: settings.dailyReminderTime,
    })
  }, [
    isSettingsHydrated,
    settings.notificationsEnabled,
    settings.notificationChannels.dailyReminder.enabled,
    settings.dailyReminderEnabled,
    settings.dailyReminderTime,
    settings.language,
  ])

  useEffect(() => {
    if (!supportsServiceWorker()) return

    const onMessage = (event: MessageEvent) => {
      if (!event.data || event.data.type !== 'PUSH_SUBSCRIPTION_CHANGED') return
      if (!settings.notificationsEnabled) return
      if (!settings.notificationChannels.dailyReminder.enabled) return
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

      void subscribeToWebPushNotifications(settings.language, {
        enabled: settings.dailyReminderEnabled,
        time: settings.dailyReminderTime,
      })
    }

    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => {
      navigator.serviceWorker.removeEventListener('message', onMessage)
    }
  }, [
    settings.notificationsEnabled,
    settings.notificationChannels.dailyReminder.enabled,
    settings.dailyReminderEnabled,
    settings.dailyReminderTime,
    settings.language,
  ])
}
