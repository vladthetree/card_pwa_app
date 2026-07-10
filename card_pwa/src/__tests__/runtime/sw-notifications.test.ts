/**
 * AI_CONTEXT: Vitest coverage for sw notifications; protects runtime behavior from regressions in the learning PWA.
 */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'
import { MOTIVATION_QUOTES } from '../../data/motivationQuotes'

type Listener = (event: any) => void

type LoadedSw = {
  listeners: Record<string, Listener[]>
  showNotification: ReturnType<typeof vi.fn>
  matchAll: ReturnType<typeof vi.fn>
  openWindow: ReturnType<typeof vi.fn>
  setNow: (value: string | number | Date) => void
}

type ServiceWorkerMotivationCatalog = Record<'de' | 'en', string[][]>

const serviceWorkerSourcePath = path.resolve(__dirname, '../../../public/service-worker.js')

function readServiceWorkerMotivationCatalog(): ServiceWorkerMotivationCatalog {
  const source = fs.readFileSync(serviceWorkerSourcePath, 'utf8')
  const match = source.match(/const DAILY_MOTIVATION_MESSAGES = (\{[\s\S]*?\n\})\n\nfunction normalizeMotivationLanguage/)
  if (!match) throw new Error('DAILY_MOTIVATION_MESSAGES not found in service-worker.js')
  return vm.runInNewContext(`(${match[1]})`) as ServiceWorkerMotivationCatalog
}

function toTimestamp(value: string | number | Date): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime()
}

