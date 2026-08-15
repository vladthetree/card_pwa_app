/**
 * Production HTTPS server for card-pwa.
 * - Serves the built dist/ folder as static files
 * - Proxies /sync*, /auth*, /push* requests to PWA_SYNC_PROXY_TARGET (default: https://127.0.0.1:8787)
 * - Reads TLS cert from PWA_CERT_FILE / PWA_KEY_FILE
 * - Serves the self-signed Root-CA under /rootCA.pem (+ /cert Anleitung) so an
 *   iPhone can install + trust it (Voraussetzung, damit Safari die HTTPS-PWA lädt).
 */

import https from 'node:https'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveMediaDir, handleMesserMedia, isMesserMediaRoute, listMesserVideoFiles } from './mediaServer.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIST = path.join(ROOT, 'dist')

const HOST = process.env.PWA_HOST ?? '0.0.0.0'
const PORT = parseInt(process.env.PWA_PORT ?? '8444', 10)
const CERT_FILE = path.resolve(ROOT, process.env.PWA_CERT_FILE ?? '.cert/prod-cert.pem')
const KEY_FILE = path.resolve(ROOT, process.env.PWA_KEY_FILE ?? '.cert/prod-key.pem')
const SYNC_TARGET = process.env.PWA_SYNC_PROXY_TARGET ?? 'https://127.0.0.1:8787'
const TLS_VERIFY = (process.env.PWA_SYNC_PROXY_TLS_VERIFY ?? '0') !== '0'
const LOG_DIR = process.env.PWA_LOG_DIR ? path.resolve(ROOT, process.env.PWA_LOG_DIR) : null
// Root-CA, der das iPhone vertrauen muss; wird unter /rootCA.pem ausgeliefert.
const CA_FILE = path.resolve(ROOT, process.env.PWA_CA_FILE ?? '.cert/rootCA.pem')
// Verzeichnis der selbst gehosteten Lernvideos (Professor Messer, .mp4).
const MEDIA_DIR = resolveMediaDir(process.env.PWA_MEDIA_DIR)

function log(msg) {
  const line = `[prod-server] ${new Date().toISOString()} ${msg}\n`
  process.stdout.write(line)
  if (LOG_DIR) {
    try { fs.appendFileSync(path.join(LOG_DIR, 'prod-server.log'), line) } catch {}
  }
}

// ─── MIME types ───────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.mjs':  'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.map':  'application/json',
}

// ─── Proxy helper ─────────────────────────────────────────────────────────────
function proxyToSync(req, res) {
  const target = new URL(SYNC_TARGET)
  const isHttps = target.protocol === 'https:'
  const options = {
    hostname: target.hostname,
    port: target.port || (isHttps ? 443 : 80),
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: target.host },
    rejectUnauthorized: TLS_VERIFY,
  }

  const transport = isHttps ? https : http
  const proxy = transport.request(options, (backRes) => {
    res.writeHead(backRes.statusCode, backRes.headers)
    backRes.pipe(res)
  })

  proxy.on('error', (err) => {
    log(`proxy error: ${err.message}`)
    if (!res.headersSent) res.writeHead(502)
    res.end('Bad Gateway')
  })

  req.pipe(proxy)
}

// ─── Root-CA Download (iOS-Vertrauen) ─────────────────────────────────────────
// Liefert die Root-CA als Zertifikat aus. Content-Type application/x-x509-ca-cert
// → Safari bietet auf dem iPhone an, das Profil zu installieren (statt es nur in
// "Dateien" zu speichern). Kein Content-Disposition: attachment, sonst bleibt
// auf manchen iOS-Versionen der Profil-Dialog aus.
function serveRootCA(res) {
  if (!fs.existsSync(CA_FILE)) {
    log(`rootCA requested but file missing: ${CA_FILE}`)
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    return res.end('rootCA nicht gefunden')
  }
  res.writeHead(200, {
    'Content-Type': 'application/x-x509-ca-cert',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  })
  res.end(fs.readFileSync(CA_FILE))
}

function certPageHtml(host) {
  const hostOnly = (host ?? '').split(':')[0] || '127.0.0.1'
  const appUrl = `https://${hostOnly}:${PORT}`
  const certUrl = `${appUrl}/rootCA.pem`
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Card-PWA · Zertifikat installieren</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, system-ui, sans-serif; line-height: 1.5;
         max-width: 34rem; margin: 0 auto; padding: 2rem 1.25rem; }
  h1 { font-size: 1.4rem; }
  a.btn { display: block; text-align: center; text-decoration: none;
          background: #2563eb; color: #fff; padding: .9rem 1rem; border-radius: .75rem;
          font-weight: 600; margin: 1.25rem 0; }
  ol { padding-left: 1.2rem; } li { margin: .4rem 0; }
  code { background: rgba(127,127,127,.18); padding: .1rem .35rem; border-radius: .3rem; }
  .muted { opacity: .7; font-size: .9rem; }
</style>
</head>
<body>
<h1>📲 Card-PWA aufs iPhone</h1>
<p>Damit Safari der App vertraut, einmalig dieses Zertifikat installieren — <b>in Safari öffnen</b> (Chrome funktioniert für Profile nicht):</p>
<a class="btn" href="/rootCA.pem">Zertifikat herunterladen</a>
<ol>
  <li>Kommt vorher eine Zertifikatswarnung: <b>Details ansehen</b> → <b>Diese Website besuchen</b>.</li>
  <li>Oben „Erlauben“ tippen → <b>Profil geladen</b>.</li>
  <li><b>Einstellungen</b> → <b>Allgemein</b> → <b>VPN &amp; Geräteverwaltung</b> → „CardApp Root CA“ → <b>Installieren</b>.</li>
  <li><b>Einstellungen</b> → <b>Allgemein</b> → <b>Info</b> → <b>Zertifikatsvertrauen</b> → „CardApp Root CA“ <b>einschalten</b>.</li>
  <li>App öffnen: <a href="${appUrl}">${appUrl}</a> → Teilen-Menü → <b>Zum Home-Bildschirm</b>.</li>
