/**
 * AI_CONTEXT:
 * Role: Root React shell for the PWA; owns top-level view state, app initialization, providers, safe-area CSS vars, service-worker update UI, and global modals.
 * Used by: main.tsx mounts this component; feature views are lazy-loaded from here.
 * Important: App-level navigation is local state, not a router; add new primary screens by extending the View type and this switch flow.
 */
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { LazyMotion } from 'framer-motion'
import { motion, useReducedMotion } from './ui/motion'
import { ThemeProvider } from './contexts/ThemeContext'
import { SettingsProvider, useSettings } from './contexts/SettingsContext'
import AppInitializer from './components/AppInitializer'
import AppErrorBoundary from './components/AppErrorBoundary'
import ToastContainer from './components/ToastContainer'
import type { Card, Deck, ShuffleCollection, View } from './types'
import { SW_CHANNELS } from './constants/appIdentity'
import { supportsServiceWorker } from './env'
import { useAutoJoinDefaultProfile } from './hooks/useAutoJoinDefaultProfile'
import { useFullscreenPreference } from './hooks/useFullscreen'

const SAFE_AREA_DEBUG_STORAGE_KEY = 'card-pwa-safe-area-debug'

// Animations-Features (domMax) laden async als eigener Chunk: die m-Komponenten
// aus ui/motion rendern sofort und animieren, sobald das Paket da ist (nach dem
// ersten Start aus dem SW-Cache praktisch verzögerungsfrei).
const loadMotionFeatures = () => import('./ui/motionFeatures').then(mod => mod.default)

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

function readSafeAreaInset(edge: 'top' | 'bottom'): number {
  const probe = document.createElement('div')
  probe.style.position = 'fixed'
  probe.style.visibility = 'hidden'
  probe.style.pointerEvents = 'none'
  probe.style.paddingTop = edge === 'top' ? 'env(safe-area-inset-top, 0px)' : '0px'
  probe.style.paddingBottom = edge === 'bottom' ? 'env(safe-area-inset-bottom, 0px)' : '0px'
  document.body.appendChild(probe)

  const styles = window.getComputedStyle(probe)
  const value = Number.parseFloat(edge === 'top' ? styles.paddingTop : styles.paddingBottom) || 0
  probe.remove()

  return value
}

function shouldEnableSafeAreaDebug(): boolean {
  if (typeof window === 'undefined') return false

  const params = new URLSearchParams(window.location.search)
  const requested = params.get('safeAreaDebug')
  if (requested === '1') {
    window.localStorage.setItem(SAFE_AREA_DEBUG_STORAGE_KEY, '1')
    return true
  }
  if (requested === '0') {
    window.localStorage.removeItem(SAFE_AREA_DEBUG_STORAGE_KEY)
    return false
  }

  return window.localStorage.getItem(SAFE_AREA_DEBUG_STORAGE_KEY) === '1'
}

function useViewportCssVars(immersiveBottom: boolean) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const root = document.documentElement
    let rafId: number | null = null

    const update = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }

      rafId = window.requestAnimationFrame(() => {
        const layoutHeight = Math.round(
          window.innerHeight ||
          root.clientHeight ||
          document.body?.clientHeight ||
          0,
        )
        root.style.setProperty('--app-viewport-height', `${layoutHeight}px`)

        // Immersive mode (the "fullscreen" toggle): collapse the bottom
        // home-indicator inset so the UI runs edge-to-edge. This is the part of
        // "fullscreen" that actually works on iPhone, where the Fullscreen API
        // is unavailable.
        if (immersiveBottom) {
          root.style.setProperty('--app-bottom-safe-area', '0px')
          root.style.setProperty('--app-bottom-viewport-gap', '0px')
          return
        }

        const envVal = readSafeAreaInset('bottom')
        if (envVal > 0) {
          root.style.setProperty('--app-bottom-safe-area', `${envVal}px`)
          root.style.setProperty('--app-bottom-viewport-gap', '0px')
        } else {
          const diff = window.screen.height - window.innerHeight
          const gap = diff > 0 && diff <= 50 ? diff : 0
          root.style.setProperty('--app-bottom-safe-area', `${gap}px`)
          root.style.setProperty('--app-bottom-viewport-gap', `${gap}px`)
        }
      })
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    window.visualViewport?.addEventListener('resize', update)

    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      window.visualViewport?.removeEventListener('resize', update)
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }
    }
  }, [immersiveBottom])
}

