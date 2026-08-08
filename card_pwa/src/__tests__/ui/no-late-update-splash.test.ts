/**
 * Regression guard: A service-worker update that finishes after startup must
 * never cover the already visible dashboard or reload the active document.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC_ROOT = join(__dirname, '..', '..')

describe('late service-worker updates', () => {
  it('keeps late updates waiting instead of showing a splash or reloading', () => {
    const hook = readFileSync(join(SRC_ROOT, 'hooks/app/useServiceWorkerUpdateFlow.ts'), 'utf-8')
    const app = readFileSync(join(SRC_ROOT, 'App.tsx'), 'utf-8')

    expect(hook).not.toContain("type: 'SKIP_WAITING'")
    expect(hook).not.toContain('window.location.reload')
    expect(hook).not.toContain('showUpdateSplash')
    expect(app).not.toContain("reason={activeSplashMode === 'update'")
    expect(app).not.toContain('showUpdateSplash')
  })
})
