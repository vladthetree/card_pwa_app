/**
 * AI_CONTEXT:
 * Role: Data hook for the Home "Heute-Paket" tile — resolves today's course video,
 *       derives the three step states (video, recall check, cards) from real signals,
 *       and advances the completion pointer when a package is done.
 * Used by: HomeView (todayPackageTile slide).
 * Important: Step completion is measured via actual signals (recall run recorded,
 *            cards reviewed via recordReview) — never via button clicks. The package
 *            itself schedules nothing.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { db } from '../../db'
import {
  listDeckCards,
  listDeckCardIdsReviewedSince,
  countNewCardsIntroducedToday,
} from '../../db/queries'
import { resolveNewCardAllowance, sortStudyCards } from '../../services/studyCardOrdering'
import { buildLocalVideoManifest, type LocalVideoMeta } from '../../utils/localVideoManifest'
import { getSecurityObjectiveDeckId, getSecurityObjectiveDeckName } from '../../utils/securityDeckHierarchy'
import {
  hasRecallRunSince,
  persistTodayPackagePointer,
  persistVideoCatalogFiles,
  pickTodayVideo,
  readCachedVideoCatalogFiles,
  readTodayPackagePointer,
} from '../../utils/todayPackage'
import { readVideoProgress } from '../useMesserVideoProgress'
import { readRecallScores, videoScoreKey } from '../useVideoRecallScores'
import { useDayStartMs } from '../useDayStartMs'
import { REVIEW_UPDATED_EVENT } from '../../constants/appIdentity'
import type { Deck } from '../../types'

const MANIFEST_URL = '/media/messer/index.json'
// Kurz genug, dass ein nicht erreichbarer Pi den Home-Start nicht blockiert;
// im LAN antwortet der Server in Millisekunden.
const MANIFEST_FETCH_TIMEOUT_MS = 4000

export interface TodayPackageSteps {
  video: boolean
  recall: boolean
  cards: boolean
}

export interface TodayPackageData {
  loading: boolean
  /** false = kein Videokatalog erreichbar UND keine lokalen Daten. */
  available: boolean
  /** true = Server nicht erreichbar UND noch nie ein Katalog lokal gespeichert
   *  (weder localStorage-Kopie noch Video-Downloads) → Meldung statt Kachel. */
  offlineNoData: boolean
  video: LocalVideoMeta | null
  /** Position im Kurs (1-basiert) und Gesamtzahl, z. B. „Video 12/121“. */
  videoNumber: number
  videoTotal: number
  steps: TodayPackageSteps
  /** Deck der Objective für den Karten-Schritt (null = Deck ohne Karten). */
  objectiveDeck: Deck | null
  /** Karten, die im Karten-Schritt noch offen sind (Button-Label). */
  remainingCards: number
  /** Feste Karten-IDs des aktuellen Pakets; Daily Quest schliesst sie aus. */
  activeCardIds: string[]
  /** Heute wurde (mindestens) ein Paket abgeschlossen. */
  completedToday: boolean
  /** Noch nicht abgeschlossene Kurs-Videos (Prüfungs-Pacing). */
  remainingVideos: number
  reload: () => void
}

/** null = Manifest nicht erreichbar (offline/Server weg/Timeout). */
async function fetchManifestFiles(): Promise<string[] | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), MANIFEST_FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(MANIFEST_URL, { cache: 'no-store', signal: controller.signal })
    if (!res.ok) return null
    const data = (await res.json()) as { files?: unknown }
    if (!Array.isArray(data.files)) return null
    return data.files.filter((file): file is string => typeof file === 'string')
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

interface VideoCatalogResult {
  catalog: LocalVideoMeta[]
  /** true = Katalog stammt aus lokalen Quellen (Cache/Downloads), nicht vom Server. */
  fromLocalFallback: boolean
}

