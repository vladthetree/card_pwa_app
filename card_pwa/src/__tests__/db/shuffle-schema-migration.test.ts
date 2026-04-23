import { describe, expect, it } from 'vitest'
import { CardPwaDB } from '../../db'

interface DexieVersionConfig {
  _cfg?: {
    version?: number
    storesSource?: Record<string, string>
  }
}

describe('shuffle schema migration', () => {
  it('keeps version 11 intact and adds shuffleCollections in version 12', () => {
    const db = new CardPwaDB() as CardPwaDB & { _versions?: DexieVersionConfig[] }
    const versions = db._versions ?? []

    const version11 = versions.find(version => version._cfg?.version === 11)
    const version12 = versions.find(version => version._cfg?.version === 12)

    expect(version11?._cfg?.storesSource?.shuffleCollections).toBeUndefined()
    expect(version12?._cfg?.storesSource?.shuffleCollections).toBe('id, updatedAt, isDeleted')
  })
})
