/**
 * AI_CONTEXT:
 * Role: Root React shell for the PWA; owns top-level view state, app initialization, providers, safe-area CSS vars, service-worker update UI, and global modals.
 * Used by: main.tsx mounts this component; feature views are lazy-loaded from here.
 * Important: App-level navigation is local state, not a router; add new primary screens by extending the View type and this switch flow.
 */
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { LazyMotion } from 'framer-motion'
import { AnimatePresence, motion, useReducedMotion } from './ui/motion'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { SettingsProvider, useSettings } from './contexts/SettingsContext'
import AppInitializer from './components/AppInitializer'
import AppErrorBoundary from './components/AppErrorBoundary'
import ToastContainer from './components/ToastContainer'
import StartupLoader from './components/StartupLoader'
import { APP_NAME } from './constants/appIdentity'
import { supportsServiceWorker } from './env'
import { useAutoJoinDefaultProfile } from './hooks/useAutoJoinDefaultProfile'
import { pickLaunchMotivationQuote } from './utils/motivationQuote'
import { useFullscreenPreference } from './hooks/useFullscreen'
import { useStartupSplash } from './hooks/app/useStartupSplash'
import { useServiceWorkerUpdateFlow } from './hooks/app/useServiceWorkerUpdateFlow'
import { useAppNavigation } from './hooks/app/useAppNavigation'
import type { ServiceWorkerStartupReadiness } from './runtime/swRegistration'
import { UI_TOKENS } from './constants/ui'

const SAFE_AREA_DEBUG_STORAGE_KEY = 'card-pwa-safe-area-debug'

interface AppProps {
  startupReady?: Promise<ServiceWorkerStartupReadiness>
}

// Animations-Features (domMax) laden async als eigener Chunk: die m-Komponenten
// aus ui/motion rendern sofort und animieren, sobald das Paket da ist (nach dem
// ersten Start aus dem SW-Cache praktisch verzögerungsfrei).
const loadMotionFeatures = () => import('./ui/motionFeatures').then(mod => mod.default)

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
    <div className={`neo-keep-dark fixed left-2 top-2 ${UI_TOKENS.zIndex.splash} max-w-[calc(100vw-1rem)] rounded-ds border border-white/20 bg-black/90 p-2 font-mono text-[10px] leading-tight text-white shadow-2xl`}>
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
const VideosView = lazy(() => import('./components/videos/VideosView'))
const UpdateBanner = lazy(() => import('./components/UpdateBanner'))

function ViewFallback({ reason = 'startup', continueHint = false }: { reason?: 'startup' | 'update'; continueHint?: boolean }) {
  const { settings } = useSettings()
  const { theme } = useTheme()
  const prefersReducedMotion = useReducedMotion()
  const loadingText = reason === 'update'
    ? (settings.language === 'de' ? 'Aktualisiere App' : 'Updating app')
    : (settings.language === 'de' ? 'Pruefe App-Version' : 'Checking app version')
  const continueText = settings.language === 'de' ? 'Tippen, um fortzufahren' : 'Tap to continue'
  // Motivationsspruch: pro App-Launch neu gewählt, innerhalb dieses Starts stabil.
  const quote = useMemo(() => pickLaunchMotivationQuote(settings.language === 'de' ? 'de' : 'en'), [settings.language])

  return (
    <div
      className="flex flex-1 items-center justify-center px-4"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex min-h-[22rem] w-full max-w-xl flex-col items-center justify-center">
        <div className="flex h-44 w-72 max-w-[78vw] items-center justify-center overflow-visible sm:h-52 sm:w-80">
          <StartupLoader
            primary={theme.primary}
            secondary={theme.secondary}
            reducedMotion={prefersReducedMotion}
          />
        </div>
        <div className="mt-5 text-center">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ds-muted">
            {APP_NAME}
          </div>
          {continueHint ? (
            <div className="mt-2 animate-pulse font-mono text-sm text-[--brand-primary]" data-testid="splash-continue-hint">
              {continueText}
            </div>
          ) : (
            <div className="mt-2 font-mono text-sm text-white/75">
              {loadingText}
              <span className="ml-1 inline-block animate-pulse text-[--brand-primary]">...</span>
            </div>
          )}
        </div>
        {/* Motivationsspruch — der Grund, warum der Splash bewusst etwas länger steht. */}
        <div className="mt-7 max-w-sm px-2 text-center" data-testid="splash-motivation">
          <div className="font-mono text-[15px] font-bold leading-snug text-white">
            {quote.title}
          </div>
          <p className="mt-2 font-mono text-[12.5px] leading-relaxed text-zinc-400">
            {quote.body}
          </p>
        </div>
      </div>
    </div>
  )
}

const defaultStartupReady: Promise<ServiceWorkerStartupReadiness> = Promise.resolve({
  status: 'unsupported',
  activatedUpdate: false,
})

