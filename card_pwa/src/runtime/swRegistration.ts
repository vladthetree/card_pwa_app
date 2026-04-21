import { SW_CHANNELS } from '../constants/appIdentity'

type WaitingWorkerLike = {
  state?: string
  addEventListener?: (type: string, listener: () => void) => void
}

type ServiceWorkerRegistrationLike = {
  waiting: WaitingWorkerLike | null
  installing: WaitingWorkerLike | null
  update: () => Promise<unknown>
  addEventListener: (type: string, listener: () => void) => void
}

type ServiceWorkerContainerLike = {
  controller?: unknown
  register: (scriptURL: string, options: { updateViaCache: 'none' }) => Promise<ServiceWorkerRegistrationLike>
}

type WindowLike = {
  addEventListener: (type: string, listener: () => void, options?: { once?: boolean }) => void
  removeEventListener: (type: string, listener: () => void) => void
  dispatchEvent: (event: Event) => boolean
  setInterval: (handler: () => void, timeout?: number) => number
  clearInterval: (id: number) => void
}

type DocumentLike = {
  readyState: DocumentReadyState
  visibilityState: DocumentVisibilityState
  addEventListener: (type: string, listener: () => void) => void
  removeEventListener: (type: string, listener: () => void) => void
}

export interface ServiceWorkerRegistrationDeps {
  supportsServiceWorker: boolean
  navigatorRef: { serviceWorker: ServiceWorkerContainerLike }
  windowRef: WindowLike
  documentRef: DocumentLike
  onError?: (error: unknown) => void
}

function getServiceWorkerUrl(): string {
  const buildToken = typeof __APP_SW_VERSION__ === 'string' && __APP_SW_VERSION__
    ? __APP_SW_VERSION__
    : typeof __APP_BUILD_STAMP__ === 'string' && __APP_BUILD_STAMP__
      ? __APP_BUILD_STAMP__
      : typeof __APP_BUILD_VERSION__ === 'string' && __APP_BUILD_VERSION__
        ? __APP_BUILD_VERSION__
        : 'dev'

  return `/service-worker.js?v=${encodeURIComponent(buildToken)}`
}

function createUpdateEvent(waitingWorker: WaitingWorkerLike | null): Event {
  if (typeof CustomEvent !== 'undefined') {
    return new CustomEvent(SW_CHANNELS.updateEvent, {
      detail: { waitingWorker },
    })
  }

  return {
    type: SW_CHANNELS.updateEvent,
    detail: { waitingWorker },
  } as unknown as Event
}

export function initServiceWorkerRegistration(deps: ServiceWorkerRegistrationDeps): () => void {
  if (!deps.supportsServiceWorker) {
    return () => {}
  }

  let disposeUpdateChecks: (() => void) | null = null
  let pendingLoadListener: (() => void) | null = null

  const registerServiceWorker = () => {
    deps.navigatorRef.serviceWorker
      .register(getServiceWorkerUrl(), { updateViaCache: 'none' })
      .then(registration => {
        disposeUpdateChecks?.()

        const emitUpdateEvent = (waitingWorker: WaitingWorkerLike | null) => {
          deps.windowRef.dispatchEvent(createUpdateEvent(waitingWorker))
        }

        const checkForUpdates = () => {
          registration.update().catch(() => {
            // best effort: update checks can fail while offline
          })
        }

        if (registration.waiting) {
          emitUpdateEvent(registration.waiting)
        }

        registration.addEventListener('updatefound', () => {
          const worker = registration.installing
          if (!worker?.addEventListener) return

          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && deps.navigatorRef.serviceWorker.controller) {
              emitUpdateEvent(worker)
            }
          })
        })

        const onFocus = () => {
          checkForUpdates()
        }
        const onVisibilityChange = () => {
          if (deps.documentRef.visibilityState === 'visible') {
            checkForUpdates()
          }
        }

        deps.windowRef.addEventListener('focus', onFocus)
        deps.documentRef.addEventListener('visibilitychange', onVisibilityChange)
        const interval = deps.windowRef.setInterval(checkForUpdates, 5 * 60 * 1000)

        disposeUpdateChecks = () => {
          deps.windowRef.removeEventListener('focus', onFocus)
          deps.documentRef.removeEventListener('visibilitychange', onVisibilityChange)
          deps.windowRef.clearInterval(interval)
        }

        checkForUpdates()
      })
      .catch(error => {
        deps.onError?.(error)
      })
  }

  if (deps.documentRef.readyState === 'complete') {
    registerServiceWorker()
  } else {
    pendingLoadListener = () => {
      registerServiceWorker()
      pendingLoadListener = null
    }
    deps.windowRef.addEventListener('load', pendingLoadListener, { once: true })
  }

  return () => {
    if (pendingLoadListener) {
      deps.windowRef.removeEventListener('load', pendingLoadListener)
      pendingLoadListener = null
    }
    disposeUpdateChecks?.()
    disposeUpdateChecks = null
  }
}
