/**
 * Long explanations and diagrams must never push the desktop rating controls
 * beyond the viewport. The card scrolls; the rating bar is a sibling footer.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC_ROOT = join(__dirname, '..', '..')

describe('desktop study rating controls', () => {
  for (const view of ['StudyView.tsx', 'ShuffleStudyView.tsx']) {
    it(`keeps rating outside the scrollable card in ${view}`, () => {
      const content = readFileSync(join(SRC_ROOT, 'components', view), 'utf-8')
      const scrollStart = content.indexOf('ref={desktopCardScrollRef}')
      const ratingStart = content.indexOf('data-testid="study-desktop-rating-area"')

      expect(scrollStart).toBeGreaterThan(-1)
      expect(ratingStart).toBeGreaterThan(scrollStart)
      expect(content.slice(scrollStart, ratingStart)).toContain('data-study-scroll="allow"')
      expect(content.slice(scrollStart, ratingStart)).toContain('overflow-y-auto')
      expect(content.slice(scrollStart, ratingStart)).toMatch(/\n\s{6,10}<\/div>\s*(?:\{\/\*[^]*?\*\/\}\s*)?\{!isHandsetLayout && !peeking && session\.isFlipped && currentCard && \(/)
      expect(content.slice(ratingStart - 120, ratingStart)).toContain('shrink-0')
      expect(content).toContain('h-[100dvh]')
    })
  }

  it('shows the desktop scrollbar on mouse and trackpad layouts', () => {
    const css = readFileSync(join(SRC_ROOT, 'index.css'), 'utf-8')
    expect(css).toContain('@media (hover: hover) and (pointer: fine)')
    expect(css).toContain('.study-desktop-scroll {')
    expect(css).toContain('.study-desktop-scroll::-webkit-scrollbar {')
  })

  it('does not trap desktop wheel scrolling inside a nested card body', () => {
    const shared = readFileSync(join(SRC_ROOT, 'components', 'cardRendererShared.tsx'), 'utf-8')
    const card = readFileSync(join(SRC_ROOT, 'components', 'CardFace.tsx'), 'utf-8')
    expect(shared).toContain("? 'min-h-0 flex-1 overflow-y-auto")
    expect(shared).toContain(": 'flex-1 px-6 py-6")
    expect(card).toContain("${compact ? 'overscroll-y-contain' : ''}")
  })

  it('offers theme and typography controls in the study header', () => {
    const view = readFileSync(join(SRC_ROOT, 'components', 'StudyView.tsx'), 'utf-8')
    expect(view).toContain('data-testid="study-theme-toggle"')
    expect(view).toContain('data-testid="study-typography-toggle"')
    expect(view).toContain('study-font-${readingFont}')
  })

  it('uses a two-column answer layout only when desktop width and supporting content allow it', () => {
    const card = readFileSync(join(SRC_ROOT, 'components', 'CardFace.tsx'), 'utf-8')
    const view = readFileSync(join(SRC_ROOT, 'components', 'StudyView.tsx'), 'utf-8')
    expect(card).toContain('const splitAnswer = !compact && Boolean(answered.answer) && hasAnswerSidebar')
    expect(card).toContain('data-study-answer-layout={splitAnswer ? \'adaptive\' : \'stacked\'}')
    expect(card).toContain('min-[1400px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]')
    expect(view).toContain('max-w-[1480px]')
  })
})
