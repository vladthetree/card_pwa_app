/**
 * AI_CONTEXT:
 * Role: Notification-permission request/check flow shared by SettingsNotificationsSection
 * (daily reminder toggle) and SettingsDataSection (manual notification test buttons) —
 * both need the same permission gate and service-worker postMessage helper.
 * Used by: SettingsNotificationsSection.tsx, SettingsDataSection.tsx.
 */
import { useSettings, STRINGS } from '../../contexts/SettingsContext'

interface Params {
  setNotificationPermission: (permission: NotificationPermission | 'unsupported') => void
  setNotificationTestStatus: (status: string | null) => void
}

export function useNotificationPermissionFlow({ setNotificationPermission, setNotificationTestStatus }: Params) {
  const { settings } = useSettings()
  const t = STRINGS[settings.language]

  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      setNotificationPermission('unsupported')
      setNotificationTestStatus(t.notification_test_unsupported)
      return 'unsupported' as const
    }

    const permission = await Notification.requestPermission()
    setNotificationPermission(permission)
    setNotificationTestStatus(
      permission === 'granted'
        ? t.notification_test_permission_granted
        : t.notification_test_permission_denied
    )
    return permission
  }

  const ensureNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      setNotificationPermission('unsupported')
      setNotificationTestStatus(t.notification_test_unsupported)
      return false
    }

    const current = Notification.permission
    setNotificationPermission(current)

    if (current === 'granted') {
      return true
    }

    if (current === 'default') {
      const requested = await requestNotificationPermission()
      return requested === 'granted'
    }

    setNotificationTestStatus(t.notification_test_permission_required)
    return false
  }

  const postServiceWorkerMessage = async (payload: Record<string, unknown>) => {
    if (!('serviceWorker' in navigator)) {
      setNotificationTestStatus(t.notification_test_sw_unavailable)
      return false
    }

    try {
      const registration = await navigator.serviceWorker.ready
      registration.active?.postMessage(payload)
      navigator.serviceWorker.controller?.postMessage(payload)
      return true
    } catch {
      setNotificationTestStatus(t.notification_test_sw_unavailable)
      return false
    }
  }

  return { requestNotificationPermission, ensureNotificationPermission, postServiceWorkerMessage }
}
