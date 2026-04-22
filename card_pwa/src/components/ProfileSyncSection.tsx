import { useEffect, useState } from 'react'
import {
  User,
  Link,
  Unlink,
  Copy,
  Check,
  RefreshCw,
  QrCode,
  KeyRound,
  LogIn,
} from 'lucide-react'
import { useSettings } from '../contexts/SettingsContext'
import type { ProfileRecord } from '../db'
import {
  createServerProfile,
  issuePairingCode,
  redeemPairingCode,
  revokeDeviceToken,
  getOrCreateDeviceId,
  makeLocalProfile,
  recoverWithCode,
  listServerProfiles,
  switchServerProfile,
  resetLocalStudyDataForProfileSwitch,
  writeProfileHintCookie,
  snapshotLocalStudyDataForRollback,
  restoreLocalStudyDataFromRollback,
  type ServerProfileSummary,
} from '../services/profileService'
import { resetSyncPullState } from '../services/syncPull'
import { clearSyncQueue } from '../services/syncQueue'
import { runSyncCycleNow } from '../services/syncCoordinator'

const STRINGS = {
  de: {
    title: 'Profil & Sync',
    description: 'Lokale Nutzung oder geräteübergreifende Synchronisierung.',
    mode_local: 'Nur lokal',
    mode_local_desc: 'Deine Daten bleiben auf diesem Gerät. Kein Server benötigt.',
    mode_linked: 'Mit Profil verknüpft',
    create_profile: 'Profil erstellen & Sync aktivieren',
    create_profile_desc: 'Verbindet dieses Gerät mit dem konfigurierten Sync-Server.',
    link_device: 'Weiteres Gerät verbinden',
    link_device_desc: 'Pairing-Code für ein zweites Gerät generieren.',
    unlink: 'Verknüpfung auf diesem Gerät lösen',
    unlink_confirm: 'Sync deaktivieren? Lokale Daten bleiben erhalten.',
    user_id_label: 'Benutzer-ID',
    device_id_label: 'Geräte-ID',
    linked_at_label: 'Verknüpft am',
    recovery_code_title: 'Recovery-Code',
    recovery_code_desc: 'Notiere diesen Code – er wird nur einmal angezeigt. Damit kannst du auf einem neuen Gerät dein Profil wiederherstellen.',
    recovery_code_saved: 'Ich habe den Code notiert',
    pair_code_title: 'Pairing-Code für zweites Gerät',
    pair_code_expires: 'Gültig für 2 Minuten',
    pair_code_input: 'Code vom anderen Gerät eingeben',
    pair_code_redeem: 'Code einlösen',
    pair_code_cancel: 'Abbrechen',
    recover_title: 'Mit Recovery-Code verbinden',
    recover_input: 'Recovery-Code eingeben',
    recover_action: 'Verbinden',
    endpoint_label: 'Server-Endpunkt',
    endpoint_placeholder: 'https://sync.example.com',
    endpoint_hint: 'Wird aus den Sync-Einstellungen übernommen wenn vorhanden.',
    creating: 'Profil wird erstellt…',
    linking: 'Wird verknüpft…',
    error_no_endpoint: 'Kein Sync-Server konfiguriert. Bitte zuerst den Endpunkt unter Diagnose → Sync-Token setzen.',
    copied: 'Kopiert',
    copy: 'Kopieren',
    list_profiles: 'Profile vom Server laden',
    list_profiles_refresh: 'Liste aktualisieren',
    switch_to_profile: 'Auf dieses Profil wechseln',
    switching: 'Profil wird gewechselt…',
    profile_name_label: 'Profilname',
    offline_blocked: 'Profilwechsel ist offline nicht erlaubt.',
    pre_sync_failed: 'Vorab-Sync fehlgeschlagen. Bitte Verbindung prüfen und erneut versuchen.',
    switch_failed: 'Profilwechsel fehlgeschlagen.',
    switch_bootstrap_failed: 'Profil wurde gewechselt, aber initialer Sync ist fehlgeschlagen. Rollback wurde ausgeführt.',
  },
  en: {
    title: 'Profile & Sync',
    description: 'Use locally or sync across devices.',
    mode_local: 'Local only',
    mode_local_desc: 'Your data stays on this device. No server required.',
    mode_linked: 'Linked to profile',
    create_profile: 'Create profile & enable sync',
    create_profile_desc: 'Links this device to the configured sync server.',
    link_device: 'Connect another device',
    link_device_desc: 'Generate a pairing code for a second device.',
    unlink: 'Unlink this device',
    unlink_confirm: 'Disable sync? Local data is kept.',
    user_id_label: 'User ID',
    device_id_label: 'Device ID',
    linked_at_label: 'Linked on',
    recovery_code_title: 'Recovery Code',
    recovery_code_desc: 'Note this code – it is shown only once. Use it to restore your profile on a new device.',
    recovery_code_saved: 'I have noted the code',
    pair_code_title: 'Pairing code for second device',
    pair_code_expires: 'Valid for 2 minutes',
    pair_code_input: 'Enter code from other device',
    pair_code_redeem: 'Redeem code',
    pair_code_cancel: 'Cancel',
    recover_title: 'Connect with recovery code',
    recover_input: 'Enter recovery code',
    recover_action: 'Connect',
    endpoint_label: 'Server endpoint',
    endpoint_placeholder: 'https://sync.example.com',
    endpoint_hint: 'Taken from Sync settings if configured.',
    creating: 'Creating profile…',
    linking: 'Linking…',
    error_no_endpoint: 'No sync server configured. Set endpoint under Diagnostics → Sync Token first.',
    copied: 'Copied',
    copy: 'Copy',
    list_profiles: 'Load profiles from server',
    list_profiles_refresh: 'Refresh list',
    switch_to_profile: 'Switch to this profile',
    switching: 'Switching profile…',
    profile_name_label: 'Profile name',
    offline_blocked: 'Profile switching is blocked while offline.',
    pre_sync_failed: 'Pre-switch sync failed. Check connectivity and retry.',
    switch_failed: 'Profile switching failed.',
    switch_bootstrap_failed: 'Profile switched but initial sync failed. Rollback applied.',
  },
} as const

