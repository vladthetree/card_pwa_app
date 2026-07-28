/**
 * AI_CONTEXT:
 * Role: Home PWA install and notification permission actions.
 */
import { useCallback, useState } from 'react'
import { subscribeToWebPushNotifications } from '../../services/webPush'

export function usePwaInstallActions(input: {
  settings: {
    language: 'de' | 'en'
    dailyReminderEnabled: boolean
    dailyReminderTime: string
  }
  hasNativePrompt: boolean
  install: () => Promise<unknown>
  openInstallHintModal: () => void
}) {
  const { settings, hasNativePrompt, install, openInstallHintModal } = input
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof Notification === 'undefined') return 'unsupported'
    return Notification.permission
  })

  const handleInstall = useCallback(async () => {
    if (hasNativePrompt) {
      await install()
      return
    }
    openInstallHintModal()
  }, [hasNativePrompt, install, openInstallHintModal])

  const requestNotificationPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return

    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)

      if (permission === 'granted') {
        void subscribeToWebPushNotifications(settings.language, {
          enabled: settings.dailyReminderEnabled,
          time: settings.dailyReminderTime,
        })
      }
    } catch {
      // no-op: permission prompt is best effort
    }
  }, [settings.dailyReminderEnabled, settings.dailyReminderTime, settings.language])

  return {
    notificationPermission,
    handleInstall,
    requestNotificationPermission,
  }
}

