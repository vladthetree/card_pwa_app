/**
 * AI_CONTEXT:
 * Role: The single most destructive Settings action, isolated on purpose — wipes all
 * app-owned cookies, localStorage/sessionStorage keys, caches, service-worker
 * registrations, AND all 4 app-owned IndexedDB databases (app, legacy app, sync
 * queue, legacy sync queue). Kept in its own file so editing neighboring
 * data-maintenance UI (SettingsDataSection) cannot accidentally change this logic.
 * Used by: SettingsDataSection.
 * Important: always goes through the passed-down confirm dialog first — never wire
 * this button directly to an onClick that skips setConfirmModal.
 */
import { useSettings, STRINGS } from '../../contexts/SettingsContext'
import { UI_TOKENS } from '../../constants/ui'
import { db } from '../../db'
import { BACKUP_METADATA, DATABASE_NAMES } from '../../constants/appIdentity'
import { closeSyncQueueDatabase } from '../../services/syncQueue'
import { unregisterAppServiceWorkers, deleteAppCaches, APP_STORAGE_PREFIXES } from './settingsResetHelpers'

const APP_COOKIE_PREFIXES = ['card_pwa_', 'anki_pwa_', 'card-pwa-', 'anki-pwa-'] as const
const APP_STORAGE_EXACT_KEYS = [BACKUP_METADATA.marker, BACKUP_METADATA.legacyMarker] as const

interface ConfirmModalRequest {
  title: string
  message: string
  confirmLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void
}

interface Props {
  setConfirmModal: (request: ConfirmModalRequest | null) => void
  setLocalDataStatus: (status: string | null) => void
}

function isAppStorageKey(key: string) {
  return (
    APP_STORAGE_EXACT_KEYS.includes(key as typeof APP_STORAGE_EXACT_KEYS[number]) ||
    APP_STORAGE_PREFIXES.some(prefix => key.startsWith(prefix))
  )
}

function clearStorageArea(storage: Storage) {
  const keys: string[] = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key && isAppStorageKey(key)) {
      keys.push(key)
    }
  }
  keys.forEach(key => storage.removeItem(key))
}

function deleteCookieEverywhere(name: string) {
  const expires = 'Thu, 01 Jan 1970 00:00:00 GMT'
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  const hostParts = window.location.hostname.split('.').filter(Boolean)
  const domains = new Set<string>([''])
  for (let index = 0; index < hostParts.length - 1; index += 1) {
    domains.add(`.${hostParts.slice(index).join('.')}`)
  }

  const pathParts = window.location.pathname.split('/').filter(Boolean)
  const paths = new Set<string>(['/'])
  let currentPath = ''
  for (const part of pathParts) {
    currentPath += `/${part}`
    paths.add(currentPath)
  }

  domains.forEach(domain => {
    paths.forEach(path => {
      document.cookie = `${encodeURIComponent(name)}=; expires=${expires}; max-age=0; path=${path}${domain ? `; domain=${domain}` : ''}; SameSite=Lax${secure}`
    })
  })
}

function deleteAccessibleCookies() {
  document.cookie
    .split(';')
    .map(cookie => cookie.split('=')[0]?.trim())
    .filter((name): name is string => (
      Boolean(name) &&
      APP_COOKIE_PREFIXES.some(prefix => name.startsWith(prefix))
    ))
    .forEach(deleteCookieEverywhere)
}

function deleteIndexedDbDatabase(name: string) {
  return new Promise<void>(resolve => {
    if (!('indexedDB' in window)) {
      resolve()
      return
    }

    const request = indexedDB.deleteDatabase(name)
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
    request.onblocked = () => resolve()
  })
}

export function SettingsPwaFullReset({ setConfirmModal, setLocalDataStatus }: Props) {
  const { settings } = useSettings()
  const t = STRINGS[settings.language]

  const resetEntirePwaState = () => {
    setConfirmModal({
      title: t.pwa_full_reset_title,
      message: t.pwa_full_reset_confirm,
      confirmLabel: t.pwa_full_reset_action,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await unregisterAppServiceWorkers()
          await deleteAppCaches()

          try {
            db.close()
            closeSyncQueueDatabase()
          } catch {
            // best effort: continue clearing browser-owned storage
          }

          deleteAccessibleCookies()
          clearStorageArea(localStorage)
          clearStorageArea(sessionStorage)

          await Promise.all([
            deleteIndexedDbDatabase(DATABASE_NAMES.app),
            deleteIndexedDbDatabase(DATABASE_NAMES.legacyApp),
            deleteIndexedDbDatabase(DATABASE_NAMES.syncQueue),
            deleteIndexedDbDatabase(DATABASE_NAMES.legacySyncQueue),
          ])

          setLocalDataStatus(t.pwa_full_reset_done)
          window.setTimeout(() => {
            window.location.replace(window.location.origin + window.location.pathname)
          }, 300)
        } catch {
          setLocalDataStatus(t.pwa_full_reset_failed)
        }
      },
    })
  }

  return (
    <div className="rounded-ds-xl border border-rose-400/20 bg-rose-500/10 p-3 space-y-2">
      <p className="text-xs font-semibold text-rose-100">{t.pwa_full_reset_title}</p>
      <p className="text-xs text-rose-100/70 leading-relaxed">{t.pwa_full_reset_description}</p>
      <button
        type="button"
        onClick={() => { void resetEntirePwaState() }}
        className={`${UI_TOKENS.button.ghost} w-full py-2 border-rose-400/40 text-rose-100 hover:text-white hover:bg-rose-500/15`}
      >
        {t.pwa_full_reset_action}
      </button>
    </div>
  )
}
