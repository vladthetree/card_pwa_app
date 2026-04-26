import type { CardRecord, ReviewRecord } from '../../db'
import { buildHeatmap, calculateStreak, forecastDue } from '../stats/aggregate'

type StatsRequest =
  | {
      type: 'heatmap'
      profileId?: string
      reviews: ReviewRecord[]
      year: number
    }
  | {
      type: 'streak'
      profileId?: string
      reviews: ReviewRecord[]
      nowMs?: number
    }
  | {
      type: 'forecast'
      profileId?: string
      cards: CardRecord[]
      days: number
      nowMs?: number
    }
  | {
      type: 'invalidate'
      profileId?: string
    }

interface WorkerRequest {
  id?: string
  requestId?: string
  payload: StatsRequest
  port?: MessagePort
}

type StatsResult = unknown

interface ProfileCacheEntry {
  lastReviewTs: number
  lastCardTs: number
  results: {
    heatmap?: StatsResult
    streak?: StatsResult
    forecast?: StatsResult
  }
  signatures: {
    heatmap?: string
    streak?: string
    forecast?: string
  }
}

const cache = new Map<string, ProfileCacheEntry>()
const ctx = self as any

function messageTarget(port?: MessagePort) {
  return port ?? ctx
}

function getProfileId(payload: StatsRequest): string {
  return payload.profileId ?? 'default'
}

function getSignature(payload: StatsRequest): string {
  if (payload.type === 'invalidate') return 'invalidate'
  if (payload.type === 'heatmap') {
    const last = payload.reviews[payload.reviews.length - 1]
    return `${payload.year}:${payload.reviews.length}:${last?.timestamp ?? 0}`
  }
  if (payload.type === 'streak') {
    const last = payload.reviews[payload.reviews.length - 1]
    return `${payload.nowMs ?? 0}:${payload.reviews.length}:${last?.timestamp ?? 0}`
  }
  const last = payload.cards[payload.cards.length - 1]
  return `${payload.days}:${payload.nowMs ?? 0}:${payload.cards.length}:${last?.updatedAt ?? last?.createdAt ?? 0}`
}

function compute(payload: StatsRequest): StatsResult {
  if (payload.type === 'heatmap') {
    return buildHeatmap(payload.reviews, payload.year)
  }
  if (payload.type === 'streak') {
    return calculateStreak(payload.reviews, payload.nowMs)
  }
  if (payload.type === 'forecast') {
    return forecastDue(payload.cards, payload.days, payload.nowMs)
  }
  return { ok: true }
}

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, requestId, payload, port } = event.data
  const requestKey = id ?? requestId
  const target = messageTarget(port)

  try {
    if (payload.type === 'invalidate') {
      cache.delete(getProfileId(payload))
      target.postMessage({ id: requestKey, requestId: requestKey, ok: true, result: { ok: true } })
      return
    }

    const profileId = getProfileId(payload)
    const signature = getSignature(payload)
    const entry = cache.get(profileId) ?? {
      lastReviewTs: 0,
      lastCardTs: 0,
      results: {},
      signatures: {},
    }

    const typeKey = payload.type
    const hitSignature = entry.signatures[typeKey]
    const hitValue = entry.results[typeKey]
    if (hitSignature === signature && hitValue !== undefined) {
      target.postMessage({ id: requestKey, requestId: requestKey, ok: true, result: hitValue })
      return
    }

    const result = compute(payload)
    entry.signatures[typeKey] = signature
    entry.results[typeKey] = result
    if (payload.type === 'heatmap' || payload.type === 'streak') {
      const last = payload.reviews[payload.reviews.length - 1]
      entry.lastReviewTs = Number(last?.timestamp ?? entry.lastReviewTs ?? 0)
    }
    if (payload.type === 'forecast') {
      const last = payload.cards[payload.cards.length - 1]
      entry.lastCardTs = Number(last?.updatedAt ?? last?.createdAt ?? entry.lastCardTs ?? 0)
    }
    cache.set(profileId, entry)
    target.postMessage({ id: requestKey, requestId: requestKey, ok: true, result })
  } catch (error) {
    target.postMessage({
      id: requestKey,
      requestId: requestKey,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
