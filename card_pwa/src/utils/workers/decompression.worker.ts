import { decompress as zstdDecompress } from '../../vendor/fzstd'

const ctx = self as any

ctx.onmessage = (event: MessageEvent<ArrayBuffer>) => {
  try {
    const input = new Uint8Array(event.data)
    const output = zstdDecompress(input, null)
    const buffer = output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength)
    ctx.postMessage({ ok: true, buffer }, [buffer])
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    ctx.postMessage({ ok: false, error: message })
  }
}
