import { describe, expect, it } from 'vitest'
import { initServiceWorkerRegistration } from '../../runtime/swRegistration'

type ListenerMap = Record<string, Array<() => void>>

function createListenerHost() {
  const listeners: ListenerMap = {}
  return {
    listeners,
    addEventListener: (type: string, listener: () => void) => {
      listeners[type] ??= []
      listeners[type].push(listener)
    },
    removeEventListener: (type: string, listener: () => void) => {
      listeners[type] = (listeners[type] ?? []).filter(existing => existing !== listener)
    },
    emit: (type: string) => {
      for (const listener of listeners[type] ?? []) {
        listener()
      }
    },
  }
}

function flushMicrotasks() {
  return Promise.resolve()
}

describe('service worker registration runtime guards', () => {
  it('registers service worker on web when support is available', async () => {
    const registeredUrls: string[] = []
    let updateCalls = 0

    const registration = {
      waiting: null,
      installing: null,
      update: async () => {
        updateCalls += 1
      },
      addEventListener: () => {},
    }

    const windowHost = createListenerHost()
    const documentHost = createListenerHost()
    const dispatched: Event[] = []

    const cleanup = initServiceWorkerRegistration({
      supportsServiceWorker: true,
      navigatorRef: {
        serviceWorker: {
          controller: {},
          register: async (scriptURL: string) => {
            registeredUrls.push(scriptURL)
            return registration
          },
        },
      },
      windowRef: {
        addEventListener: windowHost.addEventListener,
        removeEventListener: windowHost.removeEventListener,
        dispatchEvent: (event: Event) => {
          dispatched.push(event)
          return true
        },
        setInterval: () => 1,
        clearInterval: () => {},
      },
      documentRef: {
        readyState: 'complete',
        visibilityState: 'visible',
        addEventListener: documentHost.addEventListener,
        removeEventListener: documentHost.removeEventListener,
      },
    })

    await flushMicrotasks()

    expect(registeredUrls).toHaveLength(1)
    expect(registeredUrls[0]).toMatch(/^\/service-worker\.js\?v=/)
    expect(updateCalls).toBe(1)
    expect(windowHost.listeners.focus?.length ?? 0).toBe(1)
    expect(documentHost.listeners.visibilitychange?.length ?? 0).toBe(1)
    expect(dispatched).toHaveLength(0)

    cleanup()
  })

  it('does not register service worker when support is disabled', async () => {
    let registerCalls = 0

    initServiceWorkerRegistration({
      supportsServiceWorker: false,
      navigatorRef: {
        serviceWorker: {
          controller: undefined,
          register: async () => {
            registerCalls += 1
            return {
              waiting: null,
              installing: null,
              update: async () => {},
              addEventListener: () => {},
            }
          },
        },
      },
      windowRef: {
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
        setInterval: () => 1,
        clearInterval: () => {},
      },
      documentRef: {
        readyState: 'complete',
        visibilityState: 'visible',
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    })

    await flushMicrotasks()
    expect(registerCalls).toBe(0)
  })

  it('defers registration to load event when document is not ready', async () => {
    const registeredUrls: string[] = []

    const windowHost = createListenerHost()
    const documentHost = createListenerHost()

    initServiceWorkerRegistration({
      supportsServiceWorker: true,
      navigatorRef: {
        serviceWorker: {
          controller: {},
          register: async (scriptURL: string) => {
            registeredUrls.push(scriptURL)
            return {
              waiting: null,
              installing: null,
              update: async () => {},
              addEventListener: () => {},
            }
          },
        },
      },
      windowRef: {
        addEventListener: windowHost.addEventListener,
        removeEventListener: windowHost.removeEventListener,
        dispatchEvent: () => true,
        setInterval: () => 1,
        clearInterval: () => {},
      },
      documentRef: {
        readyState: 'loading',
        visibilityState: 'hidden',
        addEventListener: documentHost.addEventListener,
        removeEventListener: documentHost.removeEventListener,
      },
    })

    expect(registeredUrls).toHaveLength(0)
    expect(windowHost.listeners.load?.length ?? 0).toBe(1)

    windowHost.emit('load')
    await flushMicrotasks()

    expect(registeredUrls).toHaveLength(1)
    expect(registeredUrls[0]).toMatch(/^\/service-worker\.js\?v=/)
  })
})
