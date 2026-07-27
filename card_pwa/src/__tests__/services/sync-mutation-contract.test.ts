/**
 * AI_CONTEXT: Verifies the canonical sync mutation contract against operation
 * types, pull support, and service-worker queue constants.
 */
import { existsSync, readFileSync } from 'node:fs'
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

function readSyncPullApplySource(): string {
  const here = dirname(fileURLToPath(import.meta.url))
  return readFileSync(resolve(here, '../../services/syncPull/apply.ts'), 'utf8')
}

function projectRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url))
  return resolve(here, '../../..')
}

describe('sync mutation contract', () => {
  it('documents every SyncOperationType exactly once', () => {
    expect([...SYNC_OPERATION_TYPES].sort()).toEqual([...expectedOperationTypes].sort())
  })

  it('documents local producer, outbox behavior, server operation, pull effect, tests, idempotency, and scope for each operation', () => {
    for (const type of SYNC_OPERATION_TYPES) {
      const entry = SYNC_MUTATION_CONTRACT[type]
      expect(entry.localMutation).toBeTruthy()
      expect(typeof entry.requiresTransactionalOutbox).toBe('boolean')
      expect(entry.queueProducer.length).toBeGreaterThan(0)
      expect(entry.serverOperation).toBe('POST /sync')
      expect(entry.pullEffect).toBeTruthy()
      expect(entry.idempotency).toBeTruthy()
      expect(entry.scopeRule).toBeTruthy()
      expect(entry.tests.length).toBeGreaterThan(0)
      expect(entry.tests.some(test => test.endsWith('sync-mutation-contract.test.ts'))).toBe(true)
      for (const testPath of entry.tests) {
        expect(existsSync(resolve(projectRoot(), testPath)), `${type} references missing test ${testPath}`).toBe(true)
      }
    }
  })

  it('documents review as the transactional-outbox mutation', () => {
    expect(SYNC_MUTATION_CONTRACT.review).toMatchObject({
      queueSource: 'transactional-outbox',
      requiresTransactionalOutbox: true,
    })

    for (const type of SYNC_OPERATION_TYPES.filter(type => type !== 'review')) {
      expect(SYNC_MUTATION_CONTRACT[type].requiresTransactionalOutbox).toBe(false)
    }
  })

  it('keeps createDeck local and documents deck.create as a derived dependency', () => {
    expect(SYNC_MUTATION_CONTRACT['deck.create']).toMatchObject({
      queueSource: 'derived-dependency',
      scopeRule: 'selected-deck',
    })
    expect(SYNC_MUTATION_CONTRACT['deck.create'].notes).toContain('createDeck() intentionally')
  })

  it('keeps every contracted operation represented in applyOperation', () => {
    const applySource = readSyncPullApplySource()

    for (const type of SYNC_OPERATION_TYPES) {
      expect(applySource, `applyOperation is missing case '${type}'`).toContain(`case '${type}':`)
    }
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

  it('keeps service-worker autonomous sync using the same push envelope as the app queue', () => {
    const serviceWorker = readServiceWorkerSource()

    for (const field of ['opId', 'type', 'payload', 'clientTimestamp', 'source', 'clientId']) {
      expect(serviceWorker).toContain(field)
    }
    expect(serviceWorker).toContain("method: 'POST'")
    expect(serviceWorker).toContain("'X-Idempotency-Key'")
  })
})
