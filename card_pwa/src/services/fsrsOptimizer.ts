/** Browser-side FSRS parameter optimization from this profile's local revlog. */
import { db, type ReviewRecord } from '../db'
import { DAY_MS } from '../utils/time'

export const MIN_OPTIMIZER_REVIEWS = 20

export interface FsrsTrainingReview {
  rating: 1 | 2 | 3 | 4
  deltaT: number
}

export interface FsrsOptimizationResult {
  parameters: number[]
  reviewCount: number
  cardCount: number
  trainingItemCount: number
}

/** Build one training item per outcome, including its complete prior history. */
export function buildFsrsTrainingHistories(reviews: ReviewRecord[]): FsrsTrainingReview[][] {
  const byCard = new Map<string, ReviewRecord[]>()
  for (const review of reviews) {
    if (![1, 2, 3, 4].includes(review.rating) || !Number.isFinite(review.timestamp)) continue
    const history = byCard.get(review.cardId) ?? []
    history.push(review)
    byCard.set(review.cardId, history)
  }

  const trainingItems: FsrsTrainingReview[][] = []
  for (const cardReviews of byCard.values()) {
    cardReviews.sort((a, b) => a.timestamp - b.timestamp)
    const history: FsrsTrainingReview[] = []
    let previousTimestamp = cardReviews[0]?.timestamp ?? 0
    for (let index = 0; index < cardReviews.length; index += 1) {
      const review = cardReviews[index]
      const deltaT = index === 0
        ? 0
        : Math.max(0, Math.round((review.timestamp - previousTimestamp) / DAY_MS))
      history.push({ rating: review.rating, deltaT })
      previousTimestamp = review.timestamp
      // The first answer initializes memory; later outcomes are trainable.
      if (history.length >= 2) trainingItems.push(history.map(item => ({ ...item })))
    }
  }
  return trainingItems
}

export async function optimizeFsrsParameters(): Promise<FsrsOptimizationResult> {
  const reviews = await db.reviews.toArray()
  if (reviews.length < MIN_OPTIMIZER_REVIEWS) {
    throw new Error(`Für eine stabile Optimierung werden mindestens ${MIN_OPTIMIZER_REVIEWS} Bewertungen benötigt (vorhanden: ${reviews.length}).`)
  }

  const histories = buildFsrsTrainingHistories(reviews)
  if (histories.length === 0) {
    throw new Error('Es gibt noch keine Karten mit mindestens zwei Bewertungen.')
  }

  const [{ initOptimizer }, { default: wasmUrl }, { default: WasiWorker }] = await Promise.all([
    import('@open-spaced-repetition/binding/dynamic-wasi'),
    import('@open-spaced-repetition/binding-wasm32-wasi/fsrs-binding.wasm32-wasi.wasm?url'),
    import('@open-spaced-repetition/binding-wasm32-wasi/wasi-worker-browser.mjs?worker'),
  ])
  const binding = await initOptimizer({
    wasm: wasmUrl,
    worker: () => new WasiWorker(),
  })
  const items = histories.map(history => new binding.FSRSBindingItem(
    history.map(review => new binding.FSRSBindingReview(review.rating, review.deltaT)),
  ))
  const parameters = await binding.computeParameters(items, {
    enableShortTerm: true,
    numRelearningSteps: 1,
    timeout: 60_000,
  })
  if (parameters.length !== 21 || parameters.some(value => !Number.isFinite(value))) {
    throw new Error('Der Optimierer hat keine gültigen FSRS-Parameter geliefert.')
  }

  return {
    parameters,
    reviewCount: reviews.length,
    cardCount: new Set(reviews.map(review => review.cardId)).size,
    trainingItemCount: histories.length,
  }
}
