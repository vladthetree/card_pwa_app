/**
 * AI_CONTEXT:
 * Role: Owns the app's top-level screen-navigation state machine — which View is
 * active, the payload (deck/cards/collection) it needs, and every entry/exit action
 * that transitions between screens (deck study, tag study, daily quest, objective
 * handoff from videos, session resume, shuffle, learning-unit and video deep-links).
 * Used by: AppShell (src/App.tsx) only.
 * Important: App-level navigation is local state, not a router. `showInitialSplash`
 * gates the quick-study auto-start so it never races the startup splash.
 */
import { useEffect, useRef, useState } from 'react'
import type { Card, Deck, ShuffleCollection, View } from '../../types'
import {
  clearActiveSession,
  getDeckNameMap,
  getResumableStudySession,
  listCardsByIds,
  pickDailyQuestCards,
} from '../../db/queries'
import { STORAGE_KEYS } from '../../constants/appIdentity'
import { useSettings } from '../../contexts/SettingsContext'
import { readTodayPackagePointer } from '../../utils/todayPackage'
import { getAppStoreState, useAppStore } from '../../state/appStore'
import { resolveStudyReturnTarget } from '../../services/studySessionPersistence'
import { getSecurityObjectiveDeckName } from '../../utils/securityDeckHierarchy'

/** Import-Anforderung an Home: token erzwingt den Effekt auch bei erneutem
 *  Öffnen, file kommt aus dem launchQueue-File-Handler (sonst null). */
export interface HomeImportRequest {
  token: number
  file: File | null
}

/** Reminder-Push und Manifest-Shortcut verlinken auf `/?view=study`. */
function isQuickStudyRequested(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('view') === 'study'
}

/** Manifest-Shortcut und File-Handler verlinken auf `/?view=import`.
 *  Der SW-Install-/Update-Fluss lädt die Seite neu (controllerchange → reload),
 *  nachdem der URL-Sync `?view=…` bereits entfernt hat — deshalb wird die
 *  Anforderung in sessionStorage geparkt und erst beim Öffnen des ImportModals
 *  konsumiert (useHomeViewController). */
function isImportRequested(): boolean {
  if (typeof window === 'undefined') return false
  if (new URLSearchParams(window.location.search).get('view') === 'import') {
    try {
      sessionStorage.setItem(STORAGE_KEYS.pendingImportRequest, '1')
    } catch { /* best effort */ }
    return true
  }
  try {
    return sessionStorage.getItem(STORAGE_KEYS.pendingImportRequest) === '1'
  } catch {
    return false
  }
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
  if (sessionId.startsWith('unit-exec:')) {
    const { getExecution } = await import('../../db/queries/learningUnits')
    const execution = await getExecution(sessionId.slice('unit-exec:'.length))
    const match = execution ? /^unit:course:(\d{3})$/.exec(execution.unitId) : null
    return match ? `Lerneinheit ${match[1]}` : 'Lerneinheit'
  }
  if (sessionId.startsWith('learning-plan:acronyms:')) return 'Acronym-Karten'
  if (sessionId.startsWith('learning-plan:subdeck:')) {
    return getSecurityObjectiveDeckName(sessionId.slice('learning-plan:subdeck:'.length))
  }
  const names = await getDeckNameMap()
  return names[sessionId] ?? 'Deck'
}

