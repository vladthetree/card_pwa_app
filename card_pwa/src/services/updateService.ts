import { getRuntimeTarget, supportsServiceWorker, type RuntimeTarget } from '../env'

type ServiceWorkerRegistrationLike = {
  update: () => Promise<unknown>
}

type ServiceWorkerContainerLike = {
  getRegistration?: (clientURL?: string) => Promise<ServiceWorkerRegistrationLike | undefined>
  ready?: Promise<ServiceWorkerRegistrationLike>
}

export type UpdateCheckStatus = 'up-to-date' | 'unavailable' | 'error'

export interface UpdateCheckResult {
  status: UpdateCheckStatus
  runtime: RuntimeTarget
}

export interface UpdateCheckDeps {
  runtime?: RuntimeTarget
  serviceWorkerContainer?: ServiceWorkerContainerLike | null
}

function getServiceWorkerRegistrationUrl(): string {
  const buildToken = typeof __APP_SW_VERSION__ === 'string' && __APP_SW_VERSION__
    ? __APP_SW_VERSION__
    : typeof __APP_BUILD_STAMP__ === 'string' && __APP_BUILD_STAMP__
      ? __APP_BUILD_STAMP__
      : typeof __APP_BUILD_VERSION__ === 'string' && __APP_BUILD_VERSION__
        ? __APP_BUILD_VERSION__
        : 'dev'

  return `/service-worker.js?v=${encodeURIComponent(buildToken)}`
}

export async function checkForAppUpdates(deps: UpdateCheckDeps = {}): Promise<UpdateCheckResult> {
  const runtime = deps.runtime ?? getRuntimeTarget()

  if (!supportsServiceWorker() && !deps.serviceWorkerContainer) {
    return { status: 'unavailable', runtime }
  }

  const swContainer = deps.serviceWorkerContainer ?? navigator.serviceWorker
  if (!swContainer) {
    return { status: 'unavailable', runtime }
  }

  try {
    const registration =
      (swContainer.getRegistration ? await swContainer.getRegistration(getServiceWorkerRegistrationUrl()) : undefined)
      ?? (swContainer.ready ? await swContainer.ready : undefined)

    if (!registration) {
      return { status: 'unavailable', runtime }
    }

    await registration.update()
    return { status: 'up-to-date', runtime }
  } catch {
    return { status: 'error', runtime }
  }
}
