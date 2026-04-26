import {
  resolveOperations,
  type OperationResolverInput,
} from '../sync/operationResolver'

interface WorkerRequest {
  id?: string
  requestId?: string
  payload: OperationResolverInput
  port?: MessagePort
}

const ctx = self as any

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, requestId, payload, port } = event.data
  const requestKey = id ?? requestId

  try {
    const result = resolveOperations(payload)
    const message = { id: requestKey, requestId: requestKey, ok: true as const, result }
    if (port) {
      port.postMessage(message)
      return
    }
    ctx.postMessage(message)
  } catch (error) {
    const message = {
      id: requestKey,
      requestId: requestKey,
      ok: false as const,
      error: error instanceof Error ? error.message : String(error),
    }
    if (port) {
      port.postMessage(message)
      return
    }
    ctx.postMessage(message)
  }
}
