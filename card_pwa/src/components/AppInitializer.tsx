import { useEffect } from 'react'
import { db } from '../db'
import { getRuntimeTarget } from '../env'
import OfflineStatusBanner from './OfflineStatusBanner'
import { useStoragePersistence } from '../hooks/useStoragePersistence'
import { useAppBadge } from '../hooks/useAppBadge'
import { useAlgorithmMigration } from '../hooks/useAlgorithmMigration'
import { useBacklogSmoother } from '../hooks/useBacklogSmoother'
import { useGlobalErrorLogging } from '../hooks/useGlobalErrorLogging'
import { useSyncRuntime } from '../hooks/useSyncRuntime'
import { useServiceWorkerConfig } from '../hooks/useServiceWorkerConfig'
import { useWebPushSubscription } from '../hooks/useWebPushSubscription'

const IS_DEV = import.meta.env.DEV

interface Props {
  children: React.ReactNode
}

/**
 * AppInitializer: Initialisiert PWA und App-Dienste beim Start
 * - Initialisiert Algorithm-Migration
 * - Zeigt Offline-Status an
 */
export default function AppInitializer({ children }: Props) {
  useStoragePersistence()
  useAppBadge()
  useAlgorithmMigration()
  useBacklogSmoother()
  useGlobalErrorLogging()
  useSyncRuntime()
  useServiceWorkerConfig()
  useWebPushSubscription()

  useEffect(() => {
    if (!IS_DEV) return

    const runtimeTarget = getRuntimeTarget()
    console.info(`[Runtime] target=${runtimeTarget}`)

    void db
      .open()
      .then(() => {
        console.info(`[DB] open ok (name=${db.name}, verno=${db.verno})`)
      })
      .catch(err => {
        console.error('[DB] open failed', err)
      })
  }, [])

  return (
    <>
      {children}

      {/* Offline Status Banner */}
      <OfflineStatusBanner />
    </>
  )
}
