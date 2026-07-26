/**
 * AI_CONTEXT:
 * Role: Service-worker/cache cleanup helpers shared by the two lighter Settings
 * reset actions — "reset service worker" (SettingsDataSection) and the isolated
 * "PWA full reset" (SettingsPwaFullReset). Storage/cookie/IndexedDB wiping used only
 * by the full reset lives in SettingsPwaFullReset.tsx itself, not here.
 * Used by: SettingsDataSection.tsx, SettingsPwaFullReset.tsx.
 */
export const APP_STORAGE_PREFIXES = ['card-pwa-', 'anki-pwa-'] as const
const APP_SERVICE_WORKER_PATH = '/service-worker.js'

function isAppServiceWorkerRegistration(registration: ServiceWorkerRegistration) {
  const scriptUrls = [
    registration.active?.scriptURL,
    registration.waiting?.scriptURL,
    registration.installing?.scriptURL,
  ].filter((value): value is string => typeof value === 'string' && value.length > 0)

  return scriptUrls.some(scriptUrl => {
    try {
      return new URL(scriptUrl, window.location.origin).pathname === APP_SERVICE_WORKER_PATH
    } catch {
      return false
    }
  })
}

export async function unregisterAppServiceWorkers() {
  if (!('serviceWorker' in navigator)) return
  const registrations = await navigator.serviceWorker.getRegistrations()
  const appRegistrations = registrations.filter(isAppServiceWorkerRegistration)
  await Promise.all(appRegistrations.map(registration => registration.unregister()))
}

export async function deleteAppCaches() {
  if (typeof caches === 'undefined') return
  const keys = await caches.keys()
  const appKeys = keys.filter(key => APP_STORAGE_PREFIXES.some(prefix => key.startsWith(prefix)))
  await Promise.all(appKeys.map(key => caches.delete(key)))
}
