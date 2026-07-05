/**
 * AI_CONTEXT: Runtime integration for sw Registration; handles browser/PWA lifecycle behavior outside ordinary React state.
 */
import { SW_CHANNELS } from '../constants/appIdentity'

type WaitingWorkerLike = {
  state?: string
  addEventListener?: (type: string, listener: () => void) => void
  postMessage?: (message: unknown) => void
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
  addEventListener?: (type: string, listener: () => void, options?: { once?: boolean }) => void
  removeEventListener?: (type: string, listener: () => void) => void
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

export interface ServiceWorkerStartupReadiness {
  status: 'unsupported' | 'ready' | 'updated-and-activated' | 'error' | 'timeout'
  activatedUpdate: boolean
}

export type ServiceWorkerRegistrationRuntime = (() => void) & {
  startupReady: Promise<ServiceWorkerStartupReadiness>
}

const STARTUP_UPDATE_TIMEOUT_MS = 5000

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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise(resolve => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      resolve(fallback)
    }, timeoutMs)

    promise.then(
      value => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(value)
      },
      () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(fallback)
      },
    )
  })
}

function waitForWorkerInstalled(worker: WaitingWorkerLike | null): Promise<void> {
  if (!worker?.addEventListener) return Promise.resolve()
  if (worker.state === 'installed' || worker.state === 'activated') return Promise.resolve()

  return new Promise(resolve => {
    worker.addEventListener?.('statechange', () => {
      if (worker.state === 'installed' || worker.state === 'activated') {
        resolve()
      }
    })
  })
}

function waitForControllerChange(container: ServiceWorkerContainerLike): Promise<void> {
  if (!container.addEventListener) return Promise.resolve()

  return new Promise(resolve => {
    container.addEventListener?.('controllerchange', () => resolve(), { once: true })
  })
}

async function prepareRegistrationForStartup(
  registration: ServiceWorkerRegistrationLike,
  deps: ServiceWorkerRegistrationDeps,
): Promise<ServiceWorkerStartupReadiness> {
  try {
    await registration.update().catch(() => {
      // Update checks can fail while offline. In that case the active cache is
      // still the best available version, so startup may continue.
    })

    if (registration.installing) {
      await withTimeout(
        waitForWorkerInstalled(registration.installing),
        STARTUP_UPDATE_TIMEOUT_MS,
        undefined,
      )
    }

    const waitingWorker = registration.waiting
    if (waitingWorker && deps.navigatorRef.serviceWorker.controller) {
      const controllerChanged = waitForControllerChange(deps.navigatorRef.serviceWorker)
      waitingWorker.postMessage?.({ type: 'SKIP_WAITING' })
      await withTimeout(controllerChanged, STARTUP_UPDATE_TIMEOUT_MS, undefined)
      return { status: 'updated-and-activated', activatedUpdate: true }
    }

    return { status: 'ready', activatedUpdate: false }
  } catch {
    return { status: 'error', activatedUpdate: false }
  }
}

function makeRuntimeHandle(
  dispose: () => void,
  startupReady: Promise<ServiceWorkerStartupReadiness>,
): ServiceWorkerRegistrationRuntime {
  return Object.assign(dispose, { startupReady })
}

export function initServiceWorkerRegistration(deps: ServiceWorkerRegistrationDeps): ServiceWorkerRegistrationRuntime {
  if (!deps.supportsServiceWorker) {
    return makeRuntimeHandle(
      () => {},
      Promise.resolve({ status: 'unsupported', activatedUpdate: false }),
    )
  }

  let disposeUpdateChecks: (() => void) | null = null
  let pendingLoadListener: (() => void) | null = null
  let resolveStartupReady: (value: ServiceWorkerStartupReadiness) => void = () => {}
  const startupReady = withTimeout(
    new Promise<ServiceWorkerStartupReadiness>(resolve => {
      resolveStartupReady = resolve
    }),
    STARTUP_UPDATE_TIMEOUT_MS + 1000,
    { status: 'timeout', activatedUpdate: false } satisfies ServiceWorkerStartupReadiness,
  )

  const registerServiceWorker = () => {
    deps.navigatorRef.serviceWorker
      .register(getServiceWorkerUrl(), { updateViaCache: 'none' })
      .then(registration => {
        disposeUpdateChecks?.()

        const emitUpdateEvent = (waitingWorker: WaitingWorkerLike | null) => {
          deps.windowRef.dispatchEvent(createUpdateEvent(waitingWorker))
        }

        const checkForUpdates = () => {
          return registration.update().catch(() => {
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

        void prepareRegistrationForStartup(registration, deps).then(resolveStartupReady)
      })
      .catch(error => {
        deps.onError?.(error)
        resolveStartupReady({ status: 'error', activatedUpdate: false })
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

  return makeRuntimeHandle(() => {
    if (pendingLoadListener) {
      deps.windowRef.removeEventListener('load', pendingLoadListener)
      pendingLoadListener = null
    }
    disposeUpdateChecks?.()
    disposeUpdateChecks = null
  }, startupReady)
}
