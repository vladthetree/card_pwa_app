import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getRuntimeTarget,
  isWeb,
  supportsPwaInstallPrompt,
  supportsServiceWorker,
} from '../../env'

describe('runtime env helpers', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('exposes the web-only runtime contract', () => {
    expect(isWeb()).toBe(true)
    expect(getRuntimeTarget()).toBe('web')
    expect(supportsPwaInstallPrompt()).toBe(true)
  })

  it('detects service worker support from navigator capabilities', () => {
    vi.stubGlobal('navigator', {})
    expect(supportsServiceWorker()).toBe(false)

    vi.stubGlobal('navigator', { serviceWorker: {} })
    expect(supportsServiceWorker()).toBe(true)
  })
})
