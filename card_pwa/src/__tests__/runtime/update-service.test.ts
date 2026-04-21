import { describe, expect, it, vi } from 'vitest'

import { checkForAppUpdates } from '../../services/updateService'

describe('update service', () => {
  it('checks web service worker registration and returns up-to-date', async () => {
    const update = vi.fn(async () => {})

    const result = await checkForAppUpdates({
      runtime: 'web',
      serviceWorkerContainer: {
        getRegistration: async () => ({ update }),
      },
    })

    expect(update).toHaveBeenCalledTimes(1)
    expect(result.status).toBe('up-to-date')
    expect(result.runtime).toBe('web')
  })

  it('returns error when web update call fails', async () => {
    const result = await checkForAppUpdates({
      runtime: 'web',
      serviceWorkerContainer: {
        getRegistration: async () => ({
          update: async () => {
            throw new Error('update failed')
          },
        }),
      },
    })

    expect(result.status).toBe('error')
    expect(result.runtime).toBe('web')
  })
})