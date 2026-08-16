/**
 * AI_CONTEXT: Source-level layout contract for the mobile review controls.
 * Guards the requested bottom clearance in both normal and shuffle sessions.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC_ROOT = join(__dirname, '..', '..')

function source(relativePath: string): string {
  return readFileSync(join(SRC_ROOT, relativePath), 'utf-8')
}

describe('handset rating controls', () => {
  it('reserves about five percent viewport clearance plus Home Indicator safety', () => {
    const css = source('index.css')
    expect(css).toContain('.handset-rating-area {')
    expect(css).toContain('5dvh')
    expect(css).toContain('var(--app-bottom-safe-area')
    expect(css).toContain('padding-bottom: var(--handset-rating-bottom-gap)')
  })

  it('uses the shared clearance in deck and shuffle study views', () => {
    for (const view of ['components/StudyView.tsx', 'components/ShuffleStudyView.tsx']) {
      const content = source(view)
      expect(content).toContain('handset-rating-area w-full shrink-0')
      expect(content).toContain("isHandsetLandscape ? 'handset-rating-area-landscape' : ''")
    }
  })
})
