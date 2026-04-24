import { useEffect, useState } from 'react'
import {
  User,
  Unlink,
  RefreshCw,
} from 'lucide-react'
import { useSettings } from '../contexts/SettingsContext'
import type { ProfileRecord } from '../db'
import {
  createServerProfile,
  revokeDeviceToken,
  removeDeviceFromServer,
  getOrCreateDeviceId,
  makeLocalProfile,
  listServerProfiles,
  listServerDecks,
  switchServerProfile,
  readSelectedDeckIds,
  resetLocalStudyDataForProfileSwitch,
  deleteLocalDataForDecks,
  writeSelectedDeckIds,
  writeProfileHintCookie,
  snapshotLocalStudyDataForRollback,
  restoreLocalStudyDataFromRollback,
  type ServerProfileSummary,
  type ServerDeckSummary,
} from '../services/profileService'
import { resetSyncPullState } from '../services/syncPull'
import { clearSyncQueue, wakeDeferredSyncQueue } from '../services/syncQueue'
import { runSyncCycleNow } from '../services/syncCoordinator'
import { getDefaultProfileSyncEndpoint } from '../services/syncConfig'

const STRINGS = {
  de: {
    title: 'Profil & Sync',
    description: 'Lokale Nutzung oder geräteübergreifende Synchronisierung.',
    mode_local: 'Nur lokal',
    mode_local_desc: 'Deine Daten bleiben auf diesem Gerät. Kein Server benötigt.',
    mode_linked: 'Mit Profil verknüpft',
    create_profile: 'Profil erstellen & Sync aktivieren',
    create_profile_desc: 'Verbindet dieses Gerät mit dem konfigurierten Sync-Server.',
    unlink: 'Auf diesem Gerät abmelden',
    unlink_confirm: 'Sync deaktivieren? Lokale Daten bleiben erhalten.',
    remove_device: 'Gerät serverseitig vom Profil entfernen',
    remove_device_confirm: 'Gerät wirklich serverseitig entfernen? Danach kann ein neues Profil erstellt werden. Dieser Vorgang kann nicht rückgängig gemacht werden.',
    removing_device: 'Gerät wird entfernt…',
    user_id_label: 'Benutzer-ID',
    device_id_label: 'Geräte-ID',
    linked_at_label: 'Verknüpft am',
    server_configured: 'Server-Endpunkt ist vorkonfiguriert.',
    creating: 'Profil wird erstellt…',
    linking: 'Wird verknüpft…',
    error_no_endpoint: 'Kein Profil-Sync-Server konfiguriert. Bitte VITE_SYNC_ENDPOINT oder VITE_PROFILE_SYNC_ENDPOINT setzen.',
    list_profiles: 'Profile vom Server laden',
    list_profiles_refresh: 'Liste aktualisieren',
    list_decks: 'Decks vom Server',
    list_decks_refresh: 'Decks aktualisieren',
    select_all_decks: 'Alle auswählen',
    selected_all_decks: 'Alle Decks werden synchronisiert.',
    selected_some_decks: 'Nur ausgewählte Decks werden synchronisiert.',
    decks_syncing: 'Deck-Auswahl wird synchronisiert…',
    profile_created: 'Neues Profil wurde erstellt und verknüpft.',
    device_already_linked: 'Diese Geräte-ID ist bereits mit einem Profil verknüpft. Bitte nutze das bestehende Profil oder stelle es per Recovery/Pairing wieder her.',
    switch_to_profile: 'Auf dieses Profil wechseln',
    switching: 'Profil wird gewechselt…',
    profile_name_label: 'Profilname',
    offline_blocked: 'Profilwechsel ist offline nicht erlaubt.',
    pre_sync_failed: 'Vorab-Sync fehlgeschlagen. Bitte Verbindung prüfen und erneut versuchen.',
    switch_failed: 'Profilwechsel fehlgeschlagen.',
    switch_bootstrap_failed: 'Profil wurde gewechselt, aber initialer Sync ist fehlgeschlagen. Rollback wurde ausgeführt.',
    unlink_failed: 'Abmelden auf diesem Gerät ist fehlgeschlagen. Bitte erneut versuchen.',
    remove_device_failed: 'Gerät konnte serverseitig nicht entfernt werden. Bitte erneut versuchen.',
    invalid_server_response: 'Server hat keine gültige JSON-Antwort geliefert. Bitte PWA neu bauen und Proxy/Server prüfen.',
  },
  en: {
    title: 'Profile & Sync',
    description: 'Use locally or sync across devices.',
    mode_local: 'Local only',
    mode_local_desc: 'Your data stays on this device. No server required.',
    mode_linked: 'Linked to profile',
    create_profile: 'Create profile & enable sync',
    create_profile_desc: 'Links this device to the configured sync server.',
    unlink: 'Sign out on this device',
    unlink_confirm: 'Disable sync? Local data is kept.',
    remove_device: 'Remove device from profile on server',
    remove_device_confirm: 'Really remove this device from the server? After this a new profile can be created. This cannot be undone.',
    removing_device: 'Removing device…',
    user_id_label: 'User ID',
    device_id_label: 'Device ID',
    linked_at_label: 'Linked on',
    server_configured: 'Server endpoint is preconfigured.',
    creating: 'Creating profile…',
    linking: 'Linking…',
    error_no_endpoint: 'No profile sync server configured. Set VITE_SYNC_ENDPOINT or VITE_PROFILE_SYNC_ENDPOINT.',
    list_profiles: 'Load profiles from server',
    list_profiles_refresh: 'Refresh list',
    list_decks: 'Decks from server',
    list_decks_refresh: 'Refresh decks',
    select_all_decks: 'Select all',
    selected_all_decks: 'All decks are synced.',
    selected_some_decks: 'Only selected decks are synced.',
    decks_syncing: 'Syncing selected decks…',
    profile_created: 'New profile was created and linked.',
    device_already_linked: 'This device ID is already linked to a profile. Use the existing profile or restore access via recovery/pairing.',
    switch_to_profile: 'Switch to this profile',
    switching: 'Switching profile…',
    profile_name_label: 'Profile name',
    offline_blocked: 'Profile switching is blocked while offline.',
    pre_sync_failed: 'Pre-switch sync failed. Check connectivity and retry.',
    switch_failed: 'Profile switching failed.',
    switch_bootstrap_failed: 'Profile switched but initial sync failed. Rollback applied.',
    unlink_failed: 'Signing out on this device failed. Please try again.',
    remove_device_failed: 'Removing the device on the server failed. Please try again.',
    invalid_server_response: 'Server returned an invalid JSON response. Rebuild the PWA and check proxy/server setup.',
  },
} as const