type Lang = 'de' | 'en'

interface Props {
  language: Lang
}

function CopyButton({ text, label, labelCopied }: { text: string; label: string; labelCopied: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? labelCopied : label}
    </button>
  )
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4 text-xs">
      <span className="text-zinc-500 shrink-0">{label}</span>
      <span className="text-zinc-300 font-mono text-right break-all">{value}</span>
    </div>
  )
}

function getEndpointFromSettings(): string {
  try {
    const raw = localStorage.getItem('card-pwa-settings')
    if (!raw) return ''
    const parsed = JSON.parse(raw) as { sync?: { endpoint?: string } }
    return parsed?.sync?.endpoint?.trim() ?? ''
  } catch {
    return ''
  }
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
    default:
      return error
  }
}

export default function ProfileSyncSection({ language }: Props) {
  const t = STRINGS[language]
  const { profile, setProfile } = useSettings()

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null)
  const [recoveryConfirmed, setRecoveryConfirmed] = useState(false)
  const [pairCode, setPairCode] = useState<string | null>(null)
  const [pairExpiresAt, setPairExpiresAt] = useState<number | null>(null)
  const [redeemInput, setRedeemInput] = useState('')
  const [showRedeem, setShowRedeem] = useState(false)
  const [showRecover, setShowRecover] = useState(false)
  const [recoverInput, setRecoverInput] = useState('')
  const [endpointOverride, setEndpointOverride] = useState('')
  const [profiles, setProfiles] = useState<ServerProfileSummary[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [switchingUserId, setSwitchingUserId] = useState<string | null>(null)

  const effectiveEndpoint = endpointOverride.trim() || getEndpointFromSettings()

  const loadProfiles = async () => {
    if (!effectiveEndpoint) return
    setLoadingProfiles(true)
    const listed = await listServerProfiles(effectiveEndpoint, 20)
    if (!listed.ok) {
      setError(listed.error ?? t.switch_failed)
      setLoadingProfiles(false)
      return
    }
    setProfiles(listed.profiles ?? [])
    setLoadingProfiles(false)
  }

  useEffect(() => {
    if (!effectiveEndpoint || !navigator.onLine) return
    void loadProfiles()
  }, [effectiveEndpoint])

  const handleCreateProfile = async () => {
    if (!effectiveEndpoint) {
      setError(t.error_no_endpoint)
      return
    }
    setBusy(true)
    setError(null)
    const deviceId = getOrCreateDeviceId()
    const res = await createServerProfile(effectiveEndpoint, deviceId, navigator.userAgent.slice(0, 60))
    if (!res.ok || !res.userId || !res.profileToken) {
      setError(res.error ?? 'unknown_error')
      setBusy(false)
      return
    }

    const now = Date.now()
    const linked: ProfileRecord = {
      id: 'current',
      mode: 'linked',
      deviceId,
      userId: res.userId,
      profileToken: res.profileToken,
      endpoint: effectiveEndpoint,
      linkedAt: now,
      recoveryCodeShown: false,
      createdAt: now,
      updatedAt: now,
    }
    setProfile(linked)
    writeProfileHintCookie(linked.userId ?? '')
    setRecoveryCode(res.recoveryCode ?? null)
    setRecoveryConfirmed(false)
    setBusy(false)
  }

  const handleUnlink = async () => {
    if (!profile?.profileToken || !profile.endpoint) {
      const local = makeLocalProfile()
      setProfile(local)
      return
    }
    setBusy(true)
    await revokeDeviceToken(profile.endpoint, profile.profileToken)
    await clearSyncQueue()
    resetSyncPullState()
    const local = makeLocalProfile()
    setProfile(local)
    setBusy(false)
  }

  const handleIssuePairCode = async () => {
    if (!profile?.profileToken || !profile.endpoint) return
    setBusy(true)
    setError(null)
    const res = await issuePairingCode(profile.endpoint, profile.profileToken)
    if (!res.ok || !res.code) {
      setError(res.error ?? 'unknown_error')
      setBusy(false)
      return
    }
    setPairCode(res.code)
    setPairExpiresAt(res.expiresAt ?? null)
    setBusy(false)
  }

  const handleRedeemCode = async () => {
    if (!redeemInput.trim() || !effectiveEndpoint) return
    setBusy(true)
    setError(null)
    const deviceId = getOrCreateDeviceId()
    const res = await redeemPairingCode(effectiveEndpoint, redeemInput.trim(), deviceId, navigator.userAgent.slice(0, 60))
    if (!res.ok || !res.userId || !res.profileToken) {
      setError(res.error ?? 'unknown_error')
      setBusy(false)
      return
    }
    const now = Date.now()
    const linked: ProfileRecord = {
      id: 'current',
      mode: 'linked',
      deviceId,
      userId: res.userId,
      profileToken: res.profileToken,
      endpoint: effectiveEndpoint,
      linkedAt: now,
      recoveryCodeShown: false,
      createdAt: now,
      updatedAt: now,
    }
    setProfile(linked)
    writeProfileHintCookie(linked.userId ?? '')
    setShowRedeem(false)
    setRedeemInput('')
    setBusy(false)
  }

  const handleRecover = async () => {
    if (!recoverInput.trim() || !effectiveEndpoint) return
    setBusy(true)
    setError(null)
    const deviceId = getOrCreateDeviceId()
    const res = await recoverWithCode(effectiveEndpoint, recoverInput.trim(), deviceId, navigator.userAgent.slice(0, 60))
    if (!res.ok || !res.userId || !res.profileToken) {
      setError(res.error ?? 'unknown_error')
      setBusy(false)
      return
    }
    const now = Date.now()
    const linked: ProfileRecord = {
      id: 'current',
      mode: 'linked',
      deviceId,
      userId: res.userId,
      profileToken: res.profileToken,
      endpoint: effectiveEndpoint,
      linkedAt: now,
      recoveryCodeShown: true,
      createdAt: now,
      updatedAt: now,
    }
    setProfile(linked)
    writeProfileHintCookie(linked.userId ?? '')
    setShowRecover(false)
    setRecoverInput('')
    setBusy(false)
  }

  const handleSwitchToProfile = async (target: ServerProfileSummary) => {
    if (!effectiveEndpoint) {
      setError(t.error_no_endpoint)
      return
    }
    if (!navigator.onLine) {
      setError('offline_blocked')
      return
    }

    setError(null)
    setBusy(true)
    setSwitchingUserId(target.userId)
    const previousProfile = profile
    const rollbackSnapshot = await snapshotLocalStudyDataForRollback()

    if (profile?.mode === 'linked') {
      const preSyncOk = await runSyncCycleNow({ force: true })
      if (!preSyncOk) {
        setError('presync_failed')
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
    )

    if (!switched.ok || !switched.userId || !switched.profileToken) {
      setError(switched.error ?? 'switch_denied')
      setBusy(false)
      setSwitchingUserId(null)
      return
    }

    await clearSyncQueue()
    resetSyncPullState()
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
      setBusy(false)
      setSwitchingUserId(null)
      return
    }

    await loadProfiles()
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

      {/* Recovery code display (shown once after profile creation) */}
      {recoveryCode && !recoveryConfirmed && (
        <div className="bg-amber-950/50 border border-amber-700/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound size={15} className="text-amber-400 shrink-0" />
            <p className="text-sm font-semibold text-amber-300">{t.recovery_code_title}</p>
          </div>
          <p className="text-xs text-amber-200/80">{t.recovery_code_desc}</p>
          <div className="font-mono text-base tracking-widest text-amber-200 bg-amber-950/70 rounded px-3 py-2 text-center">
            {recoveryCode}
          </div>
          <div className="flex items-center justify-between">
            <CopyButton text={recoveryCode} label={t.copy} labelCopied={t.copied} />
            <button
              type="button"
              onClick={() => {
                setRecoveryConfirmed(true)
                if (profile) setProfile({ ...profile, recoveryCodeShown: true, updatedAt: Date.now() })
              }}
              className="text-xs bg-amber-600 hover:bg-amber-500 text-white rounded px-3 py-1.5 transition-colors"
            >
              {t.recovery_code_saved}
            </button>
          </div>
        </div>
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

      {/* Pairing code display */}
      {pairCode && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <QrCode size={14} className="text-zinc-400" />
            <p className="text-xs font-semibold text-zinc-300">{t.pair_code_title}</p>
          </div>

          <div className="font-mono text-xl tracking-widest text-white text-center py-1">{pairCode}</div>
          {pairExpiresAt && (
            <p className="text-xs text-zinc-500 text-center">
              {t.pair_code_expires} ({new Date(pairExpiresAt).toLocaleTimeString()})
            </p>
          )}
          <div className="flex justify-between items-center">
            <CopyButton text={pairCode} label={t.copy} labelCopied={t.copied} />
            <button
              type="button"
              onClick={() => { setPairCode(null); setPairExpiresAt(null) }}
              className="text-xs text-zinc-500 hover:text-white transition-colors"
            >
              {t.pair_code_cancel}
            </button>
          </div>
        </div>
      )}

      {/* Redeem pairing code */}
      {showRedeem && (
        <div className="space-y-2">
          <input
            type="text"
            value={redeemInput}
            onChange={e => setRedeemInput(e.target.value.toUpperCase())}
            placeholder={t.pair_code_input}
            maxLength={16}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder:text-zinc-600 font-mono tracking-widest uppercase"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleRedeemCode()}
              disabled={busy || !redeemInput.trim()}
              className="flex-1 bg-white text-black text-sm font-semibold rounded py-2 hover:bg-zinc-200 disabled:opacity-40 transition-colors"
            >
              {busy ? t.linking : t.pair_code_redeem}
            </button>
            <button
              type="button"
              onClick={() => { setShowRedeem(false); setRedeemInput('') }}
              className="px-4 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              {t.pair_code_cancel}
            </button>
          </div>
        </div>
      )}

      {/* Recovery flow */}
      {showRecover && (
        <div className="space-y-2">
          <input
            type="text"
            value={recoverInput}
            onChange={e => setRecoverInput(e.target.value)}
            placeholder={t.recover_input}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder:text-zinc-600 font-mono"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleRecover()}
              disabled={busy || !recoverInput.trim()}
              className="flex-1 bg-white text-black text-sm font-semibold rounded py-2 hover:bg-zinc-200 disabled:opacity-40 transition-colors"
            >
              {busy ? t.linking : t.recover_action}
            </button>
            <button
              type="button"
              onClick={() => { setShowRecover(false); setRecoverInput('') }}
              className="px-4 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              {t.pair_code_cancel}
            </button>
          </div>
        </div>
      )}

      {/* Endpoint input when not linked */}
      {!isLinked && !showRedeem && !showRecover && (
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">{t.endpoint_label}</label>
          <input
            type="url"
            value={endpointOverride}
            onChange={e => setEndpointOverride(e.target.value)}
            placeholder={effectiveEndpoint || t.endpoint_placeholder}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder:text-zinc-600"
          />
          {!endpointOverride && effectiveEndpoint && (
            <p className="text-xs text-zinc-600">{t.endpoint_hint}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {!!effectiveEndpoint && (
          <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-zinc-300">{t.list_profiles}</p>
              <button
                type="button"
                onClick={() => void loadProfiles()}
                disabled={busy || loadingProfiles || !navigator.onLine}
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
                      disabled={busy || isCurrent || isSwitchingThis || !navigator.onLine}
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

        {!isLinked && !showRedeem && !showRecover && (
          <>
            <button
              type="button"
              onClick={() => void handleCreateProfile()}
              disabled={busy || !effectiveEndpoint}
              className="w-full flex items-center justify-center gap-2 bg-white text-black text-sm font-semibold rounded-lg py-2.5 hover:bg-zinc-200 disabled:opacity-40 transition-colors"
            >
              {busy ? <RefreshCw size={14} className="animate-spin" /> : <User size={14} />}
              {busy ? t.creating : t.create_profile}
            </button>
            <button
              type="button"
              onClick={() => setShowRedeem(true)}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-white border border-zinc-800 rounded-lg py-2.5 transition-colors"
            >
              <LogIn size={14} />
              {t.pair_code_input}
            </button>
            <button
              type="button"
              onClick={() => setShowRecover(true)}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors py-2"
            >
              <KeyRound size={13} />
              {t.recover_title}
            </button>
          </>
        )}

        {isLinked && (
          <>
            <button
              type="button"
              onClick={() => void handleIssuePairCode()}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 text-sm text-zinc-300 hover:text-white border border-zinc-800 rounded-lg py-2.5 transition-colors"
            >
              <Link size={14} />
              {t.link_device}
            </button>
            <button
              type="button"
              onClick={() => void handleUnlink()}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-red-400 transition-colors py-2"
            >
              <Unlink size={13} />
              {t.unlink}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
