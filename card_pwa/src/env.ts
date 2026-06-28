/**
 * AI_CONTEXT: Runtime environment helpers; normalizes build-time and sync endpoint configuration for the PWA.
 */
export type RuntimeTarget = 'web'

export function isWeb(): boolean {
  return true
}

export function getRuntimeTarget(): RuntimeTarget {
  return 'web'
}

export function supportsServiceWorker(): boolean {
  return isWeb() && typeof navigator !== 'undefined' && 'serviceWorker' in navigator
}

export function supportsPwaInstallPrompt(): boolean {
  return isWeb()
}