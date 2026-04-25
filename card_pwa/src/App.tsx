import { lazy, Suspense, useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ThemeProvider } from './contexts/ThemeContext'
import { SettingsProvider, useSettings } from './contexts/SettingsContext'
import AppInitializer from './components/AppInitializer'
import AppErrorBoundary from './components/AppErrorBoundary'
import ToastContainer from './components/ToastContainer'
import type { Deck, ShuffleCollection, View } from './types'
import { SW_CHANNELS } from './constants/appIdentity'
import { supportsServiceWorker } from './env'

/**
 * Resolves the initial view from URL params so PWA shortcuts (e.g. `/?view=study`
 * or `/?view=import` from the web-app manifest) navigate to the right place
 * on launch instead of always starting on home (Issue #4).
 */
function getInitialView(): View {
  if (typeof window !== 'undefined') {
    const v = new URLSearchParams(window.location.search).get('view')
    if (v === 'import') return 'import'
    if (v === 'shuffle' || v === 'shuffle-manage') return 'shuffle-manage'
    // 'study' requires an active deck which is set by the user from home.
    // HomeView will show the study prompt prominently when this param is present.
  }
  return 'home'
}

const HomeView = lazy(() => import('./components/HomeView'))
const StudyView = lazy(() => import('./components/StudyView'))
const ShuffleStudyView = lazy(() => import('./components/ShuffleStudyView'))
const UpdateBanner = lazy(() => import('./components/UpdateBanner'))

function ViewFallback() {
  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-black/40 h-52 animate-pulse" />
    </div>
  )
}

function AppShell() {
  const { settings } = useSettings()
  const swSupported = supportsServiceWorker()
  const prefersReducedMotion = useReducedMotion()
  const [view, setView] = useState<View>(getInitialView)
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null)
  const [activeShuffleCollection, setActiveShuffleCollection] = useState<ShuffleCollection | null>(null)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [pendingReloadAfterStudy, setPendingReloadAfterStudy] = useState(false)

  useEffect(() => {
    if (!swSupported) return

    const onUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ waitingWorker: ServiceWorker | null }>
      setWaitingWorker(customEvent.detail?.waitingWorker ?? null)
    }

    window.addEventListener(SW_CHANNELS.updateEvent, onUpdate)
    return () => window.removeEventListener(SW_CHANNELS.updateEvent, onUpdate)
  }, [swSupported])

  useEffect(() => {
    if (!swSupported) return

    let reloadTimer: number | null = null

    const onControllerChange = () => {
      if (view === 'study' || view === 'shuffle-study') {
        setPendingReloadAfterStudy(true)
        return
      }

      reloadTimer = window.setTimeout(() => {
        window.location.reload()
      }, 1200)
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      if (reloadTimer !== null) {
        window.clearTimeout(reloadTimer)
      }
    }
  }, [swSupported, view])

  useEffect(() => {
    if (!pendingReloadAfterStudy) return
    if (view === 'study' || view === 'shuffle-study') return

    window.location.reload()
  }, [pendingReloadAfterStudy, view])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const url = new URL(window.location.href)
    if (view === 'import') {
      url.searchParams.set('view', 'import')
    } else if (view === 'shuffle-manage') {
      url.searchParams.set('view', 'shuffle')
    } else {
      url.searchParams.delete('view')
    }

    window.history.replaceState({}, '', url)
  }, [view])

  useEffect(() => {
    if (settings.shuffleModeEnabled) return
    if (view !== 'shuffle-manage') return
    setView('home')
  }, [settings.shuffleModeEnabled, view])

  const applyUpdate = () => {
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' })
  }

  const startStudy = (deck: Deck) => {
    setActiveDeck(deck)
    setActiveShuffleCollection(null)
    setView('study')
  }

  const startShuffleStudy = (collection: ShuffleCollection) => {
    setActiveShuffleCollection(collection)
    setActiveDeck(null)
    setView('shuffle-study')
  }

  const openShuffleManager = () => {
    setActiveDeck(null)
    setActiveShuffleCollection(null)
    setView('shuffle-manage')
  }

  const goHome = () => {
    setView('home')
    setActiveDeck(null)
    setActiveShuffleCollection(null)
  }

  return (
    <AppErrorBoundary>
      <AppInitializer>
        <div
          className="min-h-screen flex flex-col"
          style={{
            background: 'var(--theme-background)',
            minHeight: '100dvh',
            paddingTop: 'var(--safe-top)',
            paddingBottom: 'var(--safe-bottom)',
            paddingLeft: 'var(--safe-left)',
            paddingRight: 'var(--safe-right)',
          }}
        >
        <div
          aria-hidden
          className="pointer-events-none fixed top-0 left-0 right-0 z-[50]"
          style={{
            height: 'var(--safe-top)',
            background: 'var(--theme-notch)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none fixed bottom-0 left-0 right-0 z-[50]"
          style={{
            height: 'var(--safe-bottom)',
            background: 'var(--theme-notch)',
          }}
        />
        <ToastContainer />
        <Suspense fallback={null}>
          {swSupported && waitingWorker && (
            <UpdateBanner
              onUpdateNow={applyUpdate}
              onDismiss={() => setWaitingWorker(null)}
            />
          )}
        </Suspense>
        <Suspense fallback={<ViewFallback />}>
          <AnimatePresence mode="wait" initial={false}>
            {view === 'home' && (
              <motion.div
                key="home"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: prefersReducedMotion ? 0.16 : 0.2, ease: 'easeOut' }}
                className="flex-1 home-view"
              >
                <HomeView
                  onStartStudy={startStudy}
                  onStartShuffleStudy={startShuffleStudy}
                  onOpenShuffleManager={openShuffleManager}
                />
              </motion.div>
            )}

            {view === 'shuffle-manage' && (
              <motion.div
                key="shuffle-manage"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: prefersReducedMotion ? 0.16 : 0.2, ease: 'easeOut' }}
                className="flex-1 home-view"
              >
                <HomeView
                  mode="shuffle-manage"
                  onBackHome={goHome}
                  onStartStudy={startStudy}
                  onStartShuffleStudy={startShuffleStudy}
                  onOpenShuffleManager={openShuffleManager}
                />
              </motion.div>
            )}

            {view === 'study' && activeDeck && (
              <motion.div
                key="study"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.995 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.995 }}
                transition={{ duration: prefersReducedMotion ? 0.16 : 0.2, ease: 'easeOut' }}
                className="flex-1 study-view"
              >
                <StudyView deck={activeDeck} onExit={goHome} />
              </motion.div>
            )}

            {view === 'shuffle-study' && activeShuffleCollection && (
              <motion.div
                key="shuffle-study"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.995 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.995 }}
                transition={{ duration: prefersReducedMotion ? 0.16 : 0.2, ease: 'easeOut' }}
                className="flex-1 study-view"
              >
                <ShuffleStudyView collection={activeShuffleCollection} onExit={goHome} />
              </motion.div>
            )}
          </AnimatePresence>
        </Suspense>
        </div>
      </AppInitializer>
    </AppErrorBoundary>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AppShell />
      </SettingsProvider>
    </ThemeProvider>
  )
}
