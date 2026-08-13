/**
 * AI_CONTEXT:
 * Role: Builds the home tag index from all flashcards, including an untagged bucket, and refreshes after DB/review changes.
 * Used by: HomeView tag tab and tag-study launch path.
 * Important: Bucket keys use normalizeTagId, so UI may show canonical IDs rather than original display spelling.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { liveQuery } from 'dexie'
import { db } from '../../db'
import { listAllCards } from '../../db/queries'
import type { Card } from '../../types'
import { REVIEW_UPDATED_EVENT } from '../../constants/appIdentity'
import { normalizeTagId } from '../../utils/tagIdentity'

const DEBOUNCE_MS = 250

export interface TagCardIndex {
  tagIndex: Record<string, Card[]>
  allTags: string[]
  loading: boolean
}

export function useTagCardIndex(): TagCardIndex {
  const [tagIndex, setTagIndex] = useState<Record<string, Card[]>>({})
  const [allTags, setAllTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const loadVersionRef = useRef(0)
  const callbackRef = useRef<() => void>(() => {})

  const load = useCallback(async () => {
    const v = ++loadVersionRef.current
    try {
      const cards = await listAllCards()
      if (loadVersionRef.current !== v) return

      const buckets: Record<string, Card[]> = {}
      for (const card of cards) {
        const rawTags = card.tags.length > 0
          ? card.tags.map(normalizeTagId).filter(Boolean)
          : ['(untagged)']
        for (const tag of rawTags) {
          if (!buckets[tag]) buckets[tag] = []
          buckets[tag].push(card)
        }
      }

      const sorted = Object.keys(buckets).sort((a, b) => {
        if (a === '(untagged)') return 1
        if (b === '(untagged)') return -1
        return a.localeCompare(b)
      })

      setTagIndex(buckets)
      setAllTags(sorted)
    } finally {
      if (loadVersionRef.current === v) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    callbackRef.current = load
  }, [load])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let timer: number | null = null
    let cancelled = false
    let hasSeenInitial = false

    const schedule = () => {
      if (cancelled || document.visibilityState === 'hidden') return
      if (timer !== null) window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        timer = null
        if (!cancelled) callbackRef.current()
      }, DEBOUNCE_MS)
    }

    const observable = liveQuery(() =>
      Promise.all([db.cards.count(), db.reviews.count()])
    )

    const subscription = observable.subscribe({
      next: () => {
        if (cancelled) return
        if (!hasSeenInitial) { hasSeenInitial = true; return }
        schedule()
      },
      error: () => {},
    })

    const onReviewUpdated = () => schedule()
    window.addEventListener(REVIEW_UPDATED_EVENT, onReviewUpdated)

    return () => {
      cancelled = true
      if (timer !== null) window.clearTimeout(timer)
      subscription.unsubscribe()
      window.removeEventListener(REVIEW_UPDATED_EVENT, onReviewUpdated)
    }
  }, [])

  return { tagIndex, allTags, loading }
}
