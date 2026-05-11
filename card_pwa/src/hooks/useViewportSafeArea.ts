import { useEffect } from 'react'

/**
 * Detects the bottom safe-area gap at runtime and sets two CSS custom properties
 * on <html> so the bottom bar can position itself correctly on iOS PWA:
 *
 *   --app-bottom-viewport-gap   gap between CSS viewport bottom and physical screen bottom
 *   --app-bottom-safe-area      height of the safe area (home indicator zone)
 *
 * Strategy:
 *  1. Probe env(safe-area-inset-bottom) via a hidden element – if it returns > 0, use it.
 *  2. Otherwise fall back to (screen.height - innerHeight) clamped to [0, 50] px,
 *     which captures the home-indicator gap on modern iPhones without a browser toolbar.
 */
export function useViewportSafeArea() {
  useEffect(() => {
    const probe = document.createElement('div')
    probe.style.cssText =
      'position:fixed;bottom:0;left:0;width:1px;height:0;' +
      'padding-bottom:env(safe-area-inset-bottom,0px);' +
      'pointer-events:none;visibility:hidden;'
    document.body.appendChild(probe)
    const envVal = parseFloat(getComputedStyle(probe).paddingBottom) || 0
    document.body.removeChild(probe)

    let safeArea: number
    let viewportGap: number

    if (envVal > 0) {
      // env() is working – viewport already extends to screen edge
      safeArea = envVal
      viewportGap = 0
    } else {
      // env() returns 0 – viewport bottom != physical screen bottom
      // The difference between screen height and inner height approximates the gap.
      // Clamp to [0, 50] to avoid including the top status bar on some devices.
      const diff = window.screen.height - window.innerHeight
      safeArea = diff > 0 && diff <= 50 ? diff : 34
      viewportGap = safeArea
    }

    const root = document.documentElement
    root.style.setProperty('--app-bottom-safe-area', `${safeArea}px`)
    root.style.setProperty('--app-bottom-viewport-gap', `${viewportGap}px`)
  }, [])
}
