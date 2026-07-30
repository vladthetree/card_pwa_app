/**
 * AI_CONTEXT:
 * Regression contract for the cross-view learning-plan return path. The app
 * uses a local state machine instead of a router, so these hand-offs must stay
 * wired together across LearningUnitsView, StudyView, App, and navigation.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC_ROOT = join(__dirname, '..', '..')
const source = (relativePath: string) =>
  readFileSync(join(SRC_ROOT, relativePath), 'utf8')

describe('learning-plan navigation contract', () => {
  it('namespaces subdeck sessions and requests a return to learning units', () => {
    const view = source('components/LearningUnitsView.tsx')
    expect(view).toContain('sessionId: `learning-plan:subdeck:${deck.objectiveId}`')
    expect(view).toContain('returnToUnits: true')
  })

  it('persists the return target in StudyView and restores it on global resume', () => {
    const app = source('App.tsx')
    const study = source('components/StudyView.tsx')
    const navigation = source('hooks/app/useAppNavigation.ts')

    expect(app).toContain("returnTarget={nav.studyReturnToUnits ? 'learning-units' : undefined}")
    expect(study).toContain('returnTarget,')
    expect(navigation).toContain('resolveStudyReturnTarget(resumable.sessionId, resumable.snapshot)')
  })

  it('routes study and video exits from learning units back to that Home mode', () => {
    const navigation = source('hooks/app/useAppNavigation.ts')
    expect(navigation).toMatch(/if \(videosReturnToUnits\)[\s\S]*?openLearningUnits\(\)/)
    expect(navigation).toMatch(/if \(studyReturnToUnits\)[\s\S]*?openLearningUnits\(\)/)
  })
})
