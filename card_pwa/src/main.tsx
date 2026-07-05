/**
 * AI_CONTEXT: React entrypoint; mounts the PWA into the DOM and wires global providers/styles.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { migrateCardPwaBrandingData } from './services/brandMigration'
import { supportsServiceWorker } from './env'
import {
  initServiceWorkerRegistration,
  type ServiceWorkerStartupReadiness,
} from './runtime/swRegistration'

let disposeSwRegistration: (() => void) | null = null
const fallbackStartupReady: Promise<ServiceWorkerStartupReadiness> = Promise.resolve({
  status: 'unsupported',
  activatedUpdate: false,
})

async function bootstrap() {
  await migrateCardPwaBrandingData()

  disposeSwRegistration?.()
  const swRuntime = initServiceWorkerRegistration({
    supportsServiceWorker: supportsServiceWorker(),
    navigatorRef: navigator,
    windowRef: window,
    documentRef: document,
    onError: (error) => {
      console.error('[SW] registration failed:', error)
    },
  })
  disposeSwRegistration = swRuntime

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App startupReady={swRuntime.startupReady ?? fallbackStartupReady} />
    </React.StrictMode>
  )
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeSwRegistration?.()
    disposeSwRegistration = null
  })
}

void bootstrap()
