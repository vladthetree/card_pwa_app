import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { migrateCardPwaBrandingData } from './services/brandMigration'
import { supportsServiceWorker } from './env'
import { initServiceWorkerRegistration } from './runtime/swRegistration'

let disposeSwRegistration: (() => void) | null = null

async function bootstrap() {
  await migrateCardPwaBrandingData()

  disposeSwRegistration?.()
  disposeSwRegistration = initServiceWorkerRegistration({
    supportsServiceWorker: supportsServiceWorker(),
    navigatorRef: navigator,
    windowRef: window,
    documentRef: document,
    onError: (error) => {
      console.error('[SW] registration failed:', error)
    },
  })

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
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
