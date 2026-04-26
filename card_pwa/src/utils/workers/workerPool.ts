type WorkerFactory = () => Worker

type WorkerResponse<TOut> = {
  id?: string
  requestId?: string
  ok: boolean
  result?: TOut
  error?: string
}

type PendingRequest<TIn, TOut> = {
  payload: TIn
  resolve: (value: TOut) => void
  reject: (reason?: unknown) => void
  port: MessagePort
  settled: boolean
}

export interface PooledWorker<TIn, TOut> {
  run(payload: TIn, transfer?: Transferable[]): Promise<TOut>
  terminate(): void
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

export function createWorker<TIn, TOut>(
  factory: WorkerFactory,
  fallback: (payload: TIn) => Promise<TOut> | TOut,
): PooledWorker<TIn, TOut> {
  let worker: Worker | null = null
  let requestCounter = 0
  const pending = new Map<string, PendingRequest<TIn, TOut>>()

  const settle = (id: string, response: WorkerResponse<TOut>) => {
    const entry = pending.get(id)
    if (!entry || entry.settled) return

    entry.settled = true
    entry.port.onmessage = null
    entry.port.close()
    pending.delete(id)

    if (response.ok) {
      entry.resolve(response.result as TOut)
      return
    }

    Promise.resolve(fallback(entry.payload)).then(entry.resolve).catch(entry.reject)
  }

  const fallbackAllPending = () => {
    const entries = Array.from(pending.entries())
    pending.clear()

    for (const [, entry] of entries) {
      if (entry.settled) continue
      entry.settled = true
      entry.port.onmessage = null
      entry.port.close()
      Promise.resolve(fallback(entry.payload)).then(entry.resolve).catch(entry.reject)
    }
  }

  const handleWorkerFailure = () => {
    fallbackAllPending()
    if (worker) {
      worker.onmessage = null
      worker.onerror = null
      worker.onmessageerror = null
      worker.terminate()
      worker = null
    }
  }

  const ensureWorker = (): Worker | null => {
    if (worker) return worker
    if (typeof Worker === 'undefined') return null

    try {
      worker = factory()
      worker.onmessage = (event: MessageEvent<WorkerResponse<TOut>>) => {
        const id = event.data.id ?? event.data.requestId
        if (!id) return
        settle(id, event.data)
      }
      worker.onerror = () => {
        handleWorkerFailure()
      }
      worker.onmessageerror = () => {
        handleWorkerFailure()
      }
      return worker
    } catch {
      worker = null
      return null
    }
  }

  const run = async (payload: TIn, transfer: Transferable[] = []): Promise<TOut> => {
    const readyWorker = ensureWorker()
    if (!readyWorker) {
      return fallback(payload)
    }

    const id = `req-${++requestCounter}`
    const channel = new MessageChannel()

    return new Promise<TOut>((resolve, reject) => {
      const entry: PendingRequest<TIn, TOut> = {
        payload,
        resolve,
        reject,
        port: channel.port1,
        settled: false,
      }

      pending.set(id, entry)

      channel.port1.onmessage = (event: MessageEvent<WorkerResponse<TOut>>) => {
        settle(id, event.data)
      }

      try {
        readyWorker.postMessage(
          { id, requestId: id, payload, port: channel.port2 },
          [...transfer, channel.port2],
        )
      } catch (error) {
        pending.delete(id)
        entry.settled = true
        channel.port1.onmessage = null
        channel.port1.close()
        channel.port2.close()

        Promise.resolve(fallback(payload)).then(resolve).catch((fallbackError) => {
          if (import.meta.env.DEV) {
            console.warn('[workerPool] worker postMessage failed, fallback used:', toErrorMessage(error))
          }
          reject(fallbackError)
        })
      }
    })
  }

  const terminate = () => {
    for (const [, entry] of pending.entries()) {
      if (!entry.settled) {
        entry.settled = true
        entry.port.onmessage = null
        entry.port.close()
        entry.reject(new Error('Worker terminated'))
      }
    }
    pending.clear()

    if (worker) {
      worker.onmessage = null
      worker.onerror = null
      worker.onmessageerror = null
      worker.terminate()
      worker = null
    }
  }

  return { run, terminate }
}
