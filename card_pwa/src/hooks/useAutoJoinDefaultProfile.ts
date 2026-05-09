import { useEffect, useRef } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import {
  fetchDefaultProfileInfo,
  joinPublicProfile,
  getOrCreateDeviceId,
  writeProfileHintCookie,
} from '../services/profileService'
import { getDefaultProfileSyncEndpoint } from '../services/syncConfig'
import { runSyncCycleNow } from '../services/syncCoordinator'
import type { ProfileRecord } from '../db'

/**
 * On first load, if the device has no linked profile and a sync endpoint is
 * configured, silently join the Default profile so the user immediately has
 * access to the shared deck library.
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

    const attemptJoin = () => {
      if (cancelled) return
      if (!navigator.onLine) return
      if (attemptedEndpointRef.current === endpoint) return
      attemptedEndpointRef.current = endpoint

      void (async () => {
        const info = await fetchDefaultProfileInfo(endpoint)
        if (cancelled) return
        if (!info?.userId) {
          attemptedEndpointRef.current = null
          return
        }

        const deviceId = getOrCreateDeviceId()
        const joined = await joinPublicProfile(
          endpoint,
          info.userId,
          deviceId,
          navigator.userAgent.slice(0, 60),
        )
        if (cancelled) return
        if (!joined.ok || !joined.userId || !joined.profileToken) {
          attemptedEndpointRef.current = null
          return
        }

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
