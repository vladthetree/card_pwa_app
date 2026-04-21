export function getAppBuildVersion(): string {
  if (typeof __APP_BUILD_VERSION__ === 'string' && __APP_BUILD_VERSION__) {
    return __APP_BUILD_VERSION__
  }
  return '0.0.0'
}

export function getBuildStamp(): string {
  if (typeof __APP_BUILD_STAMP__ === 'string' && __APP_BUILD_STAMP__) {
    return __APP_BUILD_STAMP__
  }
  return ''
}

export function getServiceWorkerVersionToken(): string {
  if (typeof __APP_SW_VERSION__ === 'string' && __APP_SW_VERSION__) {
    return __APP_SW_VERSION__
  }

  const buildStamp = getBuildStamp()
  return buildStamp || getAppBuildVersion()
}

export function formatServiceWorkerVersionLabel(): string {
  return `v${getAppBuildVersion()}`
}

export function formatBuildVersionTitle(): string {
  return `App v${getAppBuildVersion()} · SW ${getServiceWorkerVersionToken()}`
}
