import { useState, useEffect, useCallback, useRef } from 'react'
import { liveQuery } from 'dexie'
import { db } from '../db'
import {
  fetchDecks,
  fetchDeckCards,
  fetchGamificationProfile,
  fetchGlobalStats,
  fetchTodayDueFromDecks,
  getShuffleCollection,
  listShuffleCollections,
} from '../db/queries'
import { REVIEW_UPDATED_EVENT } from '../constants/appIdentity'
import type { Deck, Card, GamificationProfile, GlobalStats, ShuffleCollection } from '../types'
import { buildSelectedShuffleCards, type ShuffleStudyCard } from '../services/ShuffleSessionManager'

export async function getGlobalDbRevision(): Promise<number> {
  const [deckCount, cardCount, reviewCount, shuffleCollectionCount] = await Promise.all([
    db.decks.count(),
    db.cards.count(),
    db.reviews.count(),
    db.shuffleCollections.count(),
  ])
  return deckCount + cardCount + reviewCount + shuffleCollectionCount
}

function useOnDbChange(callback: () => void, deckId?: string | null) {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    let cancelled = false
    let hasSeenInitial = false

    const onReviewUpdated = () => {
      if (document.visibilityState === 'hidden') return
      callbackRef.current()
    }

    // When a deckId is provided, scope the observable to that deck's cards only.
    // This prevents a card edit in deck A from triggering a reload in deck B's view.
    // For global hooks (no deckId) we watch all tables that affect home UI
    // visibility, including shuffle collections.
    const observable = deckId
      ? liveQuery(() => db.cards.where('deckId').equals(deckId).count())
      : liveQuery(getGlobalDbRevision)

    const subscription = observable.subscribe({
      next: () => {
        if (cancelled) return
        if (!hasSeenInitial) {
          hasSeenInitial = true
          return
        }
        if (document.visibilityState === 'hidden') return
        callbackRef.current()
      },
      error: () => {
        // best effort only
      },
    })

    window.addEventListener(REVIEW_UPDATED_EVENT, onReviewUpdated)

    return () => {
      cancelled = true
      subscription.unsubscribe()
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

    const onReviewUpdated = () => {
      if (document.visibilityState === 'hidden') return
      callbackRef.current()
    }

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
        if (document.visibilityState === 'hidden') return
        callbackRef.current()
      },
      error: () => {
        // best effort only
      },
    })

    window.addEventListener(REVIEW_UPDATED_EVENT, onReviewUpdated)

    return () => {
      cancelled = true
      subscription.unsubscribe()
      window.removeEventListener(REVIEW_UPDATED_EVENT, onReviewUpdated)
    }
  }, [collectionId])
}

export function useDecks() {
  const [decks, setDecks] = useState<Deck[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setDecks(await fetchDecks())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setDecks([])
    } finally {
      setLoading(false)
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

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setCollections(await listShuffleCollections())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setCollections([])
    } finally {
      setLoading(false)
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

  const load = useCallback(async () => {
    if (!deckId) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      setCards(await fetchDeckCards(deckId))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setCards([])
    } finally {
      setLoading(false)
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
  } = {},
) {
  const [cards, setCards] = useState<ShuffleStudyCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!collectionId) {
      setCards([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const collection = await getShuffleCollection(collectionId)
      if (!collection) {
        setCards([])
        setLoading(false)
        return
      }

      const selectedCards = await buildSelectedShuffleCards(collection, {
        userId: options.userId,
        maxCards: options.maxCards,
        nextDayStartsAt: options.nextDayStartsAt,
      })
      setCards(selectedCards)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setCards([])
    } finally {
      setLoading(false)
    }
  }, [collectionId, options.maxCards, options.nextDayStartsAt, options.userId])

  useEffect(() => {
    void load()
  }, [load])

  useOnShuffleDbChange(load, collectionId)

  return { cards, loading, error, reload: load }
}

export function useStats(nextDayStartsAt = 0, dailyCardLimit?: number) {
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const baseStats = await fetchGlobalStats(nextDayStartsAt)
      const nowDue = dailyCardLimit === undefined
        ? baseStats.nowDue
        : await fetchTodayDueFromDecks(dailyCardLimit, nextDayStartsAt)

      setStats({
        ...baseStats,
        nowDue,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [dailyCardLimit, nextDayStartsAt])

  useEffect(() => {
    void load()
  }, [load])
  useOnDbChange(load)

  return { stats, error }
}

export function useGamificationProfile(nextDayStartsAt = 0) {
  const [profile, setProfile] = useState<GamificationProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      setProfile(await fetchGamificationProfile(nextDayStartsAt))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [nextDayStartsAt])

  useEffect(() => {
    void load()
  }, [load])
  useOnDbChange(load)

  return { profile, error }
}
