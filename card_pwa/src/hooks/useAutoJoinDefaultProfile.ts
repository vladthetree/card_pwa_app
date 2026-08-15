/**
 * AI_CONTEXT: React hook for use Auto Join Default Profile; encapsulates browser, persistence, sync, layout, or learning state for UI components.
 */
import { useEffect, useRef } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import {
  fetchDefaultProfileInfo,
  joinPublicProfile,
  getOrCreateDeviceId,
  writeProfileHintCookie,
  readProfileHintCookie,
} from '../services/profileService'
import { getDefaultProfileSyncEndpoint } from '../services/syncConfig'
import { runSyncCycleNow } from '../services/syncCoordinator'
import type { ProfileRecord } from '../db'

/**
 * On first load, if the device has no linked profile and a sync endpoint is
 * configured, silently rejoin the device's last-known profile via its cookie
 * hint (cookies survive a PWA storage wipe that clears IndexedDB/localStorage
 * on uninstall/reinstall, unlike the hint's DB-backed source of truth) — or,
 * if there is no hint or it no longer resolves, join the shared Default
 * profile so the user immediately has access to the shared deck library.
 * Without the hint check, every reinstall would silently re-land a named
 * user (e.g. a family member with their own exam-date pacing) back on the
 * shared Default profile until they noticed and manually switched back.
 */
export function useAutoJoinDefaultProfile(): void {
  const { profile, isProfileHydrated, setProfile } = useSettings()
  const attemptedEndpointRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isProfileHydrated) return
    if (profile?.mode === 'linked') return

    const endpoint = profile?.endpoint?.trim() || getDefaultProfileSyncEndpoint()
    if (!endpoint) return

    let cancelled = false

    const applyJoinedProfile = (
      joined: { userId?: string; profileName?: string; profileToken?: string },
      deviceId: string,
    ) => {
      if (!joined.userId || !joined.profileToken) return
      const now = Date.now()
      const nextProfile: ProfileRecord = {
        id: 'current',
        mode: 'linked',
        deviceId,
        userId: joined.userId,
        displayName: joined.profileName,
        profileToken: joined.profileToken,
        endpoint,
        linkedAt: now,
        recoveryCodeShown: true,
        createdAt: now,
        updatedAt: now,
      }
      setProfile(nextProfile)
      writeProfileHintCookie(joined.userId)
      void runSyncCycleNow({ force: true })
    }

    const attemptJoin = () => {
      if (cancelled) return
      if (!navigator.onLine) return
      if (attemptedEndpointRef.current === endpoint) return
      attemptedEndpointRef.current = endpoint

      void (async () => {
        const deviceId = getOrCreateDeviceId()
        const deviceLabel = navigator.userAgent.slice(0, 60)

        const hintedUserId = readProfileHintCookie()
        if (hintedUserId) {
          const rejoined = await joinPublicProfile(endpoint, hintedUserId, deviceId, deviceLabel)
          if (cancelled) return
          if (rejoined.ok && rejoined.userId && rejoined.profileToken) {
            applyJoinedProfile(rejoined, deviceId)
            return
          }
          // Hint no longer resolves (profile removed, different server, …) —
          // fall through to the shared Default profile below.
        }

        const info = await fetchDefaultProfileInfo(endpoint)
        if (cancelled) return
        if (!info?.userId) {
          attemptedEndpointRef.current = null
          return
        }

        const joined = await joinPublicProfile(endpoint, info.userId, deviceId, deviceLabel)
        if (cancelled) return
        if (!joined.ok || !joined.userId || !joined.profileToken) {
          attemptedEndpointRef.current = null
          return
        }

        applyJoinedProfile(joined, deviceId)
      })()
    }

    const attemptJoinWhenVisible = () => {
      if (document.visibilityState === 'visible') attemptJoin()
    }

    attemptJoin()
    window.addEventListener('online', attemptJoin)
    document.addEventListener('visibilitychange', attemptJoinWhenVisible)

    return () => {
      cancelled = true
      window.removeEventListener('online', attemptJoin)
      document.removeEventListener('visibilitychange', attemptJoinWhenVisible)
    }
  }, [isProfileHydrated, profile?.endpoint, profile?.mode, setProfile])
}
