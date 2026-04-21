import { useState } from 'react'
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
} from '../services/profileService'
import { resetSyncPullState } from '../services/syncPull'
import { clearSyncQueue } from '../services/syncQueue'

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

  const effectiveEndpoint = endpointOverride.trim() || getEndpointFromSettings()

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
    setShowRecover(false)
    setRecoverInput('')
    setBusy(false)
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
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/40 rounded px-3 py-2">{error}</p>
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
