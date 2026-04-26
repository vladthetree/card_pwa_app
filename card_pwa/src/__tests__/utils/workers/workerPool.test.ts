import { afterEach, describe, expect, it, vi } from 'vitest'
import { createWorker } from '../../../utils/workers/workerPool'

type RequestMessage<TIn> = {
  id?: string
  requestId?: string
  payload: TIn
  port?: MessagePort
}

describe('workerPool', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('multiplexes parallel requests and resolves out-of-order responses', async () => {
    class WorkerMock {
      onmessage: ((event: MessageEvent<{ id: string; ok: boolean; result: number }>) => void) | null = null
      onerror: ((event: Event) => void) | null = null
      onmessageerror: ((event: MessageEvent) => void) | null = null

      terminate(): void {}

      postMessage(message: RequestMessage<number>): void {
        const id = message.id ?? message.requestId
        if (!id) throw new Error('missing id')

        const result = message.payload * 2
        const responder = () => {
          if (message.port) {
            message.port.postMessage({ id, ok: true, result })
            return
          }
          this.onmessage?.({ data: { id, ok: true, result } } as MessageEvent<{ id: string; ok: boolean; result: number }>)
        }

        if (message.payload === 2) {
          setTimeout(responder, 10)
          return
        }

        setTimeout(responder, 0)
      }
    }

    vi.stubGlobal('Worker', WorkerMock as unknown as typeof Worker)

    const pool = createWorker<number, number>(
      () => new WorkerMock() as unknown as Worker,
      (payload) => payload + 1000,
    )

    const [fast, slow] = await Promise.all([
      pool.run(1),
      pool.run(2),
    ])

    expect(fast).toBe(2)
    expect(slow).toBe(4)
  })

  it('falls back when worker constructor fails', async () => {
    vi.stubGlobal('Worker', class {} as unknown as typeof Worker)

    const fallback = vi.fn((payload: string) => `fallback:${payload}`)
    const pool = createWorker<string, string>(
      () => {
        throw new Error('boom')
      },
      fallback,
    )

    await expect(pool.run('a')).resolves.toBe('fallback:a')
    expect(fallback).toHaveBeenCalledTimes(1)
  })

  it('falls back for pending requests when worker errors', async () => {
    class WorkerMock {
      onmessage: ((event: MessageEvent<{ id: string; ok: boolean; result: string }>) => void) | null = null
      onerror: ((event: Event) => void) | null = null
      onmessageerror: ((event: MessageEvent) => void) | null = null

      terminate(): void {}

      postMessage(): void {
        setTimeout(() => {
          this.onerror?.(new Event('error'))
        }, 0)
      }
    }

    vi.stubGlobal('Worker', WorkerMock as unknown as typeof Worker)

    const fallback = vi.fn((payload: string) => `fallback:${payload}`)
    const pool = createWorker<string, string>(
      () => new WorkerMock() as unknown as Worker,
      fallback,
    )

    await expect(pool.run('x')).resolves.toBe('fallback:x')
    expect(fallback).toHaveBeenCalledWith('x')
  })
})
