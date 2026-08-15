import { describe, expect, it } from 'vitest'

import {
  isAuthoritativeCardContentOperation,
  pickAuthoritativeCardContentUpdates,
} from '../../utils/sync/cardContentAuthority'


describe('review gateway content authority', () => {
  it('accepts only the review gateway publication identity', () => {
    expect(isAuthoritativeCardContentOperation({
      source: 'server-maintenance-publish',
      sourceClient: 'security-card-review-gateway-v1',
    })).toBe(true)

    expect(isAuthoritativeCardContentOperation({
      source: 'client-sync',
      sourceClient: 'security-card-review-gateway-v1',
    })).toBe(false)

    expect(isAuthoritativeCardContentOperation({
      source: 'server-maintenance-publish',
      sourceClient: 'learner-device',
    })).toBe(false)
  })

  it('publishes authoring fields without copying FSRS progress', () => {
    const updates = pickAuthoritativeCardContentUpdates({
      front: 'Reviewed question',
      back: 'Reviewed answer',
      tags: ['reviewed'],
      reps: 12,
      due: 99,
      stability: 8.5,
    })

    expect(updates).toEqual({
      front: 'Reviewed question',
      back: 'Reviewed answer',
      tags: ['reviewed'],
    })
  })
})
