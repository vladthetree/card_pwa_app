import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-expect-error — reines Node-ESM ohne Typen, von Vite (esbuild) auflösbar.
import { resolveMediaDir, createMesserMediaMiddleware } from './scripts/mediaServer.mjs'

/** Dev-Plugin: liefert die selbst gehosteten Lernvideos unter /media/messer/. */
function messerLocalMedia(): PluginOption {
  return {
    name: 'messer-local-media',
    configureServer(server) {
      const dir = resolveMediaDir(process.env.PWA_MEDIA_DIR)
      server.middlewares.use(createMesserMediaMiddleware(dir))
    },
  }
}

const packageJsonPath = resolve(process.cwd(), 'package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as { version?: string }
const appVersion = typeof packageJson.version === 'string' ? packageJson.version : '0.0.0'
const buildStamp = new Date().toISOString()
const serviceWorkerVersion = `${appVersion}+${buildStamp}`

const httpsRequested = process.env.DEV_HTTPS === '1'
const certPath = resolve(process.cwd(), process.env.DEV_CERT_FILE ?? '.cert/dev-cert.pem')
const keyPath = resolve(process.cwd(), process.env.DEV_KEY_FILE ?? '.cert/dev-key.pem')
const syncProxyTarget = process.env.VITE_SYNC_PROXY_TARGET
  ?? process.env.PWA_SYNC_PROXY_TARGET
  ?? 'https://127.0.0.1:8787'
const syncProxySecure = process.env.VITE_SYNC_PROXY_TLS_VERIFY === '1'
  || process.env.PWA_SYNC_PROXY_TLS_VERIFY === '1'

if (httpsRequested && (!existsSync(certPath) || !existsSync(keyPath))) {
  throw new Error(
    'HTTPS dev certificate not found. Run "npm run dev:https:setup" first, or set DEV_CERT_FILE/DEV_KEY_FILE.'
  )
}

const httpsConfig = httpsRequested
  ? {
      cert: readFileSync(certPath),
      key: readFileSync(keyPath),
    }
  : undefined

export default defineConfig({
  define: {
    __APP_BUILD_VERSION__: JSON.stringify(appVersion),
    __APP_BUILD_STAMP__: JSON.stringify(buildStamp),
    __APP_SW_VERSION__: JSON.stringify(serviceWorkerVersion),
  },
  plugins: [
    react(),
    messerLocalMedia(),
  ],
  worker: {
    format: 'es',
    plugins: () => [],
  },
  build: {
    // Prod liefert keine Source Maps aus (kleinerer Download; stale SW-Bundles
    // forderten sonst gelöschte .map-Dateien an → DevTools-JSON-Fehler).
    // Für Debug-Builds: PWA_SOURCEMAP=1 npm run build
    sourcemap: process.env.PWA_SOURCEMAP === '1',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('react') || id.includes('scheduler')) {
            return 'react-vendor'
          }

          // framer-motion bewusst NICHT manuell bündeln: der m/LazyMotion-Kern
          // bleibt im Start-Bundle klein, das domMax-Featurepaket und die
          // Reorder-Abhängigkeiten (LabsView) splitten als async Chunks.

          if (id.includes('sql.js') || id.includes('jszip') || id.includes('papaparse')) {
            return 'data-vendor'
          }

          if (id.includes('dexie') || id.includes('ts-fsrs')) {
            return 'spaced-repetition-vendor'
          }
        },
      },
    },
  },
  server: {
    host: httpsRequested ? '0.0.0.0' : undefined,
    https: httpsConfig,
    port: 5173,
    strictPort: true,
    proxy: {
      '/auth': {
        target: syncProxyTarget,
        changeOrigin: true,
        secure: syncProxySecure,
      },
      '/health': {
        target: syncProxyTarget,
        changeOrigin: true,
        secure: syncProxySecure,
      },
      '/sync': {
        target: syncProxyTarget,
        changeOrigin: true,
        secure: syncProxySecure,
      },
    },
  },
  optimizeDeps: {
    // sql.js muss pre-gebundelt werden damit Vite CJS → ESM konvertiert
    // und .default korrekt gesetzt wird
    include: ['sql.js'],
  },
})
