import { fetchWithTimeout } from './syncConfig'

type Language = 'de' | 'en'

export interface DailyReminderPreferences {
  enabled: boolean
  time: string
}

const PUSH_SUBSCRIBE_ENDPOINT = (import.meta.env.VITE_PUSH_SUBSCRIBE_ENDPOINT as string | undefined)?.trim()
const VAPID_PUBLIC_KEY = (import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY as string | undefined)?.trim()

export type WebPushSubscribeStatus =
  | 'subscribed'
  | 'unsupported'
  | 'missing-vapid-key'
  | 'missing-subscribe-endpoint'
  | 'subscribe-endpoint-failed'
  | 'error'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

export async function subscribeToWebPushNotifications(
  language: Language,
  reminders?: DailyReminderPreferences,
): Promise<boolean> {
  const status = await subscribeToWebPushNotificationsWithStatus(language, reminders)
  return status === 'subscribed'
}

export async function subscribeToWebPushNotificationsWithStatus(
  language: Language,
  reminders?: DailyReminderPreferences,
): Promise<WebPushSubscribeStatus> {
  if (typeof window === 'undefined') return 'unsupported'
  if (!('serviceWorker' in navigator)) return 'unsupported'
  if (!('PushManager' in window)) return 'unsupported'

  try {
    const registration = await navigator.serviceWorker.ready
    if (!registration.pushManager) return 'unsupported'

    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      if (!VAPID_PUBLIC_KEY) {
        // No VAPID key configured yet; keep permission but skip remote subscription.
        return 'missing-vapid-key'
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    if (!subscription) return 'error'

    if (!PUSH_SUBSCRIBE_ENDPOINT) {
      return 'missing-subscribe-endpoint'
    }

    const payload = {
      subscription: subscription.toJSON(),
      language,
      reminders,
      userAgent: navigator.userAgent,
    }

    const response = await fetchWithTimeout(PUSH_SUBSCRIBE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, 10_000)

    if (!response.ok) {
      return 'subscribe-endpoint-failed'
    }

    return 'subscribed'
  } catch {
    return 'error'
  }
}
