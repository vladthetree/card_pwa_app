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
  const attemptedRef = useRef(false)

  useEffect(() => {
    if (!isProfileHydrated) return
    if (profile?.mode === 'linked') return
    if (attemptedRef.current) return
    attemptedRef.current = true

    const endpoint = profile?.endpoint?.trim() || getDefaultProfileSyncEndpoint()
    if (!endpoint) return
    if (!navigator.onLine) return

    void (async () => {
      const info = await fetchDefaultProfileInfo(endpoint)
      if (!info?.userId) return

      const deviceId = getOrCreateDeviceId()
      const joined = await joinPublicProfile(
        endpoint,
        info.userId,
        deviceId,
        navigator.userAgent.slice(0, 60),
      )
      if (!joined.ok || !joined.userId || !joined.profileToken) return

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
  }, [isProfileHydrated, profile?.mode])
}
