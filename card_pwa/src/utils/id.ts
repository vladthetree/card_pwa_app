function fillRandomBytes(bytes: Uint8Array): void {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
    return
  }

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256)
  }
}

function byteToHex(byte: number): string {
  return byte.toString(16).padStart(2, '0')
}

export function generateUuidV7(nowMs = Date.now()): string {
  const timestamp = Math.max(0, Math.floor(nowMs))
  const bytes = new Uint8Array(16)

  bytes[0] = (timestamp / 0x10000000000) & 0xff
  bytes[1] = (timestamp / 0x100000000) & 0xff
  bytes[2] = (timestamp / 0x1000000) & 0xff
  bytes[3] = (timestamp / 0x10000) & 0xff
  bytes[4] = (timestamp / 0x100) & 0xff
  bytes[5] = timestamp & 0xff

  fillRandomBytes(bytes.subarray(6))

  bytes[6] = (bytes[6] & 0x0f) | 0x70
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, byteToHex).join('')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-')
}