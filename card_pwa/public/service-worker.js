/* eslint-disable no-restricted-globals */

function resolveServiceWorkerVersion() {
  try {
    const scopeUrl = typeof self.location?.href === 'string' ? self.location.href : 'http://local.invalid/service-worker.js'
    const url = new URL(scopeUrl)
    return url.searchParams.get('v') || 'dev'
  } catch {
    return 'dev'
  }
}

const SW_VERSION = resolveServiceWorkerVersion()
const CACHE_NAME = `card-pwa-${SW_VERSION}`
const CACHE_PREFIXES = ['card-pwa-', 'anki-pwa-']

const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-icons/icon-192.png',
]

const APP_SHELL_ASSET_REGEX = /(?:src|href)=["']([^"']+)["']/g
const JS_ASSET_REF_REGEX = /(?:\/|\.\/)?assets\/[A-Za-z0-9._-]+\.(?:js|css|wasm)(?:\?[^"'\s)]*)?/g
const MAX_PRECACHE_GRAPH_ASSETS = 120

const OFFLINE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Offline</title>
    <style>
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #09090f; color: #f4f4f5; display: grid; min-height: 100vh; place-items: center; }
      .card { width: min(92vw, 560px); border: 1px solid rgba(255,255,255,.15); border-radius: 18px; padding: 1.25rem; background: rgba(15, 15, 24, 0.9); }
      h1 { margin: 0 0 .5rem; font-size: 1.1rem; }
      p { margin: 0 0 .75rem; color: rgba(244, 244, 245, 0.75); line-height: 1.45; }
      a { color: #60a5fa; text-decoration: none; } a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>You're offline</h1>
      <p>Card_PWA couldn't load. <a href="/">Tap here to retry</a>, or wait — this page reconnects automatically.</p>
    </div>
    <script>
      // Auto-reload as soon as the device is back online so users are never
      // permanently trapped on this page (Issue #5).
      window.addEventListener('online', function () { window.location.href = '/' })
    </script>
  </body>
</html>`

// ─── Sync Queue DB names (must match app constants) ────────────────────
const SYNC_QUEUE_DB_NAME = 'card-pwa-sync-queue'
const SYNC_QUEUE_STORE = 'queue'
const SETTINGS_KEY = 'card-pwa-settings'
const CLIENT_ID_KEY = 'card-pwa-sync-client-id'
const BACKUP_APP_ID = 'card-pwa'
const SYNC_FETCH_TIMEOUT_MS = 15000
const HEARTBEAT_INTERVAL_MS = 20000
const HEARTBEAT_TIMEOUT_MS = 4000
const CRITICAL_DUE_THRESHOLD = 150
const DAILY_REMINDER_STATE_CACHE = 'card-pwa-runtime-state'
const DAILY_REMINDER_STATE_URL = '/__daily-reminder-state'
const KPI_ALERT_STATE_URL = '/__kpi-alert-state'
const ACTIVE_SESSION_SNAPSHOT_URL = '/__active-session-snapshot'

let dailyReminderEnabled = false
let dailyReminderTime = '20:00'
let dailyReminderLanguage = 'de'
let swNotificationsEnabled = true
const defaultNotificationChannels = {
  dailyReminder: { enabled: true, title: '', body: '' },
  kpiAlert: { enabled: true, title: '', body: '' },
  serverStatus: { enabled: true, title: '', body: '' },
  pushGeneral: { enabled: true, title: '', body: '' },
  pushTest: { enabled: true, title: '', body: '' },
}
let swNotificationChannels = { ...defaultNotificationChannels }
let dailyReminderTimerId = null
let heartbeatTimerId = null
let lastHeartbeatState = null
// Hour (0–23) at which a new study day begins; matches the Settings.nextDayStartsAt
// field so the SW uses the same day boundary as the frontend (Issue #8).
let cachedNextDayStartsAt = 4

function getNotificationChannelConfig(channelKey) {
  const fallback = defaultNotificationChannels[channelKey] || { enabled: true, title: '', body: '' }
  const source = swNotificationChannels?.[channelKey]
  return {
    enabled: source?.enabled !== false,
    title: typeof source?.title === 'string' ? source.title.trim().slice(0, 120) : fallback.title,
    body: typeof source?.body === 'string' ? source.body.trim().slice(0, 280) : fallback.body,
  }
}

// ─── Install & Activate ────────────────────────────────────────────────

async function cacheUrlsIndividually(cache, urls) {
  await Promise.all(
    urls.map(async url => {
      try {
        await cache.add(url)
      } catch (err) {
        console.warn('[SW] cache miss during install:', url, err)
      }
    })
  )
}

function extractAppShellAssetUrls(indexHtmlText) {
  const urls = new Set()
  APP_SHELL_ASSET_REGEX.lastIndex = 0

  let match
  while ((match = APP_SHELL_ASSET_REGEX.exec(indexHtmlText))) {
    const raw = (match[1] || '').trim()
    if (!raw) continue
    if (raw.startsWith('//')) continue

    let normalized = raw
    if (normalized.startsWith('./')) normalized = normalized.slice(1)
    if (!normalized.startsWith('/')) normalized = `/${normalized}`

    if (/\.(js|css)(\?|#|$)/.test(normalized)) {
      urls.add(normalized)
    }
  }

  return Array.from(urls)
}

function extractAssetRefsFromScript(scriptText) {
  const refs = new Set()
  JS_ASSET_REF_REGEX.lastIndex = 0

  let match
  while ((match = JS_ASSET_REF_REGEX.exec(scriptText))) {
    let normalized = (match[0] || '').trim()
    if (!normalized) continue
    if (normalized.startsWith('./')) normalized = normalized.slice(1)
    if (!normalized.startsWith('/')) normalized = `/${normalized}`
    refs.add(normalized)
  }

  return Array.from(refs)
}

async function findCachedAcrossVersions(pathname) {
  const keys = await caches.keys()
  for (const key of keys) {
    if (!CACHE_PREFIXES.some(prefix => key.startsWith(prefix))) continue
    const cache = await caches.open(key)
    const match = await cache.match(pathname)
    if (match) return match
  }
  return null
}

async function refreshNavigationCache(request) {
  try {
    const response = await fetch(request)
    if (!response.ok) return

    const cache = await caches.open(CACHE_NAME)
    await cache.put('/', response.clone())
    await cache.put('/index.html', response.clone())
  } catch {
    // best effort refresh while returning cached navigation
  }
}

async function precacheChunkGraph(cache, initialAssets) {
  const visited = new Set()
  const queue = [...initialAssets]

  while (queue.length > 0 && visited.size < MAX_PRECACHE_GRAPH_ASSETS) {
    const assetUrl = queue.shift()
    if (!assetUrl || visited.has(assetUrl)) continue
    visited.add(assetUrl)

    if (!assetUrl.endsWith('.js')) continue

    let response = await cache.match(assetUrl)
    if (!response) {
      try {
        response = await fetch(assetUrl)
        if (!response || !response.ok) continue
        await cache.put(assetUrl, response.clone())
      } catch {
        continue
      }
    }

    let scriptText = ''
    try {
      scriptText = await response.clone().text()
    } catch {
      continue
    }

    const refs = extractAssetRefsFromScript(scriptText)
    for (const ref of refs) {
      if (!visited.has(ref)) {
        queue.push(ref)
      }
    }
  }

  if (visited.size > 0) {
    await cacheUrlsIndividually(cache, Array.from(visited))
  }
}

async function precacheAppShellAssets(cache) {
  try {
    const response = await fetch('/index.html', { cache: 'no-store' })
    if (!response.ok) return

    const html = await response.text()
    const shellAssets = extractAppShellAssetUrls(html)
    if (shellAssets.length > 0) {
      await cacheUrlsIndividually(cache, shellAssets)
      await precacheChunkGraph(cache, shellAssets)
    }
  } catch (err) {
    console.warn('[SW] app shell precache failed', err)
  }
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async cache => {
        await cacheUrlsIndividually(cache, CRITICAL_ASSETS)
        await precacheAppShellAssets(cache)
        await self.skipWaiting()
      })
      .catch(err => {
        console.error('[SW] install failed', err)
      })
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.match('/index.html'))
      .then(async cachedIndex => {
        const keys = await caches.keys()
        if (cachedIndex) {
          await Promise.all(
            keys
              .filter(key => key !== CACHE_NAME)
              .filter(key => CACHE_PREFIXES.some(prefix => key.startsWith(prefix)))
              .map(key => caches.delete(key))
          )
        }

        await self.clients.claim()
        const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
        for (const client of clients) {
          client.postMessage({ type: 'SW_UPDATED', version: SW_VERSION })
        }

        ensureHeartbeatTimer()
      })
  )
})

// ─── Fetch strategies ──────────────────────────────────────────────────

function isAssetRequest(request) {
  const url = new URL(request.url)
  return /\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|wasm)$/.test(url.pathname)
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME)
    cache.put(request, response.clone())
  }
  return response
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached

    return new Response('Offline', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/plain' },
    })
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)

  const networkPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => null)

  if (cached) {
    void networkPromise
    return cached
  }

  const network = await networkPromise
  if (network) return network

  return new Response('Offline', {
    status: 503,
    statusText: 'Offline',
    headers: { 'Content-Type': 'text/plain' },
  })
}

async function navigationNetworkFirst(request) {
  const cachedNavigation =
    (await caches.match(request, { ignoreSearch: true })) ||
    (await caches.match('/')) ||
    (await caches.match('/index.html')) ||
    (await findCachedAcrossVersions('/')) ||
    (await findCachedAcrossVersions('/index.html'))

  if (cachedNavigation) {
    // Always serve app shell immediately for navigations. This avoids
    // browser-level offline failures during reload on some engines.
    void refreshNavigationCache(request)
    return cachedNavigation
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      await cache.put('/', response.clone())
      await cache.put('/index.html', response.clone())
    }
    return response
  } catch {
    return new Response(OFFLINE_HTML, {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  const accepts = request.headers.get('accept') || ''
  const isDocumentRequest =
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    accepts.includes('text/html')

  if (isDocumentRequest) {
    event.respondWith(navigationNetworkFirst(request))
    return
  }

  if (isAssetRequest(request)) {
    event.respondWith(staleWhileRevalidate(request))
    return
  }

  event.respondWith(networkFirst(request))
})

// ─── Autonomous Sync Queue Flush (runs even without open tabs) ─────────

/**
 * Opens the sync-queue IndexedDB directly (no Dexie in the SW context)
 * and flushes pending operations to the server.
 */
async function openSyncQueueIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SYNC_QUEUE_DB_NAME, 1)
    request.onupgradeneeded = () => {
      // If the DB doesn't exist yet, create the store so the open succeeds.
      // The app will create the real schema on first use anyway.
      const idb = request.result
      if (!idb.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        idb.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id', autoIncrement: true })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function idbGetAll(idb, storeName) {
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

function idbDelete(idb, storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.delete(key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

function idbPut(idb, storeName, record) {
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.put(record)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

/**
 * Read the sync endpoint from localStorage-equivalent.
 * Service Workers don't have localStorage, so we fall back to reading
 * the config that was posted to us, or we skip if unavailable.
 */
let cachedSyncEndpoint = ''
let cachedClientId = ''
let cachedAuthToken = ''

function normalizeSyncEndpoint(rawEndpoint) {
  if (typeof rawEndpoint !== 'string') return ''
  const trimmed = rawEndpoint.trim()
  if (!trimmed) return ''
  const normalized = trimmed.replace(/\/$/, '')
  return normalized.endsWith('/sync') ? normalized : `${normalized}/sync`
}

function fetchWithSwTimeout(url, options) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SYNC_FETCH_TIMEOUT_MS)
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer))
}

async function flushQueueInServiceWorker() {
  // Safety guard: if any app windows are open, delegate IDB writes to them.
  // Writing IndexedDB from both the SW and a Dexie-managed client tab
  // concurrently can corrupt transactions (Issue #1).
  const openClients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
  if (openClients.length > 0) {
    for (const client of openClients) {
      client.postMessage({ type: 'SYNC_NOW' })
    }
    return
  }

  if (!cachedSyncEndpoint) {
    // No endpoint configured – nothing to do
    return
  }

  let idb
  try {
    idb = await openSyncQueueIDB()
  } catch {
    return
  }

  try {
    const records = await idbGetAll(idb, SYNC_QUEUE_STORE)
    const now = Date.now()
    const candidates = records
      .filter(r => (r.nextRetryAt || 0) <= now)
      .slice(0, 20)

    for (const record of candidates) {
      try {
        let payload
        try {
          payload = typeof record.payload === 'string' ? JSON.parse(record.payload) : record.payload
        } catch {
          payload = record.payload
        }

        const headers = {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': record.opId || '',
        }
        if (cachedAuthToken) {
          headers.Authorization = `Bearer ${cachedAuthToken}`
        }

        const response = await fetchWithSwTimeout(cachedSyncEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            opId: record.opId,
            type: record.type,
            payload,
            clientTimestamp: record.createdAt,
            source: BACKUP_APP_ID,
            clientId: cachedClientId,
          }),
        })

        if (response.ok) {
          await idbDelete(idb, SYNC_QUEUE_STORE, record.id)
        } else {
          const retries = (record.retries || 0) + 1
          const backoff = Math.min(5 * 60000, 2000 * Math.pow(2, retries))
          await idbPut(idb, SYNC_QUEUE_STORE, {
            ...record,
            retries,
            updatedAt: now,
            nextRetryAt: now + backoff,
          })
        }
      } catch {
        const retries = (record.retries || 0) + 1
        const backoff = Math.min(5 * 60000, 2000 * Math.pow(2, retries))
        await idbPut(idb, SYNC_QUEUE_STORE, {
          ...record,
          retries,
          updatedAt: Date.now(),
          nextRetryAt: Date.now() + backoff,
        })
      }
    }
  } finally {
    idb.close()
  }
}

// ─── Broadcast helper ──────────────────────────────────────────────────

async function broadcastSyncNow() {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
  for (const client of clients) {
    client.postMessage({ type: 'SYNC_NOW' })
  }
}

async function broadcastHeartbeatState(state) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
  for (const client of clients) {
    client.postMessage({ type: 'SERVER_HEARTBEAT', state })
  }
}

function getHealthEndpoint(rawEndpoint) {
  if (typeof rawEndpoint !== 'string' || !rawEndpoint) return ''
  try {
    const url = new URL(rawEndpoint)
    if (url.pathname.endsWith('/sync')) {
      url.pathname = url.pathname.slice(0, -5) || '/'
    }
    url.pathname = '/health'
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return ''
  }
}

function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { method: 'GET', cache: 'no-store', signal: controller.signal })
    .finally(() => clearTimeout(timer))
}

async function runHeartbeatCheck() {
  if (!cachedSyncEndpoint) return 'disconnected'
  const healthEndpoint = getHealthEndpoint(cachedSyncEndpoint)
  if (!healthEndpoint) return 'disconnected'

  try {
    const response = await fetchWithTimeout(healthEndpoint, HEARTBEAT_TIMEOUT_MS)
    return response.ok ? 'connected' : 'disconnected'
  } catch {
    return 'disconnected'
  }
}

async function checkHeartbeatAndBroadcast(forceBroadcast = false) {
  const state = await runHeartbeatCheck()
  if (forceBroadcast || state !== lastHeartbeatState) {
    lastHeartbeatState = state
    await broadcastHeartbeatState(state)
  }
}

function ensureHeartbeatTimer() {
  if (heartbeatTimerId !== null && typeof clearInterval === 'function') {
    clearInterval(heartbeatTimerId)
    heartbeatTimerId = null
  }

  if (!cachedSyncEndpoint) return
  if (typeof setInterval !== 'function') return

  heartbeatTimerId = setInterval(() => {
    void checkHeartbeatAndBroadcast(false)
  }, HEARTBEAT_INTERVAL_MS)

  void checkHeartbeatAndBroadcast(true)
}

async function updateAppBadge(dueCount) {
  const count = Number.isFinite(dueCount) ? Math.max(0, Math.floor(dueCount)) : 0

  try {
    // Prefer ServiceWorkerRegistration.setAppBadge() – this is the spec-compliant
    // API for service worker context and is required for iOS Safari PWA badge support.
    // navigator.setAppBadge() is a main-thread convenience alias; inside a SW it
    // routes through self.navigator which is unreliable on iOS (17.x).
    if (count > 0 && typeof self.registration?.setAppBadge === 'function') {
      await self.registration.setAppBadge(count)
      return
    }

    if (count <= 0 && typeof self.registration?.clearAppBadge === 'function') {
      await self.registration.clearAppBadge()
      return
    }

    // Fallback: navigator API (desktop Chrome/Edge/macOS Safari)
    const nav = self.navigator
    if (count > 0 && typeof nav?.setAppBadge === 'function') {
      await nav.setAppBadge(count)
    } else if (count <= 0 && typeof nav?.clearAppBadge === 'function') {
      await nav.clearAppBadge()
    }
  } catch {
    // Badge API is optional and best effort.
  }
}

async function getKpiAlertState() {
  try {
    const cache = await caches.open(DAILY_REMINDER_STATE_CACHE)
    const response = await cache.match(KPI_ALERT_STATE_URL)
    if (!response) return { lastSentDate: '' }
    const data = await response.json()
    return {
      lastSentDate: typeof data?.lastSentDate === 'string' ? data.lastSentDate : '',
    }
  } catch {
    return { lastSentDate: '' }
  }
}

async function setKpiAlertState(state) {
  try {
    const cache = await caches.open(DAILY_REMINDER_STATE_CACHE)
    await cache.put(
      KPI_ALERT_STATE_URL,
      new Response(JSON.stringify(state), {
        headers: { 'Content-Type': 'application/json' },
      })
    )
  } catch {
    // best effort persistence
  }
}

async function maybeNotifyCriticalDueCount(dueCount, language, threshold = CRITICAL_DUE_THRESHOLD) {
  const channel = getNotificationChannelConfig('kpiAlert')
  if (!swNotificationsEnabled || !channel.enabled || !self.registration.showNotification) return
  if (dueCount < threshold) return

  const state = await getKpiAlertState()
  const today = getDateKey(new Date())
  if (state.lastSentDate === today) return

  const isGerman = language === 'de'
  const defaultTitle = isGerman ? 'Hohe Lernlast erkannt' : 'High study backlog detected'
  const defaultBody = isGerman
    ? `Du hast aktuell ${dueCount} faellige Karten. Starte eine Session, um den Rueckstand zu glaetten.`
    : `You currently have ${dueCount} due cards. Start a study session to reduce the backlog.`

  try {
    await self.registration.showNotification(
      channel.title || defaultTitle,
      {
        body: channel.body || defaultBody,
        tag: 'card-pwa-kpi-threshold',
        renotify: false,
        icon: '/pwa-icons/icon-192.png',
        badge: '/pwa-icons/icon-192.png',
        data: { url: '/?view=study' },
      }
    )
    await setKpiAlertState({ lastSentDate: today })
  } catch {
    // best effort only
  }
}

async function persistSessionSnapshot(snapshot) {
  try {
    const cache = await caches.open(DAILY_REMINDER_STATE_CACHE)
    await cache.put(
      ACTIVE_SESSION_SNAPSHOT_URL,
      new Response(JSON.stringify(snapshot), {
        headers: { 'Content-Type': 'application/json' },
      })
    )
  } catch {
    // best effort persistence
  }
}

/**
 * Decides whether to flush the queue in the SW itself or delegate to a
 * visible tab.  If no tabs are open, the SW does the work directly.
 */
async function syncOrBroadcast() {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })

  if (clients.length > 0) {
    // Tabs are open – let the app-level coordinator handle it (avoids
    // double-flushing and benefits from Dexie/shared state).
    for (const client of clients) {
      client.postMessage({ type: 'SYNC_NOW' })
    }
  } else {
    // No tabs open – the SW must flush the queue itself.
    await flushQueueInServiceWorker()
  }
}

// ─── Background Sync & Periodic Sync ───────────────────────────────────

self.addEventListener('sync', event => {
  if (event.tag === 'card-pwa-sync' || event.tag === 'anki-pwa-sync') {
    event.waitUntil(syncOrBroadcast())
  }
})

self.addEventListener('periodicsync', event => {
  if (event.tag === 'card-pwa-periodic-sync' || event.tag === 'anki-pwa-periodic-sync') {
    event.waitUntil(Promise.all([syncOrBroadcast(), maybeSendDailyReminder()]))
  }
})

// ─── Push Notifications ───────────────────────────────────────────────

function getDefaultPushNotification(languageHint) {
  const isGerman = languageHint === 'de'
  return {
    title: isGerman ? 'Neue Lernbenachrichtigung' : 'New study notification',
    body: isGerman ? 'Es gibt neue Inhalte in Card_PWA.' : 'There is new activity in Card_PWA.',
  }
}

function getDailyReminderNotification(languageHint) {
  const isGerman = languageHint === 'de'
  return {
    title: isGerman ? 'Lern-Reminder' : 'Study reminder',
    body: isGerman ? 'Zeit fuer deine heutige Session in Card_PWA.' : 'Time for your daily study session in Card_PWA.',
  }
}

function parseReminderTime(value) {
  const fallback = [20, 0]
  if (typeof value !== 'string') return fallback
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  if (!match) return fallback
  return [Number(match[1]), Number(match[2])]
}

function getDateKey(now) {
  // Adjust for a configurable day-start hour so studying past midnight does
  // not roll the date unexpectedly (Issue #8).
  const d = new Date(now.getTime())
  if (cachedNextDayStartsAt > 0 && d.getHours() < cachedNextDayStartsAt) {
    d.setDate(d.getDate() - 1)
  }
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function getDailyReminderState() {
  try {
    const cache = await caches.open(DAILY_REMINDER_STATE_CACHE)
    const response = await cache.match(DAILY_REMINDER_STATE_URL)
    if (!response) return { lastSentDate: '' }
    const data = await response.json()
    return {
      lastSentDate: typeof data?.lastSentDate === 'string' ? data.lastSentDate : '',
    }
  } catch {
    return { lastSentDate: '' }
  }
}

async function setDailyReminderState(state) {
  try {
    const cache = await caches.open(DAILY_REMINDER_STATE_CACHE)
    await cache.put(
      DAILY_REMINDER_STATE_URL,
      new Response(JSON.stringify(state), {
        headers: { 'Content-Type': 'application/json' },
      })
    )
  } catch {
    // best effort persistence
  }
}

async function maybeSendDailyReminder() {
  const channel = getNotificationChannelConfig('dailyReminder')
  if (!swNotificationsEnabled || !channel.enabled || !dailyReminderEnabled || !self.registration.showNotification) return

  const now = new Date()
  const [hour, minute] = parseReminderTime(dailyReminderTime)
  const passedReminderTime = now.getHours() > hour || (now.getHours() === hour && now.getMinutes() >= minute)
  if (!passedReminderTime) return

  const today = getDateKey(now)
  const state = await getDailyReminderState()
  if (state.lastSentDate === today) return

  const defaults = getDailyReminderNotification(dailyReminderLanguage)

  try {
    await self.registration.showNotification(channel.title || defaults.title, {
      body: channel.body || defaults.body,
      tag: 'card-pwa-daily-reminder',
      renotify: false,
      icon: '/pwa-icons/icon-192.png',
      badge: '/pwa-icons/icon-192.png',
      data: {
        url: '/?view=study',
      },
    })
    await setDailyReminderState({ lastSentDate: today })
  } catch {
    // Permission can be denied at runtime.
  }
}

function scheduleDailyReminderTimer() {
  if (dailyReminderTimerId !== null) {
    clearTimeout(dailyReminderTimerId)
    dailyReminderTimerId = null
  }

  const channel = getNotificationChannelConfig('dailyReminder')
  if (!swNotificationsEnabled || !channel.enabled || !dailyReminderEnabled) return

  const now = new Date()
  const [hour, minute] = parseReminderTime(dailyReminderTime)
  const next = new Date(now)
  next.setHours(hour, minute, 0, 0)
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1)
  }

  const delay = Math.max(1000, Math.min(next.getTime() - now.getTime(), 2147483647))

  dailyReminderTimerId = setTimeout(() => {
    maybeSendDailyReminder().finally(() => {
      scheduleDailyReminderTimer()
    })
  }, delay)
}

self.addEventListener('push', event => {
  event.waitUntil((async () => {
    const channel = getNotificationChannelConfig('pushGeneral')
    if (!swNotificationsEnabled || !channel.enabled || !self.registration.showNotification) return

    let payload = {}
    try {
      payload = event.data ? event.data.json() : {}
    } catch {
      try {
        payload = { body: event.data ? event.data.text() : '' }
      } catch {
        payload = {}
      }
    }

    const languageHint = payload.language === 'de' ? 'de' : 'en'
    const defaults = getDefaultPushNotification(languageHint)

    const title = typeof payload.title === 'string' && payload.title.trim()
      ? payload.title
      : defaults.title
    const body = typeof payload.body === 'string' ? payload.body : defaults.body

    await self.registration.showNotification(channel.title || title, {
      body: channel.body || body,
      tag: typeof payload.tag === 'string' ? payload.tag : 'card-pwa-push',
      renotify: true,
      icon: typeof payload.icon === 'string' ? payload.icon : '/pwa-icons/icon-192.png',
      badge: typeof payload.badge === 'string' ? payload.badge : '/pwa-icons/icon-192.png',
      data: {
        url: typeof payload.url === 'string' ? payload.url : '/',
      },
    })
  })())
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const targetUrl = event.notification?.data?.url || '/'

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })

    for (const client of clients) {
      if ('focus' in client) {
        await client.focus()
        if ('navigate' in client && targetUrl) {
          try {
            await client.navigate(targetUrl)
          } catch {
            // best-effort navigation
          }
        }
        return
      }
    }

    if (self.clients.openWindow) {
      await self.clients.openWindow(targetUrl)
    }
  })())
})

self.addEventListener('notificationclose', () => {
  // reserved for telemetry/analytics hooks in future
})

self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
    for (const client of clients) {
      client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' })
    }
  })())
})

// ─── Message handler ───────────────────────────────────────────────────

self.addEventListener('message', event => {
  if (!event.data || !event.data.type) return

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
    return
  }

  // The app sends its sync config so the SW can flush autonomously.
  if (event.data.type === 'SYNC_CONFIG') {
    if (typeof event.data.endpoint === 'string') {
      cachedSyncEndpoint = normalizeSyncEndpoint(event.data.endpoint)
    }
    if (typeof event.data.clientId === 'string') {
      cachedClientId = event.data.clientId
    }
    cachedAuthToken = typeof event.data.authToken === 'string' ? event.data.authToken.trim() : ''
    ensureHeartbeatTimer()
    void checkHeartbeatAndBroadcast(true)
    return
  }

  if (event.data.type === 'APP_VISIBLE') {
    if (typeof event.waitUntil === 'function') {
      event.waitUntil(Promise.all([checkHeartbeatAndBroadcast(true), syncOrBroadcast()]))
    } else {
      void checkHeartbeatAndBroadcast(true)
      void syncOrBroadcast()
    }
    return
  }

  if (event.data.type === 'FORCE_HEARTBEAT_CHECK') {
    void checkHeartbeatAndBroadcast(true)
    return
  }

  if (event.data.type === 'KPI_DUE_COUNT') {
    const dueCount = Number(event.data.dueCount)
    const threshold = Number.isFinite(Number(event.data.threshold))
      ? Math.max(1, Math.floor(Number(event.data.threshold)))
      : CRITICAL_DUE_THRESHOLD
    const language = event.data.language === 'de' ? 'de' : 'en'

    void updateAppBadge(dueCount)
    void maybeNotifyCriticalDueCount(dueCount, language, threshold)
    return
  }

  if (event.data.type === 'SESSION_SNAPSHOT') {
    if (typeof event.data.deckId !== 'string' || typeof event.data.payload !== 'string') {
      return
    }

    void persistSessionSnapshot({
      deckId: event.data.deckId,
      payload: event.data.payload,
      updatedAt: Number.isFinite(Number(event.data.updatedAt))
        ? Number(event.data.updatedAt)
        : Date.now(),
    })
    return
  }

  if (event.data.type === 'REGISTER_SYNC') {
    if (self.registration.sync && self.registration.sync.register) {
      self.registration.sync.register('card-pwa-sync').catch(() => {
        syncOrBroadcast()
      })
      return
    }
    syncOrBroadcast()
    return
  }

  if (event.data.type === 'REGISTER_PERIODIC_SYNC') {
    if (self.registration.periodicSync && self.registration.periodicSync.register) {
      self.registration.periodicSync.register('card-pwa-periodic-sync', {
        minInterval: 2 * 60 * 60 * 1000, // 2 hours (was 12h)
      }).catch(() => {
        // no-op fallback
      })
    }
    return
  }

  if (event.data.type === 'FORCE_SYNC_NOW') {
    syncOrBroadcast()
    return
  }

  if (event.data.type === 'SERVER_STATUS_NOTIFICATION') {
    const channel = getNotificationChannelConfig('serverStatus')
    if (!swNotificationsEnabled || !channel.enabled) return

    const title = channel.title || (typeof event.data.title === 'string' ? event.data.title : 'Server status')
    const body = channel.body || (typeof event.data.body === 'string' ? event.data.body : '')
    const connected = Boolean(event.data.connected)

    if (self.registration.showNotification) {
      self.registration.showNotification(title, {
        body,
        tag: 'card-pwa-server-status',
        renotify: true,
        silent: true,
        icon: '/pwa-icons/icon-192.png',
        badge: '/pwa-icons/icon-192.png',
        data: { connected },
      }).catch(() => {
        // no-op fallback
      })
    }
    return
  }

  if (event.data.type === 'TEST_PUSH_NOTIFICATION') {
    const channel = getNotificationChannelConfig('pushTest')
    if (!swNotificationsEnabled || !channel.enabled) return

    // Schema validation: guard against malformed or oversized payloads (Issue #12).
    const isStr = (v, max) => typeof v === 'string' && v.length <= max
    const languageHint = event.data.language === 'de' ? 'de' : 'en'
    const defaults = getDefaultPushNotification(languageHint)
    const payloadTitle = isStr(event.data.title, 200) && event.data.title.trim()
      ? event.data.title.trim()
      : defaults.title
    const payloadBody = isStr(event.data.body, 500) && event.data.body.trim()
      ? event.data.body.trim()
      : defaults.body
    // Only allow known safe tag values to prevent notification spoofing.
    const tag = isStr(event.data.tag, 100) && /^[\w-]+$/.test(event.data.tag)
      ? event.data.tag
      : 'card-pwa-test-push'
    // Only allow same-origin relative URLs to prevent navigation hijacking.
    const url = isStr(event.data.url, 500) && (event.data.url === '/' || event.data.url.startsWith('/?'))
      ? event.data.url
      : '/'

    if (self.registration.showNotification) {
      self.registration.showNotification(channel.title || payloadTitle, {
        body: channel.body || payloadBody,
        tag,
        renotify: true,
        icon: '/pwa-icons/icon-192.png',
        badge: '/pwa-icons/icon-192.png',
        data: {
          url,
        },
      }).catch(() => {
        // no-op fallback
      })
    }
    return
  }

  if (event.data.type === 'DAILY_REMINDER_CONFIG') {
    dailyReminderEnabled = Boolean(event.data.enabled)
    dailyReminderTime = typeof event.data.time === 'string' ? event.data.time : '20:00'
    dailyReminderLanguage = event.data.language === 'de' ? 'de' : 'en'
    if (typeof event.data.nextDayStartsAt === 'number' &&
        Number.isInteger(event.data.nextDayStartsAt) &&
        event.data.nextDayStartsAt >= 0 &&
        event.data.nextDayStartsAt <= 23) {
      cachedNextDayStartsAt = event.data.nextDayStartsAt
    }

    event.waitUntil((async () => {
      await maybeSendDailyReminder()
      scheduleDailyReminderTimer()
    })())
    return
  }

  if (event.data.type === 'SW_NOTIFICATIONS_CONFIG') {
    swNotificationsEnabled = event.data.enabled !== false
    if (event.data.channels && typeof event.data.channels === 'object') {
      const incoming = event.data.channels
      swNotificationChannels = {
        dailyReminder: {
          enabled: incoming.dailyReminder?.enabled !== false,
          title: typeof incoming.dailyReminder?.title === 'string' ? incoming.dailyReminder.title : '',
          body: typeof incoming.dailyReminder?.body === 'string' ? incoming.dailyReminder.body : '',
        },
        kpiAlert: {
          enabled: incoming.kpiAlert?.enabled !== false,
          title: typeof incoming.kpiAlert?.title === 'string' ? incoming.kpiAlert.title : '',
          body: typeof incoming.kpiAlert?.body === 'string' ? incoming.kpiAlert.body : '',
        },
        serverStatus: {
          enabled: incoming.serverStatus?.enabled !== false,
          title: typeof incoming.serverStatus?.title === 'string' ? incoming.serverStatus.title : '',
          body: typeof incoming.serverStatus?.body === 'string' ? incoming.serverStatus.body : '',
        },
        pushGeneral: {
          enabled: incoming.pushGeneral?.enabled !== false,
          title: typeof incoming.pushGeneral?.title === 'string' ? incoming.pushGeneral.title : '',
          body: typeof incoming.pushGeneral?.body === 'string' ? incoming.pushGeneral.body : '',
        },
        pushTest: {
          enabled: incoming.pushTest?.enabled !== false,
          title: typeof incoming.pushTest?.title === 'string' ? incoming.pushTest.title : '',
          body: typeof incoming.pushTest?.body === 'string' ? incoming.pushTest.body : '',
        },
      }
    }
    scheduleDailyReminderTimer()
    return
  }

  if (event.data.type === 'PREFETCH_URLS') {
    const urls = Array.isArray(event.data.urls) ? event.data.urls : []
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE_NAME)
      for (const url of urls) {
        try {
          const absolute = new URL(url, self.location.origin)
          if (absolute.origin !== self.location.origin) continue
          const response = await fetch(absolute.toString(), { method: 'GET' })
          if (response.ok) {
            await cache.put(absolute.pathname, response.clone())
          }
        } catch {
          // best-effort prefetch
        }
      }
    })())
  }
})
