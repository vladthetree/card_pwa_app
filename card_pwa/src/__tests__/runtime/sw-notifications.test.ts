import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

type Listener = (event: any) => void

type LoadedSw = {
  listeners: Record<string, Listener[]>
  showNotification: ReturnType<typeof vi.fn>
  matchAll: ReturnType<typeof vi.fn>
  openWindow: ReturnType<typeof vi.fn>
}

function loadServiceWorker(): LoadedSw {
  const listeners: Record<string, Listener[]> = {}

  const showNotification = vi.fn(async () => undefined)
  const matchAll = vi.fn(async () => [])
  const openWindow = vi.fn(async () => undefined)

  const selfLike = {
    addEventListener: (type: string, listener: Listener) => {
      listeners[type] ??= []
      listeners[type].push(listener)
    },
    skipWaiting: vi.fn(async () => undefined),
    clients: {
      claim: vi.fn(async () => undefined),
      matchAll,
      openWindow,
    },
    registration: {
      showNotification,
      sync: { register: vi.fn(async () => undefined) },
      periodicSync: { register: vi.fn(async () => undefined) },
    },
    location: { origin: 'https://example.test' },
  }

  const cachesLike = {
    open: vi.fn(async () => ({
      add: vi.fn(async () => undefined),
      addAll: vi.fn(async () => undefined),
      put: vi.fn(async () => undefined),
      match: vi.fn(async () => null),
    })),
    match: vi.fn(async () => null),
    keys: vi.fn(async () => []),
    delete: vi.fn(async () => true),
  }

  const sourcePath = path.resolve(__dirname, '../../../public/service-worker.js')
  const source = fs.readFileSync(sourcePath, 'utf8')

  vm.runInNewContext(source, {
    self: selfLike,
    caches: cachesLike,
    fetch: vi.fn(async () => ({ ok: true, clone: () => ({ text: async () => '' }), text: async () => '' })),
    URL,
    console,
    setTimeout,
    clearTimeout,
    Promise,
  })

  return { listeners, showNotification, matchAll, openWindow }
}

function createEvent(overrides: Partial<any> = {}) {
  let pending: Promise<unknown> | null = null

  const event = {
    waitUntil: (promise: Promise<unknown>) => {
      pending = promise
    },
    ...overrides,
    get done() {
      return pending ?? Promise.resolve()
    },
  }

  return event as any
}

describe('service-worker notification handlers', () => {
  it('shows push notification with payload values when JSON payload is valid', async () => {
    const sw = loadServiceWorker()
    const pushHandler = sw.listeners.push?.[0]
    expect(pushHandler).toBeDefined()

    const event = createEvent({
      data: {
        json: () => ({
          language: 'de',
          title: 'Testtitel',
          body: 'Testinhalt',
          tag: 'custom-tag',
          icon: '/custom-icon.png',
          badge: '/custom-badge.png',
          url: '/?view=study',
        }),
      },
    })

    pushHandler(event)
    await event.done

    expect(sw.showNotification).toHaveBeenCalledTimes(1)
    const [title, options] = sw.showNotification.mock.calls[0]
    expect(title).toBe('Testtitel')
    expect(options.body).toBe('Testinhalt')
    expect(options.tag).toBe('custom-tag')
    expect(options.icon).toBe('/custom-icon.png')
    expect(options.badge).toBe('/custom-badge.png')
    expect(options.data.url).toBe('/?view=study')
  })

  it('falls back to defaults when push payload is malformed', async () => {
    const sw = loadServiceWorker()
    const pushHandler = sw.listeners.push?.[0]
    expect(pushHandler).toBeDefined()

    const event = createEvent({
      data: {
        json: () => {
          throw new Error('invalid json')
        },
        text: () => 'plain fallback payload',
      },
    })

    pushHandler(event)
    await event.done

    expect(sw.showNotification).toHaveBeenCalledTimes(1)
    const [title, options] = sw.showNotification.mock.calls[0]
    expect(title).toBe('New study notification')
    expect(options.body).toBe('plain fallback payload')
    expect(options.tag).toBe('card-pwa-push')
    expect(options.icon).toBe('/pwa-icons/icon-192.png')
    expect(options.badge).toBe('/pwa-icons/icon-192.png')
    expect(options.data.url).toBe('/')
  })

  it('shows a local test push notification when the message handler receives TEST_PUSH_NOTIFICATION', async () => {
    const sw = loadServiceWorker()
    const messageHandler = sw.listeners.message?.[0]
    expect(messageHandler).toBeDefined()

    messageHandler({
      data: {
        type: 'TEST_PUSH_NOTIFICATION',
        language: 'de',
        title: 'Lokaler Test',
        body: 'Manuell ausgelost',
        tag: 'manual-test',
        url: '/?view=study',
      },
    })

    expect(sw.showNotification).toHaveBeenCalledTimes(1)
    const [title, options] = sw.showNotification.mock.calls[0]
    expect(title).toBe('Lokaler Test')
    expect(options.body).toBe('Manuell ausgelost')
    expect(options.tag).toBe('manual-test')
    expect(options.data.url).toBe('/?view=study')
  })

  it('focuses existing window client and navigates to target URL on notification click', async () => {
    const sw = loadServiceWorker()
    const clickHandler = sw.listeners.notificationclick?.[0]
    expect(clickHandler).toBeDefined()

    const focus = vi.fn(async () => undefined)
    const navigate = vi.fn(async () => undefined)
    sw.matchAll.mockResolvedValue([{ focus, navigate }])

    const close = vi.fn(() => undefined)
    const event = createEvent({
      notification: {
        close,
        data: { url: '/?view=import' },
      },
    })

    clickHandler(event)
    await event.done

    expect(close).toHaveBeenCalledTimes(1)
    expect(sw.matchAll).toHaveBeenCalledWith({ type: 'window', includeUncontrolled: true })
    expect(focus).toHaveBeenCalledTimes(1)
    expect(navigate).toHaveBeenCalledWith('/?view=import')
    expect(sw.openWindow).not.toHaveBeenCalled()
  })

  it('opens a new window when no existing clients are available', async () => {
    const sw = loadServiceWorker()
    const clickHandler = sw.listeners.notificationclick?.[0]
    expect(clickHandler).toBeDefined()

    sw.matchAll.mockResolvedValue([])

    const event = createEvent({
      notification: {
        close: vi.fn(() => undefined),
        data: { url: '/?view=study' },
      },
    })

    clickHandler(event)
    await event.done

    expect(sw.openWindow).toHaveBeenCalledWith('/?view=study')
  })
})
