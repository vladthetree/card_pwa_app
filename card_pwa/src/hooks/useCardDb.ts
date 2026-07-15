/**
 * AI_CONTEXT:
 * Role: React data hooks for decks, cards, stats, shuffle collections, and gamification backed by Dexie liveQuery plus explicit refresh events.
 * Used by: HomeView, StudyView, ShuffleStudyView, metrics panels, and dashboard sections.
 * Important: Use debounced DB-change subscriptions to avoid noisy rerenders; mutations still belong in db/queries modules.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { liveQuery } from 'dexie'
import { db } from '../db'
import {
  listDecks,
  listDeckCards,
  getGamificationProfile,
  getGlobalStats,
  countTodayDueFromDecks,
  getShuffleCollection,
  listShuffleCollections,
} from '../db/queries'
import { REVIEW_UPDATED_EVENT } from '../constants/appIdentity'
import type { Deck, Card, GamificationProfile, GlobalStats, ShuffleCollection } from '../types'
import { buildSelectedShuffleCards, type ShuffleStudyCard } from '../services/shuffleSession'
import { useDayStartMs } from './useDayStartMs'

const DB_CHANGE_DEBOUNCE_MS = 180

function makeVisibilityDebounce(
  getCancelled: () => boolean,
  callbackRef: { current: () => void },
): { schedule: () => void; clear: () => void } {
  let timer: number | null = null
  return {
    schedule() {
      if (document.visibilityState === 'hidden') return
      if (timer !== null) window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        timer = null
        if (getCancelled() || document.visibilityState === 'hidden') return
        callbackRef.current()
      }, DB_CHANGE_DEBOUNCE_MS)
    },
    clear() {
      if (timer !== null) window.clearTimeout(timer)
      timer = null
    },
  }
}

export async function getGlobalDbRevision(): Promise<number> {
  const [deckCount, cardCount, reviewCount, shuffleCollectionCount] = await Promise.all([
    db.decks.count(),
    db.cards.count(),
    db.reviews.count(),
    db.shuffleCollections.count(),
  ])
  return deckCount + cardCount + reviewCount + shuffleCollectionCount
}

// Eine geteilte Revision-Subscription für alle globalen Hooks (useDecks,
// useStats, useGamificationProfile, useShuffleCollections): statt dass jeder
// Hook eine eigene liveQuery hält, die bei jedem Write vier Tabellen zählt,
// läuft die Zählung einmal und fächert an alle Listener auf.
const globalRevisionListeners = new Set<() => void>()
let globalRevisionSubscription: { unsubscribe: () => void } | null = null
let globalRevisionHasSeenInitial = false

function subscribeToGlobalDbRevision(listener: () => void): () => void {
  globalRevisionListeners.add(listener)

  if (!globalRevisionSubscription) {
    globalRevisionHasSeenInitial = false
    globalRevisionSubscription = liveQuery(getGlobalDbRevision).subscribe({
      next: () => {
        if (!globalRevisionHasSeenInitial) {
          globalRevisionHasSeenInitial = true
          return
        }
        for (const notify of Array.from(globalRevisionListeners)) {
          notify()
        }
      },
      error: () => {},
    })
  }

  return () => {
    globalRevisionListeners.delete(listener)
    if (globalRevisionListeners.size === 0 && globalRevisionSubscription) {
      globalRevisionSubscription.unsubscribe()
      globalRevisionSubscription = null
    }
  }
}

function useOnDbChange(callback: () => void, deckId?: string | null) {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    let cancelled = false
    const debounce = makeVisibilityDebounce(() => cancelled, callbackRef)
    const onReviewUpdated = () => debounce.schedule()

    // When a deckId is provided, scope the observable to that deck's cards only.
    // This prevents a card edit in deck A from triggering a reload in deck B's view.
    // For global hooks (no deckId) we watch all tables that affect home UI
    // visibility, including shuffle collections — via the shared subscription.
    let unsubscribe: () => void
    if (deckId) {
      let hasSeenInitial = false
      const subscription = liveQuery(() => db.cards.where('deckId').equals(deckId).count()).subscribe({
        next: () => {
          if (cancelled) return
          if (!hasSeenInitial) {
            hasSeenInitial = true
            return
          }
          debounce.schedule()
        },
        error: () => {},
      })
      unsubscribe = () => subscription.unsubscribe()
    } else {
      unsubscribe = subscribeToGlobalDbRevision(() => {
        if (cancelled) return
        debounce.schedule()
      })
    }

    window.addEventListener(REVIEW_UPDATED_EVENT, onReviewUpdated)

    return () => {
      cancelled = true
      debounce.clear()
      unsubscribe()
      window.removeEventListener(REVIEW_UPDATED_EVENT, onReviewUpdated)
    }
  }, [deckId])
}

function useOnShuffleDbChange(callback: () => void, collectionId: string | null) {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!collectionId) return

    let cancelled = false
    let hasSeenInitial = false
    const debounce = makeVisibilityDebounce(() => cancelled, callbackRef)
    const onReviewUpdated = () => debounce.schedule()

    const observable = liveQuery(async () => {
      const collection = await db.shuffleCollections.get(collectionId)
      if (!collection || collection.isDeleted) return `missing:${collectionId}`

      const deckIds = Array.from(new Set(collection.deckIds.filter(Boolean)))
      if (deckIds.length === 0) {
        return `empty:${collection.updatedAt ?? 0}`
      }

      const [cardCount, deckCount, reviewCount] = await Promise.all([
        db.cards.where('deckId').anyOf(deckIds).count(),
        db.decks.where('id').anyOf(deckIds).count(),
        db.reviews.count(),
      ])

      return `${collection.updatedAt ?? 0}:${deckIds.join('|')}:${deckCount}:${cardCount}:${reviewCount}`
    })

    const subscription = observable.subscribe({
      next: () => {
        if (cancelled) return
        if (!hasSeenInitial) {
          hasSeenInitial = true
          return
        }
        debounce.schedule()
      },
      error: () => {},
    })

    window.addEventListener(REVIEW_UPDATED_EVENT, onReviewUpdated)

    return () => {
      cancelled = true
      debounce.clear()
      subscription.unsubscribe()
      window.removeEventListener(REVIEW_UPDATED_EVENT, onReviewUpdated)
    }
  }, [collectionId])
}

export function useDecks() {
  const [decks, setDecks] = useState<Deck[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasLoadedRef = useRef(false)
  const loadVersionRef = useRef(0)

  const load = useCallback(async () => {
    const loadVersion = loadVersionRef.current + 1
    loadVersionRef.current = loadVersion
    const showInitialLoading = !hasLoadedRef.current

    try {
      if (showInitialLoading) {
        setLoading(true)
      }
      setError(null)
      const nextDecks = await listDecks()
      if (loadVersionRef.current !== loadVersion) return
      setDecks(nextDecks)
      hasLoadedRef.current = true
    } catch (e) {
      if (loadVersionRef.current !== loadVersion) return
      setError(e instanceof Error ? e.message : String(e))
      if (!hasLoadedRef.current) {
        setDecks([])
      }
    } finally {
      if (loadVersionRef.current === loadVersion) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])
  useOnDbChange(load)

  return { decks, loading, error, reload: load }
}

export function useShuffleCollections() {
  const [collections, setCollections] = useState<ShuffleCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasLoadedRef = useRef(false)
  const loadVersionRef = useRef(0)

  const load = useCallback(async () => {
    const loadVersion = loadVersionRef.current + 1
    loadVersionRef.current = loadVersion
    const showInitialLoading = !hasLoadedRef.current

    try {
      if (showInitialLoading) {
        setLoading(true)
      }
      setError(null)
      const nextCollections = await listShuffleCollections()
      if (loadVersionRef.current !== loadVersion) return
      setCollections(nextCollections)
      hasLoadedRef.current = true
    } catch (e) {
      if (loadVersionRef.current !== loadVersion) return
      setError(e instanceof Error ? e.message : String(e))
      if (!hasLoadedRef.current) {
        setCollections([])
      }
    } finally {
      if (loadVersionRef.current === loadVersion) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])
  useOnDbChange(load)

  return { collections, loading, error, reload: load }
}

export function useDeckCards(deckId: string | null) {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadedDeckIdRef = useRef<string | null>(null)
  const loadVersionRef = useRef(0)

  const load = useCallback(async () => {
    const loadVersion = loadVersionRef.current + 1
    loadVersionRef.current = loadVersion

    if (!deckId) {
      loadedDeckIdRef.current = null
      setCards([])
      setLoading(false)
      return
    }

    const showInitialLoading = loadedDeckIdRef.current !== deckId
    try {
      if (showInitialLoading) {
        setLoading(true)
      }
      setError(null)
      const nextCards = await listDeckCards(deckId)
      if (loadVersionRef.current !== loadVersion) return
      setCards(nextCards)
      loadedDeckIdRef.current = deckId
    } catch (e) {
      if (loadVersionRef.current !== loadVersion) return
      setError(e instanceof Error ? e.message : String(e))
      if (loadedDeckIdRef.current !== deckId) {
        setCards([])
      }
    } finally {
      if (loadVersionRef.current === loadVersion) {
        setLoading(false)
      }
    }
  }, [deckId])

  useEffect(() => {
    void load()
  }, [load])
  useOnDbChange(load, deckId)

  return { cards, loading, error, reload: load }
}

export function useShuffleCards(
  collectionId: string | null,
  options: {
    userId?: string
    maxCards?: number
    nextDayStartsAt?: number
    runSeed?: string | number
    learnAheadMinutes?: number
  } = {},
) {
  const [cards, setCards] = useState<ShuffleStudyCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadedCollectionIdRef = useRef<string | null>(null)
  const loadVersionRef = useRef(0)

  const load = useCallback(async () => {
    const loadVersion = loadVersionRef.current + 1
    loadVersionRef.current = loadVersion

    if (!collectionId) {
      loadedCollectionIdRef.current = null
      setCards([])
      setLoading(false)
      return
    }

    const showInitialLoading = loadedCollectionIdRef.current !== collectionId
    try {
      if (showInitialLoading) {
        setLoading(true)
      }
      setError(null)

      const collection = await getShuffleCollection(collectionId)
      if (loadVersionRef.current !== loadVersion) return
      if (!collection) {
        loadedCollectionIdRef.current = null
        setCards([])
        setLoading(false)
        return
      }

      const selectedCards = await buildSelectedShuffleCards(collection, {
        userId: options.userId,
        maxCards: options.maxCards,
        nextDayStartsAt: options.nextDayStartsAt,
        runSeed: options.runSeed,
        learnAheadMinutes: options.learnAheadMinutes,
      })
      if (loadVersionRef.current !== loadVersion) return
      setCards(selectedCards)
      loadedCollectionIdRef.current = collectionId
    } catch (e) {
      if (loadVersionRef.current !== loadVersion) return
      setError(e instanceof Error ? e.message : String(e))
      if (loadedCollectionIdRef.current !== collectionId) {
        setCards([])
      }
    } finally {
      if (loadVersionRef.current === loadVersion) {
        setLoading(false)
      }
    }
  }, [collectionId, options.learnAheadMinutes, options.maxCards, options.nextDayStartsAt, options.runSeed, options.userId])

  useEffect(() => {
    void load()
  }, [load])

  useOnShuffleDbChange(load, collectionId)

  return { cards, loading, error, reload: load }
}

export function useStats(nextDayStartsAt = 0, dailyCardLimit?: number) {
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Neuer Lerntag (auch offline) → Zähler wie "heute fällig" neu ableiten,
  // ohne auf eine DB-Änderung oder einen Sync warten zu müssen.
  const dayStartMs = useDayStartMs(nextDayStartsAt)

  const load = useCallback(async () => {
    try {
      const baseStats = await getGlobalStats(nextDayStartsAt)
      const nowDue = dailyCardLimit === undefined
        ? baseStats.nowDue
        : await countTodayDueFromDecks(dailyCardLimit, nextDayStartsAt)

      setStats({
        ...baseStats,
        nowDue,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    // dayStartMs erzwingt die Neuberechnung an der Tagesgrenze.
  }, [dailyCardLimit, nextDayStartsAt, dayStartMs])

  useEffect(() => {
    void load()
  }, [load])
  useOnDbChange(load)

  return { stats, error }
}

export function useGamificationProfile(nextDayStartsAt = 0) {
  const [profile, setProfile] = useState<GamificationProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Quests/Streak hängen am Lerntag: an einer neuen Tagesgrenze (auch offline)
  // zurück auf "nicht erledigt" rechnen statt den Vortagsstand stehen zu lassen.
  const dayStartMs = useDayStartMs(nextDayStartsAt)

  const load = useCallback(async () => {
    try {
      setError(null)
      setProfile(await getGamificationProfile(nextDayStartsAt))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    // dayStartMs erzwingt die Neuberechnung an der Tagesgrenze.
  }, [nextDayStartsAt, dayStartMs])

  useEffect(() => {
    void load()
  }, [load])
  useOnDbChange(load)

  return { profile, error }
}
