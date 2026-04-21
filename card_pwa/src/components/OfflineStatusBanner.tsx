import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { AlertCircle, Wifi, WifiOff, X } from 'lucide-react'
import { STRINGS, useSettings } from '../contexts/SettingsContext'
import { offlineStatusService, type OnlineStatus } from '../services/OfflineStatusService'
import { getSyncQueuePendingCount } from '../services/syncQueue'

/**
 * OfflineStatus: Zeigt Netzwerkstatus an
 */
export default function OfflineStatusBanner() {
  const { settings } = useSettings()
  const t = STRINGS[settings.language]
  const prefersReducedMotion = useReducedMotion()
  const [status, setStatus] = useState<OnlineStatus>('online')
  const [pendingSyncCount, setPendingSyncCount] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Initialwert
    setStatus(offlineStatusService.getStatus())

    const refreshPending = async () => {
      try {
        setPendingSyncCount(await getSyncQueuePendingCount())
      } catch {
        setPendingSyncCount(0)
      }
    }

    void refreshPending()
    const interval = window.setInterval(() => {
      void refreshPending()
    }, 3000)

    let hideTimer: number | undefined

    // Subscribe zu Status-Änderungen
    const unsubscribe = offlineStatusService.subscribe(newStatus => {
      setStatus(newStatus)
      void refreshPending()

      if (newStatus === 'online') {
        setVisible(false)
        if (hideTimer) {
          window.clearTimeout(hideTimer)
          hideTimer = undefined
        }
        return
      }

      setVisible(true)
      if (hideTimer) {
        window.clearTimeout(hideTimer)
      }
      hideTimer = window.setTimeout(() => {
        setVisible(false)
      }, 4500)
    })

    return () => {
      clearInterval(interval)
      if (hideTimer) {
        window.clearTimeout(hideTimer)
      }
      unsubscribe()
    }
  }, [])

  // Zeige nur kurz als Popup, nicht dauerhaft als Banner.
  if (status === 'online' || !visible) {
    return null
  }

  const isOffline = status === 'offline'

  return (
    <AnimatePresence>
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: prefersReducedMotion ? 0.18 : 0.24, ease: 'easeOut' }}
        className={`fixed inset-x-4 bottom-[calc(var(--safe-bottom)+5.75rem)] z-40 mx-auto flex w-auto max-w-md items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-md transition-all duration-200 ease-out sm:inset-x-auto sm:right-4 sm:mx-0 ${
          isOffline
            ? 'border-rose-500/25 bg-rose-950/78'
            : 'border-amber-500/25 bg-amber-950/78'
        }`}
        role="status"
        aria-live="polite"
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {isOffline ? (
            <>
              <WifiOff size={18} className="mt-0.5 shrink-0 text-rose-300" />
              <div className="min-w-0 text-sm">
                <p className="font-medium text-rose-100">{t.offline_title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-rose-200/75">
                  {t.offline_description}
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-300" />
              <div className="min-w-0 text-sm">
                <p className="font-medium text-amber-100">{t.slow_connection_title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-amber-200/75">
                  {t.slow_connection_description}
                </p>
              </div>
            </>
          )}
        </div>

        {pendingSyncCount > 0 && (
          <div className="shrink-0 rounded-full border border-white/12 bg-white/8 px-2 py-1 text-[11px] text-white/75">
            {settings.language === 'de'
              ? `${pendingSyncCount} Sync`
              : `${pendingSyncCount} sync`}
          </div>
        )}

        {isOffline && (
          <motion.div
            aria-hidden="true"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: prefersReducedMotion ? 0 : 2.4, repeat: prefersReducedMotion ? 0 : Infinity, ease: 'linear' }}
            className="shrink-0 text-rose-300"
          >
            <Wifi size={16} />
          </motion.div>
        )}

        <button
          type="button"
          onClick={() => setVisible(false)}
          className="shrink-0 rounded-full p-1.5 text-white/55 transition hover:bg-white/8 hover:text-white"
          aria-label={settings.language === 'de' ? 'Hinweis schließen' : 'Dismiss notice'}
        >
          <X size={14} />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