function AppShell({ startupReady }: { startupReady: Promise<ServiceWorkerStartupReadiness> }) {
  const { settings } = useSettings()
  // Setzt --app-bottom-safe-area auf die echte iOS-Safe-Area, damit die
  // Action-Sheets (Filter/Erstellen) über dem Home-Indicator bleiben. Die
  // Hauptnavigation sitzt jetzt oben; der Inhalt scrollt darunter edge-to-edge.
  useViewportCssVars(false)
  useAutoJoinDefaultProfile()
  useFullscreenPreference(settings.fullscreenEnabled)
  const swSupported = supportsServiceWorker()
  const prefersReducedMotion = useReducedMotion()

  const { showInitialSplash, splashContinueReady, dismissInitialSplash } = useStartupSplash(startupReady)
  const nav = useAppNavigation({ showInitialSplash })
  const isStudyView = nav.view === 'study' || nav.view === 'shuffle-study'
  const { updateInstalledNotice, showUpdateSplash } = useServiceWorkerUpdateFlow({ swSupported, isStudyView })

  const activeSplashMode = showInitialSplash ? 'startup' : showUpdateSplash ? 'update' : null

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
            {swSupported && updateInstalledNotice && !showUpdateSplash && (
              <UpdateBanner
                deferredReload={isStudyView}
              />
            )}
          </Suspense>
          <Suspense fallback={showInitialSplash ? null : <ViewFallback />}>
            {/* View-Wechsel bewusst OHNE exit-gated AnimatePresence (wait-Modus):
                dessen Exit→Enter-Handover konnte hängen (z. B. Study → Home nach
                einer Drag-Match-Antwort) und die Zielansicht nie mounten. Die
                Views remounten über ihre Keys nur mit Enter-Animation.
                Guard: __tests__/ui/no-animatepresence-wait.test.ts */}
            {nav.view === 'home' && (
              <motion.div
                key="home"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.16 : 0.2, ease: 'easeOut' }}
                className="flex-1 min-h-0 h-full home-view"
              >
                <HomeView
                  onStartStudy={nav.startStudy}
                  onStartTagStudy={nav.startTagStudy}
                  onStartShuffleStudy={nav.startShuffleStudy}
                  onOpenShuffleManager={nav.openShuffleManager}
                  onStartDailyQuest={nav.startDailyQuest}
                  onOpenVideos={nav.openVideos}
                  onOpenVideoAtIndex={nav.openVideoAtIndex}
                  resumeSession={nav.resumeInfo}
                  onResumeSession={() => void nav.resumeStudySession()}
                  importRequest={nav.importRequest}
                  homeTabRequest={nav.homeTabRequest}
                />
              </motion.div>
            )}

            {nav.view === 'shuffle-manage' && (
              <motion.div
                key="shuffle-manage"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.16 : 0.2, ease: 'easeOut' }}
                className="flex-1 min-h-0 h-full home-view"
              >
                <HomeView
                  mode="shuffle-manage"
                  onBackHome={nav.goHome}
                  onStartStudy={nav.startStudy}
                  onStartShuffleStudy={nav.startShuffleStudy}
                  onOpenShuffleManager={nav.openShuffleManager}
                />
              </motion.div>
            )}

            {nav.view === 'study' && nav.activeDeck && (
              <motion.div
                key="study"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.995 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: prefersReducedMotion ? 0.16 : 0.2, ease: 'easeOut' }}
                className="flex-1 min-h-0 h-full study-view"
              >
                <StudyView deck={nav.activeDeck} preloadedCards={nav.activeTagCards ?? undefined} allowResume={nav.allowSessionResume} onExit={nav.exitStudy} />
              </motion.div>
            )}

            {nav.view === 'shuffle-study' && nav.activeShuffleCollection && (
              <motion.div
                key="shuffle-study"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.995 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: prefersReducedMotion ? 0.16 : 0.2, ease: 'easeOut' }}
                className="flex-1 min-h-0 h-full study-view"
              >
                <ShuffleStudyView collection={nav.activeShuffleCollection} onExit={nav.goHome} />
              </motion.div>
            )}

            {nav.view === 'videos' && (
              <motion.div
                key="videos"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.16 : 0.2, ease: 'easeOut' }}
                className="flex-1 min-h-0 h-full"
              >
                <VideosView
                  language={settings.language}
                  onExit={nav.exitVideos}
                  onStartObjectiveStudy={nav.startObjectiveStudy}
                  initialVideoIndex={nav.videosInitialTarget?.videoIndex ?? null}
                  initialRecallOpen={nav.videosInitialTarget?.openRecall ?? false}
                  onCloseInitialVideo={nav.videosReturnToUnits ? nav.exitVideos : undefined}
                />
              </motion.div>
            )}
          </Suspense>
          <AnimatePresence>
            {activeSplashMode && (
              <motion.div
                key={`${activeSplashMode}-splash`}
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.12 : 0.24, ease: 'easeOut' }}
                className={`fixed inset-0 z-[2200] flex bg-[--ds-bg] ${activeSplashMode === 'startup' && splashContinueReady ? 'cursor-pointer' : ''}`}
                style={{ background: 'var(--app-background)' }}
                data-testid={activeSplashMode === 'startup' ? 'splash-continue' : undefined}
                role={activeSplashMode === 'startup' ? 'button' : undefined}
                tabIndex={activeSplashMode === 'startup' ? 0 : undefined}
                onClick={activeSplashMode === 'startup' ? dismissInitialSplash : undefined}
                onKeyDown={activeSplashMode === 'startup'
                  ? event => {
                      if (event.key === 'Enter' || event.key === ' ') dismissInitialSplash()
                    }
                  : undefined}
              >
                <ViewFallback
                  reason={activeSplashMode === 'update' ? 'update' : 'startup'}
                  continueHint={activeSplashMode === 'startup' && splashContinueReady}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AppInitializer>
    </AppErrorBoundary>
  )
}

export default function App({ startupReady = defaultStartupReady }: AppProps) {
  return (
    <LazyMotion features={loadMotionFeatures}>
      <ThemeProvider>
        <SettingsProvider>
          <AppShell startupReady={startupReady} />
        </SettingsProvider>
      </ThemeProvider>
    </LazyMotion>
  )
}