async function loadVideoCatalog(): Promise<VideoCatalogResult> {
  const files = new Set<string>()
  const manifestFiles = await fetchManifestFiles()
  if (manifestFiles !== null) {
    for (const file of manifestFiles) files.add(file)
    // Erfolgreiche Antwort sofort persistieren: genau diese Kopie macht das
    // Heute-Paket nach Neustart ohne Netz wieder verfügbar.
    persistVideoCatalogFiles(manifestFiles)
  } else {
    for (const file of readCachedVideoCatalogFiles()) files.add(file)
  }
  try {
    for (const row of await db.videoDownloads.toArray()) files.add(row.file)
  } catch {
    // Ohne Downloads-Tabelle bleibt es bei Manifest bzw. Cache.
  }
  return {
    catalog: buildLocalVideoManifest(Array.from(files)),
    fromLocalFallback: manifestFiles === null,
  }
}

interface Options {
  nextDayStartsAt: number
  newCardsPerDay: number
  studyCardLimit: number
}

const EMPTY_STEPS: TodayPackageSteps = { video: false, recall: false, cards: false }

export function useTodayPackage({ nextDayStartsAt, newCardsPerDay, studyCardLimit }: Options): TodayPackageData {
  const [data, setData] = useState<Omit<TodayPackageData, 'reload'>>({
    loading: true,
    available: false,
    offlineNoData: false,
    video: null,
    videoNumber: 0,
    videoTotal: 0,
    steps: EMPTY_STEPS,
    objectiveDeck: null,
    remainingCards: 0,
    activeCardIds: [],
    completedToday: false,
    remainingVideos: 0,
  })
  const catalogRef = useRef<VideoCatalogResult | null>(null)
  const computeVersionRef = useRef(0)
  // Tagesgrenze auch offline erkennen: neuer Wert → compute wird neu erzeugt
  // und der Effekt unten rechnet das Paket für den neuen Lerntag.
  const todayStartMs = useDayStartMs(nextDayStartsAt)

  const compute = useCallback(async () => {
    const version = computeVersionRef.current + 1
    computeVersionRef.current = version

    try {
      // Leeren Katalog nicht einfrieren: nach Fehlstart (offline ohne lokale
      // Daten) versucht jeder weitere Anlass (sichtbar werden, Review) den
      // Server erneut, damit die Kachel nach Reconnect von selbst erscheint.
      if (catalogRef.current === null || catalogRef.current.catalog.length === 0) {
        catalogRef.current = await loadVideoCatalog()
      }
      const { catalog, fromLocalFallback } = catalogRef.current
      if (computeVersionRef.current !== version) return

      if (catalog.length === 0) {
        setData(prev => ({
          ...prev,
          loading: false,
          available: false,
          offlineNoData: fromLocalFallback,
        }))
        return
      }

      const progress = readVideoProgress()
      const recallScores = readRecallScores()

      const computeSteps = async (
        video: LocalVideoMeta,
        activeStartedAt: number,
        storedCardIds: string[] | null,
      ): Promise<{
        steps: TodayPackageSteps
        objectiveDeck: Deck | null
        remainingCards: number
        activeCardIds: string[]
      }> => {
        const progressEntry = progress[video.objective]
        const videoDone = progressEntry?.watched === true && progressEntry.updatedAt >= activeStartedAt
        const recallDone = hasRecallRunSince(recallScores[videoScoreKey(video.index)], activeStartedAt)

        const deckId = getSecurityObjectiveDeckId(video.objective)
        const [deckCards, reviewedIds] = await Promise.all([
          listDeckCards(deckId),
          listDeckCardIdsReviewedSince(deckId, activeStartedAt),
        ])
        let activeCardIds = storedCardIds
        if (activeCardIds === null) {
          const introducedToday = newCardsPerDay > 0
            ? await countNewCardsIntroducedToday(nextDayStartsAt)
            : 0
          const maxNewCards = resolveNewCardAllowance(newCardsPerDay, introducedToday)
          activeCardIds = sortStudyCards(deckCards, {
            maxCards: studyCardLimit,
            maxNewCards,
            nextDayStartsAt,
          }).map(card => card.id)
        }
        const deckCardIds = new Set(deckCards.map(card => card.id))
        activeCardIds = activeCardIds.filter(cardId => deckCardIds.has(cardId))
        const reviewedSet = new Set(reviewedIds)
        const remaining = activeCardIds.filter(cardId => !reviewedSet.has(cardId))

        const objectiveDeck: Deck | null = deckCards.length > 0
          ? {
              id: deckId,
              name: getSecurityObjectiveDeckName(video.objective),
              total: deckCards.length,
              new: deckCards.filter(c => c.type === 'new').length,
              learning: deckCards.filter(c => c.type === 'learning' || c.type === 'relearning').length,
              due: deckCards.filter(c => c.type === 'review').length,
            }
          : null

        return {
          steps: {
            video: videoDone || recallDone,
            recall: recallDone,
            // Ohne planbare Karten gilt der Schritt als erledigt (z. B. Dosis
            // aufgebraucht oder Objective ohne Karten) — Abruf passiert dann im Check.
            cards: activeCardIds.length === 0 || remaining.length === 0,
          },
          objectiveDeck,
          remainingCards: remaining.length,
          activeCardIds,
        }
      }

      // Jedes Paket hat eine eigene Zeitgrenze. Nach dem Abschluss wird das
      // naechste sofort aktiv; alte Reviews koennen es nicht automatisch abhaken.
      let pointer = readTodayPackagePointer()
      let video = pickTodayVideo(catalog, pointer.lastCompletedIndex)
      let activeStartedAt = pointer.activeIndex === video?.index && pointer.activeStartedAt > 0
        ? Math.max(pointer.activeStartedAt, todayStartMs)
        : Math.max(pointer.lastCompletedAt, todayStartMs)
      if (video && (pointer.activeIndex !== video.index || pointer.activeStartedAt !== activeStartedAt)) {
        pointer = { ...pointer, activeIndex: video.index, activeStartedAt, activeCardIds: null }
        persistTodayPackagePointer(pointer)
      }
      let details = video ? await computeSteps(video, activeStartedAt, pointer.activeCardIds) : null
      if (video && details && pointer.activeCardIds === null) {
        pointer = { ...pointer, activeCardIds: details.activeCardIds }
        persistTodayPackagePointer(pointer)
      }
      while (video && details && details.steps.video && details.steps.recall && details.steps.cards) {
        const completedAt = Date.now()
        pointer = {
          lastCompletedIndex: video.index,
          lastCompletedAt: completedAt,
          activeIndex: 0,
          activeStartedAt: completedAt,
          activeCardIds: null,
        }
        persistTodayPackagePointer(pointer)
        video = pickTodayVideo(catalog, pointer.lastCompletedIndex)
        if (!video) {
          details = null
          break
        }
        activeStartedAt = completedAt
        pointer = { ...pointer, activeIndex: video.index }
        persistTodayPackagePointer(pointer)
        details = await computeSteps(video, activeStartedAt, null)
        pointer = { ...pointer, activeCardIds: details.activeCardIds }
        persistTodayPackagePointer(pointer)
      }
      if (computeVersionRef.current !== version) return

      setData({
        loading: false,
        available: true,
        offlineNoData: false,
        video,
        videoNumber: video ? catalog.findIndex(entry => entry.index === video?.index) + 1 : 0,
        videoTotal: catalog.length,
        steps: details?.steps ?? EMPTY_STEPS,
        objectiveDeck: details?.objectiveDeck ?? null,
        remainingCards: details?.remainingCards ?? 0,
        activeCardIds: details?.activeCardIds ?? [],
        completedToday: pointer.lastCompletedAt >= todayStartMs,
        remainingVideos: catalog.filter(entry => entry.index > pointer.lastCompletedIndex).length,
      })
    } catch (error) {
      console.error('[useTodayPackage]', error)
      if (computeVersionRef.current !== version) return
      // Ein einzelner DB-/Netzfehler darf die Kachel nie wieder dauerhaft im
      // Ladezustand lassen. Der Home-Slide faellt dann auf die Daily Quest zurueck.
      setData(prev => ({ ...prev, loading: false, available: false }))
    }
  }, [nextDayStartsAt, newCardsPerDay, studyCardLimit, todayStartMs])

  useEffect(() => {
    void compute()

    const onReviewUpdated = () => void compute()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void compute()
    }
    window.addEventListener(REVIEW_UPDATED_EVENT, onReviewUpdated)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener(REVIEW_UPDATED_EVENT, onReviewUpdated)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [compute])

  const reload = useCallback(() => {
    catalogRef.current = null
    void compute()
  }, [compute])

  return { ...data, reload }
}
