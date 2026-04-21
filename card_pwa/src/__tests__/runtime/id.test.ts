import { describe, expect, it } from 'vitest'
import { generateUuidV7 } from '../../utils/id'

describe('generateUuidV7', () => {
  it('emits a UUID with version 7 and RFC4122 variant bits', () => {
    const value = generateUuidV7(Date.UTC(2026, 3, 11, 12, 0, 0))
    expect(value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('sorts lexicographically by timestamp prefix for increasing times', () => {
    const earlier = generateUuidV7(1_700_000_000_000)
    const later = generateUuidV7(1_700_000_000_001)
    expect(earlier < later).toBe(true)
  })
})