import { describe, expect, it, vi } from 'vitest'
import { clearErrorLogs, logError } from '../../services/errorLog'

describe('errorLog', () => {
  const localStorageMock = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  }

  it('does not throw when localStorage writes fail', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    })
    localStorageMock.getItem.mockReset()
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockReset()
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    expect(() => logError('console.error', 'boom')).not.toThrow()
  })

  it('does not throw when localStorage removals fail', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    })
    localStorageMock.removeItem.mockReset()
    localStorageMock.removeItem.mockImplementation(() => {
      throw new Error('blocked')
    })

    expect(() => clearErrorLogs()).not.toThrow()
  })
})