function SafeAreaDebugOverlay() {
  const [enabled, setEnabled] = useState(shouldEnableSafeAreaDebug)
  const [lines, setLines] = useState<string[]>([])

  useEffect(() => {
    if (!enabled) return

    const collect = () => {
      const root = document.documentElement
      const body = document.body
      const bar = document.querySelector('[data-safe-area-bottom-bar]') as HTMLElement | null
      const barRect = bar?.getBoundingClientRect()
      const barStyle = bar ? window.getComputedStyle(bar) : null
      const rootRect = root.getBoundingClientRect()
      const vv = window.visualViewport
      const standalone = (
        (navigator as Navigator & { standalone?: boolean }).standalone === true ||
        window.matchMedia?.('(display-mode: standalone)').matches ||
        window.matchMedia?.('(display-mode: fullscreen)').matches
      )

      setLines([
        `standalone ${standalone ? 'yes' : 'no'}`,
        `inner ${window.innerWidth} x ${window.innerHeight}`,
        `screen ${window.screen.width} x ${window.screen.height}`,
        `visual ${Math.round(vv?.width ?? 0)} x ${Math.round(vv?.height ?? 0)} top ${Math.round(vv?.offsetTop ?? 0)}`,
        `env top/bottom ${readSafeAreaInset('top')} / ${readSafeAreaInset('bottom')}`,
        `css safe ${window.getComputedStyle(root).getPropertyValue('--app-bottom-safe-area').trim()}`,
        `css gap ${window.getComputedStyle(root).getPropertyValue('--app-bottom-viewport-gap').trim()}`,
        `root h ${Math.round(rootRect.height)} body h ${Math.round(body.getBoundingClientRect().height)}`,
        `bar top ${Math.round(barRect?.top ?? -1)} bottom ${Math.round(barRect?.bottom ?? -1)} h ${Math.round(barRect?.height ?? -1)}`,
        `bar css bottom ${barStyle?.bottom ?? 'n/a'} pb ${barStyle?.paddingBottom ?? 'n/a'}`,
      ])
    }

    collect()
    const interval = window.setInterval(collect, 1000)
    window.addEventListener('resize', collect)
    window.addEventListener('orientationchange', collect)
    window.visualViewport?.addEventListener('resize', collect)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('resize', collect)
      window.removeEventListener('orientationchange', collect)
      window.visualViewport?.removeEventListener('resize', collect)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div className="fixed left-2 top-2 z-[9999] max-w-[calc(100vw-1rem)] rounded-ds border border-white/20 bg-black/90 p-2 font-mono text-[10px] leading-tight text-white shadow-2xl">
      <div className="mb-1 flex items-center justify-between gap-3 text-[11px] font-bold">
        <span>safe-area debug</span>
        <button
          type="button"
          className="rounded border border-white/20 px-1 text-[10px] text-white/80"
          onClick={() => {
            window.localStorage.removeItem(SAFE_AREA_DEBUG_STORAGE_KEY)
            setEnabled(false)
          }}
        >
          off
        </button>
      </div>
      {lines.map(line => (
        <div key={line}>{line}</div>
      ))}
    </div>
  )
}

const HomeView = lazy(() => import('./components/HomeView'))
const StudyView = lazy(() => import('./components/StudyView'))
const ShuffleStudyView = lazy(() => import('./components/ShuffleStudyView'))
const LabsView = lazy(() => import('./components/labs/LabsView'))
const VideosView = lazy(() => import('./components/videos/VideosView'))
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
  // Setzt --app-bottom-safe-area auf die echte iOS-Safe-Area, damit die
  // Action-Sheets (Filter/Erstellen) über dem Home-Indicator bleiben. Die
  // Hauptnavigation sitzt jetzt oben; der Inhalt scrollt darunter edge-to-edge.
  useViewportCssVars(false)
  useAutoJoinDefaultProfile()
  useFullscreenPreference(settings.fullscreenEnabled)
  const swSupported = supportsServiceWorker()
  const prefersReducedMotion = useReducedMotion()
  const [view, setView] = useState<View>(getInitialView)
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null)
  const [activeTagCards, setActiveTagCards] = useState<Card[] | null>(null)
  const [activeShuffleCollection, setActiveShuffleCollection] = useState<ShuffleCollection | null>(null)
  const [updateInstalledNotice, setUpdateInstalledNotice] = useState(false)
  const [pendingReloadAfterStudy, setPendingReloadAfterStudy] = useState(false)
  const updateNoticeTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!swSupported) return

    const onUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ waitingWorker: ServiceWorker | null }>
      const waitingWorker = customEvent.detail?.waitingWorker ?? null
      if (!waitingWorker) return

      setUpdateInstalledNotice(true)
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    }

    window.addEventListener(SW_CHANNELS.updateEvent, onUpdate)
    return () => window.removeEventListener(SW_CHANNELS.updateEvent, onUpdate)
  }, [swSupported])

  useEffect(() => {
    if (!updateInstalledNotice) return

    if (updateNoticeTimerRef.current !== null) {
      window.clearTimeout(updateNoticeTimerRef.current)
    }

    updateNoticeTimerRef.current = window.setTimeout(() => {
      setUpdateInstalledNotice(false)
      updateNoticeTimerRef.current = null
    }, 5000)

    return () => {
      if (updateNoticeTimerRef.current !== null) {
        window.clearTimeout(updateNoticeTimerRef.current)
        updateNoticeTimerRef.current = null
      }
    }
  }, [updateInstalledNotice])

  useEffect(() => {
    if (!swSupported) return

    let reloadTimer: number | null = null

    const onControllerChange = () => {
      setUpdateInstalledNotice(true)

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

  const startStudy = (deck: Deck) => {
    setActiveDeck(deck)
    setActiveTagCards(null)
    setActiveShuffleCollection(null)
    setView('study')
  }

  const startTagStudy = (tag: string, cards: Card[]) => {
    const syntheticDeck: Deck = {
      id: `tag:${tag}`,
      name: `#${tag}`,
      total: cards.length,
      new: cards.filter(c => c.type === 'new').length,
      learning: cards.filter(c => c.type === 'learning' || c.type === 'relearning').length,
      due: cards.filter(c => c.type === 'review').length,
    }
    setActiveDeck(syntheticDeck)
    setActiveTagCards(cards)
    setActiveShuffleCollection(null)
    setView('study')
  }

  // Daily Quest (Pilot-Kachel): gemischte Session über mehrere Decks. Nutzt wie
  // die Tag-Session ein synthetisches Deck mit vorab geladenen Karten; Reviews
  // fließen über die deckId der Karten weiter in die Ursprungsdecks.
  const startDailyQuest = (cards: Card[]) => {
    const syntheticDeck: Deck = {
      id: 'daily-quest',
      name: settings.language === 'de' ? 'Daily Quest' : 'Daily Quest',
      total: cards.length,
      new: cards.filter(c => c.type === 'new').length,
      learning: cards.filter(c => c.type === 'learning' || c.type === 'relearning').length,
      due: cards.filter(c => c.type === 'review').length,
    }
    setActiveDeck(syntheticDeck)
    setActiveTagCards(cards)
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

  const openLabs = () => {
    setActiveDeck(null)
    setActiveTagCards(null)
    setActiveShuffleCollection(null)
    setView('labs')
  }

  const openVideos = () => {
    setActiveDeck(null)
    setActiveTagCards(null)
    setActiveShuffleCollection(null)
    setView('videos')
  }

  const goHome = () => {
    setView('home')
    setActiveDeck(null)
    setActiveTagCards(null)
    setActiveShuffleCollection(null)
  }

  return (
    <AppErrorBoundary>
      <AppInitializer>
        <div
          className="flex h-[100dvh] min-h-0 flex-col overflow-hidden"
          style={{
            background: 'var(--app-background)',
            height: 'var(--app-viewport-height, 100dvh)',
            minHeight: 'var(--app-viewport-height, 100dvh)',
          }}
        >
          <ToastContainer />
          <SafeAreaDebugOverlay />
          <Suspense fallback={null}>
            {swSupported && updateInstalledNotice && (
              <UpdateBanner
                deferredReload={view === 'study' || view === 'shuffle-study'}
              />
            )}
          </Suspense>
          <Suspense fallback={<ViewFallback />}>
            {/* View-Wechsel bewusst OHNE exit-gated AnimatePresence (wait-Modus):
                dessen Exit→Enter-Handover konnte hängen (z. B. Study → Home nach
                einer Drag-Match-Antwort) und die Zielansicht nie mounten. Die
                Views remounten über ihre Keys nur mit Enter-Animation.
                Guard: __tests__/ui/no-animatepresence-wait.test.ts */}
            {view === 'home' && (
              <motion.div
                key="home"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.16 : 0.2, ease: 'easeOut' }}
                className="flex-1 min-h-0 h-full home-view"
              >
                <HomeView
                  onStartStudy={startStudy}
                  onStartTagStudy={startTagStudy}
                  onStartShuffleStudy={startShuffleStudy}
                  onOpenShuffleManager={openShuffleManager}
                  onStartDailyQuest={startDailyQuest}
                  onOpenLabs={openLabs}
                  onOpenVideos={openVideos}
                />
              </motion.div>
            )}

            {view === 'shuffle-manage' && (
              <motion.div
                key="shuffle-manage"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.16 : 0.2, ease: 'easeOut' }}
                className="flex-1 min-h-0 h-full home-view"
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
                transition={{ duration: prefersReducedMotion ? 0.16 : 0.2, ease: 'easeOut' }}
                className="flex-1 min-h-0 h-full study-view"
              >
                <StudyView deck={activeDeck} preloadedCards={activeTagCards ?? undefined} onExit={goHome} />
              </motion.div>
            )}

            {view === 'shuffle-study' && activeShuffleCollection && (
              <motion.div
                key="shuffle-study"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.995 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: prefersReducedMotion ? 0.16 : 0.2, ease: 'easeOut' }}
                className="flex-1 min-h-0 h-full study-view"
              >
                <ShuffleStudyView collection={activeShuffleCollection} onExit={goHome} />
              </motion.div>
            )}

            {view === 'labs' && (
              <motion.div
                key="labs"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.16 : 0.2, ease: 'easeOut' }}
                className="flex-1 min-h-0 h-full"
              >
                <LabsView language={settings.language} onExit={goHome} />
              </motion.div>
            )}

            {view === 'videos' && (
              <motion.div
                key="videos"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.16 : 0.2, ease: 'easeOut' }}
                className="flex-1 min-h-0 h-full"
              >
                <VideosView language={settings.language} onExit={goHome} />
              </motion.div>
            )}
          </Suspense>
        </div>
      </AppInitializer>
    </AppErrorBoundary>
  )
}

export default function App() {
  return (
    <LazyMotion features={loadMotionFeatures}>
      <ThemeProvider>
        <SettingsProvider>
          <AppShell />
        </SettingsProvider>
      </ThemeProvider>
    </LazyMotion>
  )
}
