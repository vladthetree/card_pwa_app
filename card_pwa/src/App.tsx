/**
 * AI_CONTEXT:
 * Role: Root React shell for the PWA; owns top-level view state, app initialization, providers, safe-area CSS vars, service-worker update UI, and global modals.
 * Used by: main.tsx mounts this component; feature views are lazy-loaded from here.
 * Important: App-level navigation is local state, not a router; add new primary screens by extending the View type and this switch flow.
 */
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { LazyMotion } from 'framer-motion'
import { AnimatePresence, motion, useReducedMotion } from './ui/motion'
import { ThemeProvider } from './contexts/ThemeContext'
import { SettingsProvider, useSettings } from './contexts/SettingsContext'
import AppInitializer from './components/AppInitializer'
import AppErrorBoundary from './components/AppErrorBoundary'
import ToastContainer from './components/ToastContainer'
import type { Card, Deck, ShuffleCollection, View } from './types'
import {
  clearActiveSession,
  getDeckNameMap,
  getResumableStudySession,
  listCardsByIds,
  pickDailyQuestCards,
} from './db/queries'
import { APP_NAME, SW_CHANNELS } from './constants/appIdentity'
import { supportsServiceWorker } from './env'
import { useAutoJoinDefaultProfile } from './hooks/useAutoJoinDefaultProfile'
import { useFullscreenPreference } from './hooks/useFullscreen'
import type { ServiceWorkerStartupReadiness } from './runtime/swRegistration'

const SAFE_AREA_DEBUG_STORAGE_KEY = 'card-pwa-safe-area-debug'
const INITIAL_SPLASH_MIN_MS = 1250

interface AppProps {
  startupReady?: Promise<ServiceWorkerStartupReadiness>
}

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
    // 'study' startet nach der Initialisierung direkt eine Session (Resume oder
    // Daily Quest) — siehe den Quick-Study-Effekt in AppShell.
  }
  return 'home'
}

/** Reminder-Push und Manifest-Shortcut verlinken auf `/?view=study`. */
function isQuickStudyRequested(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('view') === 'study'
}

function buildSyntheticDeck(id: string, name: string, cards: Card[]): Deck {
  return {
    id,
    name,
    total: cards.length,
    new: cards.filter(c => c.type === 'new').length,
    learning: cards.filter(c => c.type === 'learning' || c.type === 'relearning').length,
    due: cards.filter(c => c.type === 'review').length,
  }
}

