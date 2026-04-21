import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const packageJsonPath = resolve(process.cwd(), 'package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as { version?: string }
const appVersion = typeof packageJson.version === 'string' ? packageJson.version : '0.0.0'
const buildStamp = new Date().toISOString()
const serviceWorkerVersion = `${appVersion}+${buildStamp}`

const httpsRequested = process.env.DEV_HTTPS === '1'
const certPath = resolve(process.cwd(), process.env.DEV_CERT_FILE ?? '.cert/dev-cert.pem')
const keyPath = resolve(process.cwd(), process.env.DEV_KEY_FILE ?? '.cert/dev-key.pem')

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
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('react') || id.includes('scheduler')) {
            return 'react-vendor'
          }

          if (id.includes('framer-motion') || id.includes('lucide-react')) {
            return 'ui-vendor'
          }

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
  },
  optimizeDeps: {
    // sql.js muss pre-gebundelt werden damit Vite CJS → ESM konvertiert
    // und .default korrekt gesetzt wird
    include: ['sql.js'],
  },
})
