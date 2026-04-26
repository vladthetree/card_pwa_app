import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseApkg } from '../../utils/import/apkgImporter'

type WorkerRequest = {
  id?: string
  requestId?: string
  payload?: {
    fileBuffer: ArrayBuffer
    fileName: string
    language: 'de' | 'en'
    algorithm: 'sm2' | 'fsrs'
  }
  port?: MessagePort
}

describe('apkgImporter worker orchestration', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the APKG worker and transfers file buffer', async () => {
    const workerResult = {
      decks: [{ id: 'deck-1', name: 'Deck', createdAt: 1, source: 'anki-import' as const }],
      cards: [],
      format: 'apkg' as const,
      sourceName: 'sample.apkg',
    }

    const workerCtor = vi.fn()
    const postMessageSpy = vi.fn()

    class WorkerMock {
      onmessage: ((event: MessageEvent<{ id: string; ok: boolean; result: typeof workerResult }>) => void) | null = null
      onerror: ((event: Event) => void) | null = null
      onmessageerror: ((event: MessageEvent) => void) | null = null

      constructor(url: URL, options: WorkerOptions) {
        workerCtor(url, options)
      }

      postMessage(message: WorkerRequest, transfer?: Transferable[]): void {
        postMessageSpy(message, transfer)
        const id = message.id ?? message.requestId ?? 'req-1'
        if (message.port) {
          message.port.postMessage({ id, requestId: id, ok: true, result: workerResult })
          return
        }
        this.onmessage?.({ data: { id, requestId: id, ok: true, result: workerResult } } as unknown as MessageEvent<{ id: string; ok: boolean; result: typeof workerResult }>)
      }

      terminate(): void {}
    }

    vi.stubGlobal('Worker', WorkerMock as unknown as typeof Worker)

    const file = new File([new Uint8Array([1, 2, 3, 4])], 'sample.apkg', { type: 'application/octet-stream' })
    const parsed = await parseApkg(file, 'de', 'sm2')

    expect(workerCtor).toHaveBeenCalledTimes(1)
    expect(postMessageSpy).toHaveBeenCalledTimes(1)

    const posted = postMessageSpy.mock.calls[0]?.[0] as WorkerRequest
    expect(posted.payload?.fileName).toBe('sample.apkg')
    expect(posted.payload?.language).toBe('de')
    expect(posted.payload?.algorithm).toBe('sm2')

    const transfers = postMessageSpy.mock.calls[0]?.[1] as Transferable[]
    expect(Array.isArray(transfers)).toBe(true)
    expect(transfers.length).toBeGreaterThanOrEqual(2)

    expect(parsed).toEqual(workerResult)
  })
})
