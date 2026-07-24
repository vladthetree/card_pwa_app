/**
 * AI_CONTEXT: Regression coverage for the Messer player/recall handoff.
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import MesserVideoPlayer from '../../components/videos/MesserVideoPlayer'

const labels = {
  fullscreen: 'Fullscreen',
  exitFullscreen: 'Exit fullscreen',
  speed: 'Speed',
}

describe('MesserVideoPlayer recall pause', () => {
  it('disables autoplay while recall questions cover the player', () => {
    const markup = renderToStaticMarkup(createElement(MesserVideoPlayer, {
      file: 'security-controls.mp4',
      src: '/media/security-controls.mp4',
      variant: 'compact',
      paused: true,
      labels,
    }))

    expect(markup).not.toContain('autoplay')
  })

  it('keeps normal direct video launches on autoplay', () => {
    const markup = renderToStaticMarkup(createElement(MesserVideoPlayer, {
      file: 'security-controls.mp4',
      src: '/media/security-controls.mp4',
      variant: 'compact',
      labels,
    }))

    expect(markup).toContain('autoplay')
  })
})