type Lang = 'de' | 'en'

interface Props {
  language: Lang
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4 text-xs">
      <span className="text-zinc-500 shrink-0">{label}</span>
      <span className="text-zinc-300 font-mono text-right break-all">{value}</span>
    </div>
  )
}

function resolveErrorMessage(error: string, t: typeof STRINGS['de'] | typeof STRINGS['en']): string {
  switch (error) {
    case 'offline_blocked':
      return t.offline_blocked
    case 'presync_failed':
      return t.pre_sync_failed
    case 'switch_denied':
      return t.switch_failed
    case 'rollback_applied':
      return t.switch_bootstrap_failed
    case 'unlink_failed':
      return t.unlink_failed
    case 'remove_device_failed':
      return t.remove_device_failed
    case 'invalid_server_response':
      return t.invalid_server_response
    case 'device_already_linked':
      return t.device_already_linked
    default:
      return error
  }
}

export default function ProfileSyncSection({ language }: Props) {
  const t = STRINGS[language]
  const { profile, setProfile } = useSettings()

  const [busy, setBusy] = useState(false)
  const [profileNameInput, setProfileNameInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<ServerProfileSummary[]>([])
  const [serverDecks, setServerDecks] = useState<ServerDeckSummary[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [loadingDecks, setLoadingDecks] = useState(false)
  const [switchingUserId, setSwitchingUserId] = useState<string | null>(null)
  const [selectedDeckIds, setSelectedDeckIds] = useState<string[]>([])
  const [removingDevice, setRemovingDevice] = useState(false)
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  const effectiveEndpoint = profile?.endpoint?.trim() || getDefaultProfileSyncEndpoint()

  useEffect(() => {
    const updateOnlineState = () => {
      setIsOnline(navigator.onLine)
    }

    window.addEventListener('online', updateOnlineState)
    window.addEventListener('offline', updateOnlineState)

    return () => {
      window.removeEventListener('online', updateOnlineState)
      window.removeEventListener('offline', updateOnlineState)
    }
  }, [])

  const loadProfiles = async () => {
    if (!effectiveEndpoint || profile?.mode !== 'linked' || !profile.profileToken) return
    setLoadingProfiles(true)
    const listed = await listServerProfiles(effectiveEndpoint, profile.profileToken, 20)
    if (!listed.ok) {
      setError(listed.error ?? t.switch_failed)
      setLoadingProfiles(false)
      return
    }
    setProfiles(listed.profiles ?? [])
    setLoadingProfiles(false)
  }

  const loadDecks = async (activeProfile = profile) => {
    const endpoint = activeProfile?.endpoint?.trim() || getDefaultProfileSyncEndpoint()
    if (!endpoint || activeProfile?.mode !== 'linked' || !activeProfile.userId) {
      setServerDecks([])
      return
    }

    setLoadingDecks(true)
    const listed = await listServerDecks(endpoint, activeProfile.profileToken)
    if (!listed.ok) {
      setError(listed.error ?? t.switch_failed)
      setLoadingDecks(false)
      return
    }

    const decks = listed.decks ?? []
    setServerDecks(decks)
    setSelectedDeckIds(readSelectedDeckIds(activeProfile.userId))
    setLoadingDecks(false)
  }

  const selectedDeckSet = selectedDeckIds.length > 0 ? new Set(selectedDeckIds) : null
  const allServerDeckIds = serverDecks.map(deck => deck.id)
  const selectedCount = selectedDeckSet
    ? serverDecks.filter(deck => selectedDeckSet.has(deck.id)).length
    : serverDecks.length

  const persistSelectedDeckIds = async (nextIds: string[]) => {
    if (!profile?.userId) return
    const unique = Array.from(new Set(nextIds)).filter(id => allServerDeckIds.includes(id))
    const normalized = unique.length === allServerDeckIds.length ? [] : unique

    // Determine which decks were just deselected and remove their local data immediately
    const previousSelected = selectedDeckIds.length > 0 ? selectedDeckIds : allServerDeckIds
    const nextSet = new Set(normalized.length > 0 ? normalized : allServerDeckIds)
    const removedDeckIds = previousSelected.filter(id => !nextSet.has(id))
    if (removedDeckIds.length > 0) {
      await deleteLocalDataForDecks(removedDeckIds)
    }

    writeSelectedDeckIds(profile.userId, normalized)
    setSelectedDeckIds(normalized)
    await wakeDeferredSyncQueue()
    await resetSyncPullState()
    if (isOnline) {
      void runSyncCycleNow({ force: true })
    }
  }

  const handleToggleDeckSync = async (deckId: string) => {
    const current = selectedDeckSet ? Array.from(selectedDeckSet) : allServerDeckIds
    const next = current.includes(deckId)
      ? current.filter(id => id !== deckId)
      : [...current, deckId]
    await persistSelectedDeckIds(next)
  }

  const handleSelectAllDecks = async () => {
    await persistSelectedDeckIds(allServerDeckIds)
  }

  useEffect(() => {
    if (!effectiveEndpoint || !isOnline || profile?.mode !== 'linked') return
    void loadProfiles()
  }, [effectiveEndpoint, isOnline, profile?.mode])

  useEffect(() => {
    if (!effectiveEndpoint || !isOnline || profile?.mode !== 'linked') return
    void loadDecks()
  }, [effectiveEndpoint, isOnline, profile?.mode, profile?.userId, profile?.profileToken])

  const handleCreateProfile = async () => {
    if (!effectiveEndpoint) {
      setError(t.error_no_endpoint)
      setNotice(null)
      return
    }
    setBusy(true)
    setError(null)
    setNotice(null)
    const deviceId = getOrCreateDeviceId()
    const normalizedProfileName = profileNameInput.trim()
    const res = await createServerProfile(
      effectiveEndpoint,
      deviceId,
      navigator.userAgent.slice(0, 60),
      normalizedProfileName || undefined,
    )
    if (!res.ok || !res.userId || !res.profileToken) {
      setError(res.error ?? 'unknown_error')
      setNotice(null)
      setBusy(false)
      return
    }

    const now = Date.now()
    const linked: ProfileRecord = {
      id: 'current',
      mode: 'linked',
      deviceId,
      userId: res.userId,
      displayName: res.profileName,
      profileToken: res.profileToken,
      endpoint: effectiveEndpoint,
      linkedAt: now,
      recoveryCodeShown: false,
      createdAt: now,
      updatedAt: now,
    }
    setProfile(linked)
    writeProfileHintCookie(linked.userId ?? '')
    await loadProfiles()
    await loadDecks(linked)
    setProfileNameInput('')
    setNotice(t.profile_created)
    setBusy(false)
  }

  const handleUnlink = async () => {
    if (!profile?.profileToken || !profile.endpoint) {
      setError(null)
      setNotice(null)
      setProfiles([])
      setServerDecks([])
      setSelectedDeckIds([])
      const local = makeLocalProfile()
      setProfile(local)
      return
    }
    setBusy(true)
    setError(null)
    setNotice(null)
    const revoked = await revokeDeviceToken(profile.endpoint, profile.profileToken)
    if (!revoked) {
      setError('unlink_failed')
      setBusy(false)
      return
    }
    await clearSyncQueue()
    await resetSyncPullState()
    setProfiles([])
    setServerDecks([])
    setSelectedDeckIds([])
    const local = makeLocalProfile()
    setProfile(local)
    setBusy(false)
  }

  const handleRemoveDevice = async () => {
    if (!window.confirm(t.remove_device_confirm)) return
    if (!profile?.profileToken || !profile.endpoint) return
    setRemovingDevice(true)
    setError(null)
    setNotice(null)
    const removed = await removeDeviceFromServer(profile.endpoint, profile.profileToken)
    if (!removed) {
      setError('remove_device_failed')
      setRemovingDevice(false)
      return
    }
    await clearSyncQueue()
    await resetSyncPullState()
    setProfiles([])
    setServerDecks([])
    setSelectedDeckIds([])
    const local = makeLocalProfile()
    setProfile(local)
    setRemovingDevice(false)
  }

  const handleSwitchToProfile = async (target: ServerProfileSummary) => {
    if (!effectiveEndpoint) {
      setError(t.error_no_endpoint)
      setNotice(null)
      return
    }
    if (!isOnline) {
      setError('offline_blocked')
      setNotice(null)
      return
    }

    setError(null)
    setNotice(null)
    setBusy(true)
    setSwitchingUserId(target.userId)
    const previousProfile = profile
    const rollbackSnapshot = await snapshotLocalStudyDataForRollback()

    if (profile?.mode === 'linked') {
      const preSyncOk = await runSyncCycleNow({ force: true })
      if (!preSyncOk) {
        setError('presync_failed')
        setNotice(null)
        setBusy(false)
        setSwitchingUserId(null)
        return
      }
    }

    const deviceId = getOrCreateDeviceId()
    const switched = await switchServerProfile(
      effectiveEndpoint,
      target.userId,
      deviceId,
      navigator.userAgent.slice(0, 60),
      profile?.profileToken,
    )

    if (!switched.ok || !switched.userId || !switched.profileToken) {
      setError(switched.error ?? 'switch_denied')
      setNotice(null)
      setBusy(false)
      setSwitchingUserId(null)
      return
    }

    await clearSyncQueue()
    await resetSyncPullState()
    await resetLocalStudyDataForProfileSwitch()

    const now = Date.now()
    const nextProfile: ProfileRecord = {
      id: 'current',
      mode: 'linked',
      deviceId,
      userId: switched.userId,
      displayName: switched.profileName ?? target.profileName,
      profileToken: switched.profileToken,
      endpoint: effectiveEndpoint,
      linkedAt: now,
      recoveryCodeShown: true,
      createdAt: previousProfile?.createdAt ?? now,
      updatedAt: now,
    }

    setProfile(nextProfile)
    writeProfileHintCookie(switched.userId)

    const bootstrapOk = await runSyncCycleNow({ force: true })
    if (!bootstrapOk) {
      if (previousProfile) {
        setProfile(previousProfile)
      }
      await restoreLocalStudyDataFromRollback(rollbackSnapshot)
      setError('rollback_applied')
      setNotice(null)
      setBusy(false)
      setSwitchingUserId(null)
      return
    }

    await loadProfiles()
    await loadDecks(nextProfile)
    setBusy(false)
    setSwitchingUserId(null)
  }

  const isLinked = profile?.mode === 'linked'

  return (
    <div className="space-y-5 pt-3">
      {/* Status banner */}
      <div className={`flex items-center gap-3 rounded-lg px-4 py-3 ${isLinked ? 'bg-emerald-950/60 border border-emerald-800/40' : 'bg-zinc-900 border border-zinc-800'}`}>
        <User size={16} className={isLinked ? 'text-emerald-400' : 'text-zinc-500'} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">
            {isLinked ? t.mode_linked : t.mode_local}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">
            {isLinked ? (profile?.userId?.slice(0, 8) + '…') : t.mode_local_desc}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/40 rounded px-3 py-2">{resolveErrorMessage(error, t)}</p>
      )}
      {notice && (
        <p className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/40 rounded px-3 py-2">{notice}</p>
      )}

      {/* Linked profile info */}
      {isLinked && profile && (
        <div className="space-y-2">
          <StatusRow label={t.user_id_label} value={profile.userId ?? '—'} />
          <StatusRow label={t.device_id_label} value={profile.deviceId} />
          {profile.linkedAt && (
            <StatusRow
              label={t.linked_at_label}
              value={new Date(profile.linkedAt).toLocaleDateString()}
            />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {isLinked && !!effectiveEndpoint && (
          <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-zinc-300">{t.list_profiles}</p>
                <button
                  type="button"
                  onClick={() => void loadProfiles()}
                  disabled={busy || loadingProfiles || !isOnline}
                  className="text-xs text-zinc-400 hover:text-white disabled:opacity-40 transition-colors"
                >
                {loadingProfiles ? t.linking : t.list_profiles_refresh}
              </button>
            </div>

            {profiles.length === 0 && !loadingProfiles && (
              <p className="text-xs text-zinc-500">—</p>
            )}

            {profiles.map(item => {
              const isCurrent = profile?.userId === item.userId && profile?.mode === 'linked'
              const isSwitchingThis = switchingUserId === item.userId
              return (
                <div key={item.userId} className="rounded border border-zinc-800 px-3 py-2">
                  <p className="text-sm text-white font-medium">{item.profileName}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{item.userId.slice(0, 8)}… · {item.linkedDevicesCount ?? 0} devices</p>
                  <div className="mt-2">
                    <button
                      type="button"
                      disabled={busy || isCurrent || isSwitchingThis || !isOnline}
                      onClick={() => void handleSwitchToProfile(item)}
                      className="text-xs px-2.5 py-1.5 rounded border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 disabled:opacity-40 transition-colors"
                    >
                      {isCurrent ? t.mode_linked : (isSwitchingThis ? t.switching : t.switch_to_profile)}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {isLinked && !!effectiveEndpoint && (
          <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-zinc-300">{t.list_decks}</p>
                <button
                  type="button"
                  onClick={() => void loadDecks()}
                  disabled={busy || loadingDecks || !isOnline}
                  className="text-xs text-zinc-400 hover:text-white disabled:opacity-40 transition-colors"
                >
                {loadingDecks ? t.linking : t.list_decks_refresh}
              </button>
            </div>

            {serverDecks.length === 0 && !loadingDecks && (
              <p className="text-xs text-zinc-500">—</p>
            )}

            {serverDecks.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                  <span>
                    {selectedDeckIds.length === 0
                      ? t.selected_all_decks
                      : `${t.selected_some_decks} (${selectedCount}/${serverDecks.length})`}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleSelectAllDecks()}
                    disabled={busy || loadingDecks || selectedDeckIds.length === 0}
                    className="text-zinc-400 hover:text-white disabled:opacity-40 transition-colors"
                  >
                    {t.select_all_decks}
                  </button>
                </div>
                <div className="max-h-56 overflow-y-auto rounded border border-zinc-800">
                <ul>
                  {serverDecks.map(deck => (
                    <li
                      key={deck.id}
                      className="px-3 py-2 text-sm text-zinc-200 border-b border-zinc-800 last:border-b-0"
                    >
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!selectedDeckSet || selectedDeckSet.has(deck.id)}
                          onChange={() => void handleToggleDeckSync(deck.id)}
                          disabled={busy || loadingDecks}
                          className="h-4 w-4 accent-emerald-500"
                        />
                        <span>{deck.name || deck.id}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {!isLinked && (
          <>
            <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
              <label className="block text-xs font-semibold text-zinc-300" htmlFor="profile-name-input">
                {t.profile_name_label}
              </label>
              <input
                id="profile-name-input"
                type="text"
                value={profileNameInput}
                onChange={event => setProfileNameInput(event.target.value)}
                maxLength={80}
                placeholder={t.profile_name_label}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-500"
              />
              <p className="text-xs text-zinc-500">{t.create_profile_desc}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleCreateProfile()}
              disabled={busy || !effectiveEndpoint}
              className="w-full flex items-center justify-center gap-2 bg-white text-black text-sm font-semibold rounded-lg py-2.5 hover:bg-zinc-200 disabled:opacity-40 transition-colors"
            >
              {busy ? <RefreshCw size={14} className="animate-spin" /> : <User size={14} />}
              {busy ? t.creating : t.create_profile}
            </button>
          </>
        )}

        {isLinked && (
          <>
            <button
              type="button"
              onClick={() => void handleUnlink()}
              disabled={busy || removingDevice}
              className="w-full flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-red-400 transition-colors py-2"
            >
              <Unlink size={13} />
              {t.unlink}
            </button>
            <button
              type="button"
              onClick={() => void handleRemoveDevice()}
              disabled={busy || removingDevice || !isOnline}
              className="w-full flex items-center justify-center gap-2 text-xs text-zinc-600 hover:text-red-500 transition-colors py-1.5"
            >
              {removingDevice ? <RefreshCw size={12} className="animate-spin" /> : <Unlink size={12} />}
              {removingDevice ? t.removing_device : t.remove_device}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
