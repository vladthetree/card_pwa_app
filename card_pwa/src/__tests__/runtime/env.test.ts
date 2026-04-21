import { afterEach, describe, expect, it } from 'vitest'
import {
  getRuntimeTarget,
  isWeb,
  supportsPwaInstallPrompt,
  supportsServiceWorker,
} from '../../env'

const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')

function setWindowAndNavigator(options: {
  userAgent?: string
  platform?: string
  uaPlatform?: string
  maxTouchPoints?: number
  serviceWorker?: unknown
}) {
  const existingWindow = (globalThis as { window?: Window }).window
  const win: Window = existingWindow ?? ({} as Window)

  if (!existingWindow) {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: win,
    })
  }


  const nav: {
    userAgent: string
    platform: string
    userAgentData?: { platform: string }
    maxTouchPoints: number
    serviceWorker?: unknown
  } = {
    userAgent: options.userAgent ?? 'Mozilla/5.0',
    platform: options.platform ?? 'MacIntel',
    userAgentData: options.uaPlatform ? { platform: options.uaPlatform } : undefined,
    maxTouchPoints: options.maxTouchPoints ?? 0,
  }

  if (options.serviceWorker !== undefined) {
    nav.serviceWorker = options.serviceWorker
  }

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: nav,
  })
}

describe('runtime env helpers', () => {
  afterEach(() => {
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, 'window', originalWindowDescriptor)
    }

    if (originalNavigatorDescriptor) {
      Object.defineProperty(globalThis, 'navigator', originalNavigatorDescriptor)
    }
  })

  it('detects plain web runtime', () => {
    setWindowAndNavigator({ serviceWorker: undefined })

    expect(isWeb()).toBe(true)
    expect(getRuntimeTarget()).toBe('web')
    expect(supportsPwaInstallPrompt()).toBe(true)
    expect(supportsServiceWorker()).toBe(false)
  })

})
