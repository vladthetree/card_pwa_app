/**
 * Auslieferung der selbst gehosteten Professor-Messer-Lernvideos.
 *
 * - `GET /media/messer/index.json` → Liste der vorhandenen .mp4-Dateien.
 * - `GET /media/messer/<datei>`    → Datei mit HTTP-Range-Support (206), damit
 *   `<video>` springen kann und iOS Safari überhaupt abspielt; gestreamt via
 *   createReadStream (kein readFileSync — Dateien sind teils ~100 MB).
 *
 * Wird sowohl vom Prod-Server (prod-server.mjs) als auch vom Vite-Dev-Server
 * (vite.config.ts) genutzt. Reines Node-ESM, damit beide es ohne Build laden.
 */

import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_MEDIA_DIR =
  '/home/_vb/youtube-playlists/CompTIA SY0-701 Security+ Training Course [PLG49S3nxzAnl4QDVqK-hOnoqcSKEIDDuv]'

export const MEDIA_ROUTE_PREFIX = '/media/messer/'

export function resolveMediaDir(envValue) {
  return envValue && envValue.trim() ? path.resolve(envValue) : DEFAULT_MEDIA_DIR
}

export function listMesserVideoFiles(dir) {
  try {
    return fs
      .readdirSync(dir)
      .filter(name => name.toLowerCase().endsWith('.mp4'))
      .sort()
  } catch {
    return []
  }
}

function safeJoin(dir, file) {
  const root = path.resolve(dir)
  const target = path.resolve(root, file)
  // Pfad-Traversal verhindern: Ziel muss unterhalb des Wurzelverzeichnisses liegen.
  if (target !== root && !target.startsWith(root + path.sep)) return null
  return target
}

export function serveMediaIndex(res, dir) {
  const body = JSON.stringify({ files: listMesserVideoFiles(dir) })
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache',
  })
  res.end(body)
}

export function serveMediaFile(req, res, dir, rawFile) {
  let file
  try {
    file = decodeURIComponent(rawFile)
  } catch {
    file = rawFile
  }

  const target = safeJoin(dir, file)
  if (!target || !target.toLowerCase().endsWith('.mp4')) {
    res.writeHead(403)
    return res.end('Forbidden')
  }

  let stat
  try {
    stat = fs.statSync(target)
  } catch {
    res.writeHead(404)
    return res.end('Not Found')
  }
  if (!stat.isFile()) {
    res.writeHead(404)
    return res.end('Not Found')
  }

  const total = stat.size
  const baseHeaders = {
    'Content-Type': 'video/mp4',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache',
  }

  const range = req.headers.range
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range)
    if (!match) {
      res.writeHead(416, { 'Content-Range': `bytes */${total}` })
      return res.end()
    }

    let start = match[1] === '' ? null : Number.parseInt(match[1], 10)
    let end = match[2] === '' ? null : Number.parseInt(match[2], 10)

    if (start === null) {
      // Suffix-Range "bytes=-N": die letzten N Bytes.
      const suffix = end ?? 0
      start = Math.max(0, total - suffix)
      end = total - 1
    } else if (end === null || end >= total) {
      end = total - 1
    }

    if (start > end || start >= total) {
      res.writeHead(416, { 'Content-Range': `bytes */${total}` })
      return res.end()
    }

    res.writeHead(206, {
      ...baseHeaders,
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Content-Length': end - start + 1,
    })
    if (req.method === 'HEAD') return res.end()

    const stream = fs.createReadStream(target, { start, end })
    stream.on('error', () => {
      if (!res.headersSent) res.writeHead(500)
      res.end()
    })
    return stream.pipe(res)
  }

  res.writeHead(200, { ...baseHeaders, 'Content-Length': total })
  if (req.method === 'HEAD') return res.end()

  const stream = fs.createReadStream(target)
  stream.on('error', () => {
    if (!res.headersSent) res.writeHead(500)
    res.end()
  })
  return stream.pipe(res)
}

/** True, wenn der Pfad eine Messer-Medien-Route ist. */
export function isMesserMediaRoute(route) {
  return route === '/media/messer/index.json' || route.startsWith(MEDIA_ROUTE_PREFIX)
}

/** Einheitliches Routing für beide Server. Gibt true zurück, wenn behandelt. */
export function handleMesserMedia(req, res, dir, route) {
  if (route === '/media/messer/index.json') {
    serveMediaIndex(res, dir)
    return true
  }
  if (route.startsWith(MEDIA_ROUTE_PREFIX)) {
    const file = route.slice(MEDIA_ROUTE_PREFIX.length)
    if (file) {
      serveMediaFile(req, res, dir, file)
      return true
    }
  }
  return false
}

/** Connect-Middleware für den Vite-Dev-Server. */
export function createMesserMediaMiddleware(dir) {
  return (req, res, next) => {
    const route = (req.url || '').split('?')[0]
    if (!handleMesserMedia(req, res, dir, route)) next()
  }
}
