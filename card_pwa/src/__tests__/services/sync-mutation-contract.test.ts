/**
 * AI_CONTEXT: Verifies the canonical sync mutation contract against operation
 * types, pull support, and service-worker queue constants.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DATABASE_NAMES } from '../../constants/appIdentity'
import { SYNC_MUTATION_CONTRACT, SYNC_OPERATION_TYPES } from '../../services/syncMutationContract'

const expectedOperationTypes = [
  'review',
  'review.undo',
  'card.create',
  'card.update',
  'card.delete',
  'card.schedule.forceTomorrow',
  'deck.create',
  'deck.delete',
  'shuffleCollection.upsert',
  'shuffleCollection.delete',
  'videoNote.upsert',
  'videoNote.delete',
  'progress.reset',
  'examDate.upsert',
]

function readServiceWorkerSource(): string {
  const here = dirname(fileURLToPath(import.meta.url))
  return readFileSync(resolve(here, '../../../public/service-worker.js'), 'utf8')
}

describe('sync mutation contract', () => {
  it('documents every SyncOperationType exactly once', () => {
    expect([...SYNC_OPERATION_TYPES].sort()).toEqual([...expectedOperationTypes].sort())
  })

  it('documents local producer, pull effect, idempotency, and scope for each operation', () => {
    for (const type of SYNC_OPERATION_TYPES) {
      const entry = SYNC_MUTATION_CONTRACT[type]
      expect(entry.localMutation).toBeTruthy()
      expect(entry.queueProducer.length).toBeGreaterThan(0)
      expect(entry.pullEffect).toBeTruthy()
      expect(entry.idempotency).toBeTruthy()
      expect(entry.scopeRule).toBeTruthy()
    }
  })

  it('keeps createDeck local and documents deck.create as a derived dependency', () => {
    expect(SYNC_MUTATION_CONTRACT['deck.create']).toMatchObject({
      queueSource: 'derived-dependency',
      scopeRule: 'selected-deck',
    })
    expect(SYNC_MUTATION_CONTRACT['deck.create'].notes).toContain('createDeck() intentionally')
  })

  it('keeps service-worker queue storage constants aligned with the app', () => {
    const serviceWorker = readServiceWorkerSource()

    expect(serviceWorker).toContain(`const SYNC_QUEUE_DB_NAME = '${DATABASE_NAMES.syncQueue}'`)
    expect(serviceWorker).toContain("const SYNC_QUEUE_STORE = 'queue'")
  })

  it('keeps service-worker background sync delegated to visible app clients when possible', () => {
    const serviceWorker = readServiceWorkerSource()

    expect(serviceWorker).toContain('client.postMessage({ type: \'SYNC_NOW\' })')
    expect(serviceWorker).toContain('await flushQueueInServiceWorker()')
  })
})