/** Anzeigename einer persistierten Session (echtes Deck, Quest oder Tag-Batch). */
async function resolveSessionDeckName(sessionId: string): Promise<string> {
  if (sessionId === 'daily-quest') return 'Daily Quest'
  if (sessionId.startsWith('tag:')) return `#${sessionId.slice(4)}`
  const names = await getDeckNameMap()
  return names[sessionId] ?? 'Deck'
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
const MetaBalls = lazy(() => import('./components/MetaBalls'))

function ViewFallback({ reason = 'startup' }: { reason?: 'startup' | 'update' }) {
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const loadingText = reason === 'update'
    ? (settings.language === 'de' ? 'Aktualisiere App' : 'Updating app')
    : (settings.language === 'de' ? 'Pruefe App-Version' : 'Checking app version')

  return (
    <div
      className="flex flex-1 items-center justify-center px-4"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex min-h-[22rem] w-full max-w-xl flex-col items-center justify-center">
        <div className="relative h-56 w-72 max-w-[78vw] overflow-hidden sm:h-64 sm:w-80">
          <Suspense fallback={null}>
            <MetaBalls
              color="#e75f3c"
              cursorBallColor="#79b7aa"
              cursorBallSize={prefersReducedMotion ? 0 : 2.4}
              ballCount={prefersReducedMotion ? 5 : 12}
              animationSize={24}
              enableMouseInteraction={false}
              enableTransparency
              hoverSmoothness={0.08}
              clumpFactor={0.72}
              speed={prefersReducedMotion ? 0 : 0.9}
            />
          </Suspense>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_38%,rgba(11,11,9,0.58)_100%)]" />
        </div>
        <div className="mt-6 text-center">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ds-muted">
            {APP_NAME}
          </div>
          <div className="mt-2 font-mono text-sm text-white/75">
            {loadingText}
            <span className="ml-1 inline-block animate-pulse text-[--brand-primary]">...</span>
          </div>
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
  const [view, setView] = useState<View>(getInitialView)
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null)
  const [activeTagCards, setActiveTagCards] = useState<Card[] | null>(null)
  const [activeShuffleCollection, setActiveShuffleCollection] = useState<ShuffleCollection | null>(null)
  // true nur für Flüsse, die eine unterbrochene Session fortsetzen sollen
  // (Deck-Tap, Resume-Kachel, ?view=study) — frische Quest-/Tag-/Handoff-Starts
  // mischen bewusst neu.
  const [allowSessionResume, setAllowSessionResume] = useState(false)
  const [resumeInfo, setResumeInfo] = useState<{ deckName: string; remaining: number } | null>(null)
  // Beim ersten Render einfangen: der URL-Sync-Effekt unten räumt `?view=…`
  // gleich nach dem Mount aus der Adresszeile, bevor spätere Effekte sie lesen.
  const [quickStudyRequested] = useState(isQuickStudyRequested)
  const quickStudyHandledRef = useRef(false)
  const [updateInstalledNotice, setUpdateInstalledNotice] = useState(false)
  const [pendingReloadAfterStudy, setPendingReloadAfterStudy] = useState(false)
  const [showInitialSplash, setShowInitialSplash] = useState(true)
  const [showUpdateSplash, setShowUpdateSplash] = useState(false)
  const updateNoticeTimerRef = useRef<number | null>(null)
  const updateActivationFallbackRef = useRef<number | null>(null)
  const isStudyView = view === 'study' || view === 'shuffle-study'

  useEffect(() => {
    let cancelled = false
    const minSplash = new Promise<void>(resolve => {
      window.setTimeout(resolve, INITIAL_SPLASH_MIN_MS)
    })

    void Promise.all([
      minSplash,
      startupReady.catch(() => ({ status: 'error', activatedUpdate: false }) satisfies ServiceWorkerStartupReadiness),
    ]).then(([, readiness]) => {
      if (cancelled) return

      if (readiness.activatedUpdate) {
        window.location.reload()
        return
      }

      setShowInitialSplash(false)
    })

    return () => {
      cancelled = true
    }
  }, [startupReady])

  useEffect(() => {
    if (!swSupported) return

    const onUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ waitingWorker: ServiceWorker | null }>
      const waitingWorker = customEvent.detail?.waitingWorker ?? null
      if (!waitingWorker) return

      setUpdateInstalledNotice(true)
      if (!isStudyView) {
        setShowUpdateSplash(true)
        if (updateActivationFallbackRef.current !== null) {
          window.clearTimeout(updateActivationFallbackRef.current)
        }
        updateActivationFallbackRef.current = window.setTimeout(() => {
          setShowUpdateSplash(false)
          updateActivationFallbackRef.current = null
        }, 8000)
      }
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    }

    window.addEventListener(SW_CHANNELS.updateEvent, onUpdate)
    return () => window.removeEventListener(SW_CHANNELS.updateEvent, onUpdate)
  }, [isStudyView, swSupported])

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
      if (updateActivationFallbackRef.current !== null) {
        window.clearTimeout(updateActivationFallbackRef.current)
        updateActivationFallbackRef.current = null
      }
      setUpdateInstalledNotice(true)

      if (isStudyView) {
        setPendingReloadAfterStudy(true)
        return
      }

      setShowUpdateSplash(true)
      reloadTimer = window.setTimeout(() => {
        window.location.reload()
      }, 180)
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      if (reloadTimer !== null) {
        window.clearTimeout(reloadTimer)
      }
    }
  }, [isStudyView, swSupported])

  useEffect(() => {
    if (!pendingReloadAfterStudy) return
    if (isStudyView) return

    setShowUpdateSplash(true)
    const reloadTimer = window.setTimeout(() => {
      window.location.reload()
    }, 180)

    return () => window.clearTimeout(reloadTimer)
  }, [isStudyView, pendingReloadAfterStudy])

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
    setAllowSessionResume(true)
    setActiveDeck(deck)
    setActiveTagCards(null)
    setActiveShuffleCollection(null)
    setView('study')
  }

  const startTagStudy = (tag: string, cards: Card[]) => {
    setAllowSessionResume(false)
    setActiveDeck(buildSyntheticDeck(`tag:${tag}`, `#${tag}`, cards))
    setActiveTagCards(cards)
    setActiveShuffleCollection(null)
    setView('study')
  }

  // Daily Quest (Pilot-Kachel): gemischte Session über mehrere Decks. Nutzt wie
  // die Tag-Session ein synthetisches Deck mit vorab geladenen Karten; Reviews
  // fließen über die deckId der Karten weiter in die Ursprungsdecks.
  const startDailyQuest = (cards: Card[]) => {
    setAllowSessionResume(false)
    setActiveDeck(buildSyntheticDeck('daily-quest', 'Daily Quest', cards))
    setActiveTagCards(cards)
    setActiveShuffleCollection(null)
    setView('study')
  }

  // Abruf-Check-Handoff: „Nicht gewusst“-Fragen des Videos als reguläre,
  // planungswirksame Mini-Session des Objective-Decks lernen.
  const startObjectiveStudy = (input: { deckId: string; deckName: string; cards: Card[] }) => {
    setAllowSessionResume(false)
    setActiveDeck(buildSyntheticDeck(input.deckId, input.deckName, input.cards))
    setActiveTagCards(input.cards)
    setActiveShuffleCollection(null)
    setView('study')
  }

  /** Nimmt die jüngste unterbrochene Session wieder auf (Queue + Zähler). */
  const resumeStudySession = async (): Promise<boolean> => {
    const resumable = await getResumableStudySession()
    if (!resumable) return false
    const cards = await listCardsByIds(resumable.snapshot.cardIds)
    if (cards.length === 0) {
      void clearActiveSession(resumable.sessionId)
      return false
    }
    const deckName = await resolveSessionDeckName(resumable.sessionId)
    setAllowSessionResume(true)
    setActiveDeck(buildSyntheticDeck(resumable.sessionId, deckName, cards))
    setActiveTagCards(cards)
    setActiveShuffleCollection(null)
    setView('study')
    return true
  }

  // ?view=study (Reminder-Push, Manifest-Shortcut): direkt in eine Session statt
  // auf Home stranden — erst Resume versuchen, sonst Daily Quest starten.
  useEffect(() => {
    if (!quickStudyRequested || quickStudyHandledRef.current) return
    if (showInitialSplash || view !== 'home') return
    quickStudyHandledRef.current = true
    void (async () => {
      if (await resumeStudySession()) return
      const cards = await pickDailyQuestCards(settings.dailyQuestSize, settings.nextDayStartsAt)
      if (cards.length > 0) startDailyQuest(cards)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickStudyRequested, showInitialSplash, view])

  // Datengrundlage der „Weiterlernen“-Kachel auf Home.
  useEffect(() => {
    if (view !== 'home') return
    let cancelled = false
    void (async () => {
      const resumable = await getResumableStudySession()
      if (cancelled) return
      if (!resumable) {
        setResumeInfo(null)
        return
      }
      const deckName = await resolveSessionDeckName(resumable.sessionId)
      if (cancelled) return
      setResumeInfo({ deckName, remaining: resumable.snapshot.cardIds.length })
    })()
    return () => {
      cancelled = true
    }
  }, [view])

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
                  resumeSession={resumeInfo}
                  onResumeSession={() => void resumeStudySession()}
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
                <StudyView deck={activeDeck} preloadedCards={activeTagCards ?? undefined} allowResume={allowSessionResume} onExit={goHome} />
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
                <VideosView language={settings.language} onExit={goHome} onStartObjectiveStudy={startObjectiveStudy} />
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
                className="fixed inset-0 z-[2200] flex bg-[--ds-bg]"
                style={{ background: 'var(--app-background)' }}
              >
                <ViewFallback reason={activeSplashMode === 'update' ? 'update' : 'startup'} />
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