</ol>
<p class="muted">Direktlink zum Zertifikat: <code>${certUrl}</code></p>
</body>
</html>`
}

// ─── Static file helper ───────────────────────────────────────────────────────
function serveStatic(req, res) {
  let urlPath = req.url.split('?')[0]
  if (urlPath === '/') urlPath = '/index.html'

  let filePath = path.join(DIST, urlPath)

  // Prevent path traversal
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403)
    return res.end('Forbidden')
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // SPA-Fallback nur für Navigationspfade ohne Dateiendung. Fehlende Dateien
    // (z. B. Assets/Source Maps alter Builds) müssen 404 liefern — index.html
    // mit 200 ließ DevTools HTML als JSON parsen (Source-Map-Fehler).
    if (urlPath.startsWith('/assets/') || path.extname(urlPath) !== '') {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      return res.end('Not Found')
    }
    filePath = path.join(DIST, 'index.html')
  }

  const ext = path.extname(filePath).toLowerCase()
  // Web-App-Manifest laut Spec mit eigenem Typ ausliefern, nicht dem generischen
  // application/json der restlichen .json-Dateien (Content-Daten, Source-Maps).
  const mime = urlPath === '/manifest.json' ? 'application/manifest+json' : (MIME[ext] ?? 'application/octet-stream')
  const content = fs.readFileSync(filePath)

  const headers = { 'Content-Type': mime }
  // Long cache for hashed assets, no-cache for index.html and SW
  if (ext === '.html' || filePath.endsWith('service-worker.js')) {
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
  } else if (['.js', '.css', '.wasm'].includes(ext) && urlPath.includes('-')) {
    headers['Cache-Control'] = 'public, max-age=31536000, immutable'
  }

  res.writeHead(200, headers)
  res.end(content)
}

// ─── Security headers ─────────────────────────────────────────────────────────
// Sync-Endpunkt ist same-origin (/sync-Proxy), Videos/Offline-Kopien laufen über
// blob:, sql.js braucht 'wasm-unsafe-eval'. Style-Attribute (framer-motion)
// brauchen 'unsafe-inline' für style-src.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "font-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

function applySecurityHeaders(res) {
  res.setHeader('Content-Security-Policy', CSP)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.setHeader('Strict-Transport-Security', 'max-age=15552000')
  // Required by the threaded WASI build used for local FSRS optimization.
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
}

// ─── Request handler ──────────────────────────────────────────────────────────
function handler(req, res) {
  const url = req.url ?? '/'
  applySecurityHeaders(res)
  // /auth* (Profil/Auto-Join) und /health gehören zum Sync-Server. /health darf
  // der Static-Server nicht selbst beantworten, sonst zeigt die Status-Lampe
  // "online", obwohl der Sync-Server tot ist.
  if (url === '/health' || url.startsWith('/auth') || url.startsWith('/sync') || url.startsWith('/push')) {
    return proxyToSync(req, res)
  }
  // Root-CA-Download + Installations-Anleitung (fürs iPhone-Vertrauen).
  const route = url.split('?')[0]
  if (route === '/rootCA.pem' || route === '/rootCA.cer' || route === '/rootCA') {
    return serveRootCA(res)
  }
  if (route === '/cert' || route === '/cert/') {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    })
    return res.end(certPageHtml(req.headers.host))
  }
  // Selbst gehostete Lernvideos (Liste + Range-Streaming).
  if (isMesserMediaRoute(route)) {
    try {
      if (handleMesserMedia(req, res, MEDIA_DIR, route)) return
    } catch (err) {
      log(`media error: ${err.message}`)
      if (!res.headersSent) res.writeHead(500)
      return res.end('Internal Server Error')
    }
  }
  try {
    serveStatic(req, res)
  } catch (err) {
    log(`static error: ${err.message}`)
    if (!res.headersSent) res.writeHead(500)
    res.end('Internal Server Error')
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────
if (!fs.existsSync(DIST)) {
  log(`ERROR: dist/ not found at ${DIST}. Run "npm run build" first.`)
  process.exit(1)
}
if (!fs.existsSync(CERT_FILE) || !fs.existsSync(KEY_FILE)) {
  log(`ERROR: TLS certificate not found.\n  CERT: ${CERT_FILE}\n  KEY:  ${KEY_FILE}`)
  log('Run: npm run prod:cert:setup')
  process.exit(1)
}

if (LOG_DIR) fs.mkdirSync(LOG_DIR, { recursive: true })

const server = https.createServer(
  { cert: fs.readFileSync(CERT_FILE), key: fs.readFileSync(KEY_FILE) },
  handler,
)

if (!fs.existsSync(CA_FILE)) {
  log(`WARN: Root-CA ${CA_FILE} fehlt — /rootCA.pem liefert 404`)
}

server.listen(PORT, HOST, () => {
  log(`listening  https://${HOST}:${PORT}`)
  log(`sync proxy → ${SYNC_TARGET}  (tls-verify=${TLS_VERIFY})`)
  log(`static     ← ${DIST}`)
  log(`ca/cert    → https://${HOST}:${PORT}/rootCA.pem  (ca=${CA_FILE})`)
  log(`media      ← ${MEDIA_DIR}  (${listMesserVideoFiles(MEDIA_DIR).length} videos)`)
})
