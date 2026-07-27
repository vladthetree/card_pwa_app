/**
 * AI_CONTEXT:
 * Role: UI-only PWA runtime state for install/update surfaces.
 */
export interface PwaRuntimeSlice {
  installPromptAvailable: boolean
  serviceWorkerUpdateAvailable: boolean
  notificationsEnabled: boolean
  setInstallPromptAvailable: (available: boolean) => void
  setServiceWorkerUpdateAvailable: (available: boolean) => void
  setNotificationsEnabled: (enabled: boolean) => void
}

export interface PwaRuntimeSliceState {
  installPromptAvailable: boolean
  serviceWorkerUpdateAvailable: boolean
  notificationsEnabled: boolean
}

export const initialPwaRuntimeState: PwaRuntimeSliceState = {
  installPromptAvailable: false,
  serviceWorkerUpdateAvailable: false,
  notificationsEnabled: false,
}

