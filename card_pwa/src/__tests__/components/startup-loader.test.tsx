/**
 * AI_CONTEXT: Regression coverage for the iOS-safe, CSS-only startup loader.
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import StartupLoader from '../../components/StartupLoader'

describe('StartupLoader', () => {
  it('renders a card-based loader without canvas or blur markup', () => {
    const html = renderToStaticMarkup(createElement(StartupLoader, {
      primary: '#e75f3c',
      secondary: '#79b7aa',
    }))

    expect(html).toContain('data-testid="startup-loader"')
    expect(html).toContain('startup-loader__orbit--outer')
    expect(html).toContain('startup-loader__card--front')
    expect(html).not.toContain('<canvas')
    expect(html).not.toContain('filter:')
  })

  it('keeps the calm loading variant explicit for reduced-motion devices', () => {
    const html = renderToStaticMarkup(createElement(StartupLoader, {
      primary: '#e75f3c',
      secondary: '#79b7aa',
      reducedMotion: true,
    }))

    expect(html).toContain('startup-loader startup-loader--calm')
  })
})