function loadServiceWorker(initialNow: string | number | Date = '2026-07-09T20:00:00'): LoadedSw {
  const listeners: Record<string, Listener[]> = {}

  const showNotification = vi.fn(async () => undefined)
  const matchAll = vi.fn(async () => [])
  const openWindow = vi.fn(async () => undefined)
  const cacheStores = new Map<string, Map<string, Response>>()
  const nowRef = { value: toTimestamp(initialNow) }
  const MockDate = class extends Date {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(nowRef.value)
      } else if (args.length === 1) {
        super(args[0])
      } else {
        super(args[0], args[1], args[2], args[3], args[4], args[5], args[6])
      }
    }

    static now() {
      return nowRef.value
    }
  }

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
    open: vi.fn(async (name: string) => {
      if (!cacheStores.has(name)) cacheStores.set(name, new Map())
      const store = cacheStores.get(name)!
      return {
        add: vi.fn(async () => undefined),
        addAll: vi.fn(async () => undefined),
        put: vi.fn(async (request: RequestInfo | URL, response: Response) => {
          store.set(String(request), response)
        }),
        match: vi.fn(async (request: RequestInfo | URL) => store.get(String(request)) ?? null),
      }
    }),
    match: vi.fn(async () => null),
    keys: vi.fn(async () => []),
    delete: vi.fn(async () => true),
  }

  const source = fs.readFileSync(serviceWorkerSourcePath, 'utf8')

  vm.runInNewContext(source, {
    self: selfLike,
    caches: cachesLike,
    fetch: vi.fn(async () => ({ ok: true, clone: () => ({ text: async () => '' }), text: async () => '' })),
    URL,
    console,
    setTimeout,
    clearTimeout,
    Promise,
    Response,
    Date: MockDate,
  })

  return {
    listeners,
    showNotification,
    matchAll,
    openWindow,
    setNow: value => {
      nowRef.value = toTimestamp(value)
    },
  }
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
  it('keeps the offline service-worker motivation catalog in sync with the app catalog', () => {
    const swCatalog = readServiceWorkerMotivationCatalog()
    const appCatalog = {
      de: MOTIVATION_QUOTES.de.map(quote => [quote.title, quote.body]),
      en: MOTIVATION_QUOTES.en.map(quote => [quote.title, quote.body]),
    }

    expect(swCatalog).toEqual(appCatalog)
    expect(swCatalog.de.length).toBeGreaterThanOrEqual(60)
    expect(swCatalog.en.length).toBe(swCatalog.de.length)
  })

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

  it('routes daily motivation push payloads to the study view', async () => {
    const sw = loadServiceWorker()
    const pushHandler = sw.listeners.push?.[0]
    expect(pushHandler).toBeDefined()

    const event = createEvent({
      data: {
        json: () => ({
          channel: 'dailyMotivation',
          language: 'de',
          title: 'Heute nur die erste Karte.',
          body: 'Der Anfang ist der schwere Teil.',
        }),
      },
    })

    pushHandler(event)
    await event.done

    expect(sw.showNotification).toHaveBeenCalledTimes(1)
    const [title, options] = sw.showNotification.mock.calls[0]
    expect(title).toBe('Heute nur die erste Karte.')
    expect(options.body).toBe('Der Anfang ist der schwere Teil.')
    expect(options.tag).toBe('card-pwa-daily-motivation')
    expect(options.data.url).toBe('/?view=study')
  })

  it('uses slot-aware offline copy when a daily motivation push has no text payload', async () => {
    const sw = loadServiceWorker()
    const pushHandler = sw.listeners.push?.[0]
    expect(pushHandler).toBeDefined()

    for (const slot of [0, 1]) {
      const event = createEvent({
        data: {
          json: () => ({
            channel: 'dailyMotivation',
            language: 'de',
            dateKey: '2026-07-09',
            slot,
          }),
        },
      })
      pushHandler(event)
      await event.done
    }

    expect(sw.showNotification).toHaveBeenCalledTimes(2)
    const [firstTitle, firstOptions] = sw.showNotification.mock.calls[0]
    const [secondTitle, secondOptions] = sw.showNotification.mock.calls[1]
    expect(firstTitle).not.toBe(secondTitle)
    expect(firstOptions.data.slot).toBe(0)
    expect(secondOptions.data.slot).toBe(1)
    expect(firstOptions.data.messageIndex).not.toBe(secondOptions.data.messageIndex)
  })

  it('shows a rotating local daily motivation when configured without a push event', async () => {
    const sw = loadServiceWorker()
    const messageHandler = sw.listeners.message?.[0]
    expect(messageHandler).toBeDefined()

    const event = createEvent({
      data: {
        type: 'DAILY_REMINDER_CONFIG',
        enabled: true,
        time: '00:00',
        language: 'de',
        nextDayStartsAt: 0,
      },
    })

    messageHandler(event)
    await event.done

    expect(sw.showNotification).toHaveBeenCalledTimes(1)
    const [title, options] = sw.showNotification.mock.calls[0]
    expect(title).not.toBe('Tagesimpuls')
    expect(typeof title).toBe('string')
    expect(options.body).toEqual(expect.any(String))
    expect(options.tag).toBe('card-pwa-daily-motivation')
    expect(options.data.url).toBe('/?view=study')
  })

  it('avoids repeating the same local offline reminder on consecutive study days', async () => {
    const sw = loadServiceWorker('2026-01-18T20:00:00')
    const messageHandler = sw.listeners.message?.[0]
    expect(messageHandler).toBeDefined()

    const config = {
      type: 'DAILY_REMINDER_CONFIG',
      enabled: true,
      time: '00:00',
      language: 'de',
      nextDayStartsAt: 0,
    }

    const firstEvent = createEvent({ data: config })
    messageHandler(firstEvent)
    await firstEvent.done

    sw.setNow('2026-01-19T20:00:00')
    const secondEvent = createEvent({ data: config })
    messageHandler(secondEvent)
    await secondEvent.done

    expect(sw.showNotification).toHaveBeenCalledTimes(2)
    const [firstTitle, firstOptions] = sw.showNotification.mock.calls[0]
    const [secondTitle, secondOptions] = sw.showNotification.mock.calls[1]
    expect(firstTitle).not.toBe(secondTitle)
    expect(firstOptions.data.slot).toBe(2)
    expect(secondOptions.data.slot).toBe(2)
    expect(secondOptions.data.messageIndex).toBe((firstOptions.data.messageIndex + 1) % MOTIVATION_QUOTES.de.length)
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
