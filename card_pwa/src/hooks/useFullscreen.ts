/**
 * AI_CONTEXT: React hook for use Fullscreen; encapsulates browser, persistence, sync, layout, or learning state for UI components.
 */
import { useEffect } from 'react'

/**
 * Thin wrapper around the Fullscreen API (with the older WebKit-prefixed
 * fallbacks still used by Safari). Entering fullscreen always requires a user
 * gesture, so the "remembered" preference is re-applied on the first interaction
 * after load rather than automatically — browsers reject a gesture-less request.
 */

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
}

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

function getFullscreenElement(): Element | null {
  const doc = document as FullscreenDocument
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null
}

export function isFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false
  const el = document.documentElement as FullscreenElement
  return typeof el.requestFullscreen === 'function' || typeof el.webkitRequestFullscreen === 'function'
}

export async function requestAppFullscreen(): Promise<void> {
  if (getFullscreenElement()) return
  const el = document.documentElement as FullscreenElement
  try {
    if (typeof el.requestFullscreen === 'function') {
      await el.requestFullscreen()
    } else if (typeof el.webkitRequestFullscreen === 'function') {
      await el.webkitRequestFullscreen()
    }
  } catch {
    // Missing user gesture, unsupported (e.g. iPhone without the flag), or the
    // request was rejected — keep the preference but stay windowed.
  }
}

type FullscreenVideo = HTMLVideoElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
  webkitEnterFullscreen?: () => void
}

/** True while any element is presented fullscreen (standard or WebKit). */
export function isFullscreenActive(): boolean {
  return getFullscreenElement() !== null
}

/**
 * Toggles fullscreen for a single video element. Prefers element-level
 * fullscreen (desktop/Android); falls back to iOS Safari's video-only
 * `webkitEnterFullscreen`, which has no document fullscreen element and is
 * dismissed via the native player UI.
 */
export async function toggleVideoFullscreen(video: HTMLVideoElement): Promise<void> {
  if (getFullscreenElement()) {
    await exitAppFullscreen()
    return
  }
  const v = video as FullscreenVideo
  try {
    if (typeof video.requestFullscreen === 'function') {
      await video.requestFullscreen()
    } else if (typeof v.webkitRequestFullscreen === 'function') {
      await v.webkitRequestFullscreen()
    } else if (typeof v.webkitEnterFullscreen === 'function') {
      v.webkitEnterFullscreen()
    }
  } catch {
    // Missing gesture or unsupported — stay windowed.
  }
}

export async function exitAppFullscreen(): Promise<void> {
  if (!getFullscreenElement()) return
  const doc = document as FullscreenDocument
  try {
    if (typeof document.exitFullscreen === 'function') {
      await document.exitFullscreen()
    } else if (typeof doc.webkitExitFullscreen === 'function') {
      await doc.webkitExitFullscreen()
    }
  } catch {
    // best effort
  }
}

/**
 * Re-applies a persisted fullscreen preference. When enabled and not already
 * fullscreen, the next pointer/key interaction enters fullscreen once. We only
 * arm a single re-entry per mount/enable so a manual exit (e.g. Esc on desktop)
 * is respected instead of fighting the user.
 */
export function useFullscreenPreference(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !isFullscreenSupported()) return
    if (getFullscreenElement()) return

    const tryEnter = () => {
      cleanup()
      void requestAppFullscreen()
    }
    const cleanup = () => {
      window.removeEventListener('pointerdown', tryEnter)
      window.removeEventListener('keydown', tryEnter)
    }

    window.addEventListener('pointerdown', tryEnter)
    window.addEventListener('keydown', tryEnter)
    return cleanup
  }, [enabled])
}
