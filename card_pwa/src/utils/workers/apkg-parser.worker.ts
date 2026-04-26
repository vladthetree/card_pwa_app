import { parseApkgBuffer, type ApkgParserPayload } from '../import/apkgParserCore'

interface WorkerRequest {
  id?: string
  requestId?: string
  payload: ApkgParserPayload
  port?: MessagePort
}

const ctx = self as any

ctx.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, requestId, payload, port } = event.data
  const requestKey = id ?? requestId

  try {
    const result = await parseApkgBuffer(payload)
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
