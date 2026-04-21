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