export function useAppNavigation(input: { showInitialSplash: boolean }): {
  view: View
  activeDeck: Deck | null
  activeTagCards: Card[] | null
  activeShuffleCollection: ShuffleCollection | null
  allowSessionResume: boolean
  studyReturnToUnits: boolean
  resumeInfo: { deckName: string; remaining: number } | null
  importRequest: HomeImportRequest | null
  videosInitialTarget: { videoIndex: number; openRecall: boolean } | null
  videosReturnToUnits: boolean
  homeTabRequest: { tab: 'learning-units'; token: number } | null
  startStudy: (
    deck: Deck,
    fixedCardIds?: string[],
    options?: { sessionId?: string; allowResume?: boolean; returnToUnits?: boolean },
  ) => Promise<void>
  startTagStudy: (tag: string, cards: Card[]) => void
  startDailyQuest: (cards: Card[]) => void
  startObjectiveStudy: (objective: { deckId: string; deckName: string; cards: Card[] }) => void
  resumeStudySession: () => Promise<boolean>
  startShuffleStudy: (collection: ShuffleCollection) => void
  openShuffleManager: () => void
  openLearningUnits: () => void
  openVideos: () => void
  openVideoAtIndex: (
    videoIndex: number,
    openRecall: boolean,
    options?: { fromLearningUnits?: boolean },
  ) => void
  exitVideos: () => void
  exitStudy: () => void
  goHome: () => void
} {
  const { showInitialSplash } = input
  const { settings } = useSettings()

  const view = useAppStore(store => store.activeView)
  const setView = (nextView: View) => getAppStoreState().setActiveView(nextView)
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
  const [importRequest, setImportRequest] = useState<HomeImportRequest | null>(
    () => (isImportRequested() ? { token: 1, file: null } : null)
  )
  // Heute-Paket-Sprungziel für die Lernvideos-Ansicht (null = normale Öffnung).
  const [videosInitialTarget, setVideosInitialTarget] = useState<{ videoIndex: number; openRecall: boolean } | null>(null)
  // Herkunft „Lerneinheiten-Modus": aus ihm geöffnete Videos/Karten-Sessions
  // kehren beim Schließen dorthin zurück statt auf Home bzw. in die Listenansicht.
  const [videosReturnToUnits, setVideosReturnToUnits] = useState(false)
  const [studyReturnToUnits, setStudyReturnToUnits] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const url = new URL(window.location.href)
    if (view === 'shuffle-manage') {
      url.searchParams.set('view', 'shuffle')
    } else {
      url.searchParams.delete('view')
    }

    window.history.replaceState({}, '', url)
  }, [view])

  // file_handlers aus dem Manifest (Chromium): geöffnete .apkg/.csv-Dateien
  // landen über die launchQueue direkt im ImportModal auf Home.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const launchQueue = (window as unknown as {
      launchQueue?: { setConsumer: (consumer: (params: { files?: FileSystemFileHandle[] }) => void) => void }
    }).launchQueue
    if (!launchQueue) return

    launchQueue.setConsumer(params => {
      void (async () => {
        const handle = params.files?.[0]
        if (!handle) return
        try {
          const file = await handle.getFile()
          setView('home')
          setImportRequest(prev => ({ token: (prev?.token ?? 0) + 1, file }))
        } catch (error) {
          console.warn('[App] launchQueue-Datei konnte nicht gelesen werden:', error)
        }
      })()
    })
  }, [])

  useEffect(() => {
    if (settings.shuffleModeEnabled) return
    if (view !== 'shuffle-manage') return
    setView('home')
  }, [settings.shuffleModeEnabled, view])

  const startStudy = async (
    deck: Deck,
    fixedCardIds?: string[],
    options?: { sessionId?: string; allowResume?: boolean; returnToUnits?: boolean },
  ) => {
    if (fixedCardIds !== undefined) {
      // Jeder kanonische Card.id darf pro Session nur einmal vorkommen, auch
      // wenn mehrere Lernplan-Referenzen dieselbe echte Karte beisteuern.
      const packageCards = await listCardsByIds([...new Set(fixedCardIds)])
      if (packageCards.length === 0) return
      setStudyReturnToUnits(options?.returnToUnits ?? false)
      // Lerneinheiten übergeben eine eigene Session-ID (`unit-exec:{executionId}`):
      // so kollidieren parallele Units desselben Objectives weder untereinander
      // noch mit der Heute-Paket-Session, und die Session ist wiederaufnehmbar.
      setAllowSessionResume(options?.allowResume ?? false)
      setActiveDeck(buildSyntheticDeck(options?.sessionId ?? `today-package:${deck.id}`, deck.name, packageCards))
      setActiveTagCards(packageCards)
      setActiveShuffleCollection(null)
      setView('study')
      return
    }

    setStudyReturnToUnits(options?.returnToUnits ?? false)
    setAllowSessionResume(true)
    setActiveDeck(deck)
    setActiveTagCards(null)
    setActiveShuffleCollection(null)
    setView('study')
  }

  const startTagStudy = (tag: string, cards: Card[]) => {
    setStudyReturnToUnits(false)
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
    setStudyReturnToUnits(false)
    setAllowSessionResume(false)
    setActiveDeck(buildSyntheticDeck('daily-quest', 'Daily Quest', cards))
    setActiveTagCards(cards)
    setActiveShuffleCollection(null)
    setView('study')
  }

  // Abruf-Check-Handoff: „Nicht gewusst“-Fragen des Videos als reguläre,
  // planungswirksame Mini-Session des Objective-Decks lernen.
  const startObjectiveStudy = (objective: { deckId: string; deckName: string; cards: Card[] }) => {
    setStudyReturnToUnits(false)
    setAllowSessionResume(false)
    setActiveDeck(buildSyntheticDeck(objective.deckId, objective.deckName, objective.cards))
    setActiveTagCards(objective.cards)
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
    setStudyReturnToUnits(
      resolveStudyReturnTarget(resumable.sessionId, resumable.snapshot) === 'learning-units',
    )
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
      const activePackageCardIds = readTodayPackagePointer().activeCardIds ?? []
      const cards = await pickDailyQuestCards(settings.studyCardLimit, settings.nextDayStartsAt, {
        excludeCardIds: activePackageCardIds,
        runSeed: `quick-daily-quest:${Date.now()}:${Math.random()}`,
      })
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

  // Lerneinheiten (SY0-701) sind ein Home-Modus unter der Homebar
  // (Nutzerentscheidung 2026-07-19): App fordert den Modus per Token an —
  // genutzt von der Rücknavigation aus Video-/Karten-Session einer Unit.
  // Labs sind seitdem ebenfalls ein Home-Modus und laufen komplett in HomeView.
  const [homeTabRequest, setHomeTabRequest] = useState<{ tab: 'learning-units'; token: number } | null>(null)
  const openLearningUnits = () => {
    setActiveDeck(null)
    setActiveTagCards(null)
    setActiveShuffleCollection(null)
    setHomeTabRequest(prev => ({ tab: 'learning-units', token: (prev?.token ?? 0) + 1 }))
    setView('home')
  }

  const openVideos = () => {
    setActiveDeck(null)
    setActiveTagCards(null)
    setActiveShuffleCollection(null)
    setVideosInitialTarget(null)
    setVideosReturnToUnits(false)
    setView('videos')
  }

  // Heute-Paket und Lerneinheiten: Lernvideos-Ansicht direkt bei einem
  // bestimmten Kurs-Video öffnen (optional gleich mit Abruf-Check).
  const openVideoAtIndex = (
    videoIndex: number,
    openRecall: boolean,
    options?: { fromLearningUnits?: boolean },
  ) => {
    setActiveDeck(null)
    setActiveTagCards(null)
    setActiveShuffleCollection(null)
    setVideosInitialTarget({ videoIndex, openRecall })
    setVideosReturnToUnits(options?.fromLearningUnits ?? false)
    setView('videos')
  }

  const goHome = () => {
    setView('home')
    setActiveDeck(null)
    setActiveTagCards(null)
    setActiveShuffleCollection(null)
  }

  const exitVideos = () => {
    setVideosInitialTarget(null)
    if (videosReturnToUnits) {
      setVideosReturnToUnits(false)
      openLearningUnits()
      return
    }
    goHome()
  }

  const exitStudy = () => {
    if (studyReturnToUnits) {
      setStudyReturnToUnits(false)
      openLearningUnits()
      return
    }
    goHome()
  }

  return {
    view,
    activeDeck,
    activeTagCards,
    activeShuffleCollection,
    allowSessionResume,
    studyReturnToUnits,
    resumeInfo,
    importRequest,
    videosInitialTarget,
    videosReturnToUnits,
    homeTabRequest,
    startStudy,
    startTagStudy,
    startDailyQuest,
    startObjectiveStudy,
    resumeStudySession,
    startShuffleStudy,
    openShuffleManager,
    openLearningUnits,
    openVideos,
    openVideoAtIndex,
    exitVideos,
    exitStudy,
    goHome,
  }
}
