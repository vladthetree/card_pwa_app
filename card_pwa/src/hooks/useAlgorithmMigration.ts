import { useEffect } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import { initializeAlgorithmMigration } from '../services/AlgorithmMigrationService'

export function useAlgorithmMigration() {
  const { settings, isSettingsHydrated, setAlgorithmMigrating } = useSettings()

  useEffect(() => {
    if (!isSettingsHydrated) return

    let isMounted = true

    const runMigration = async () => {
      setAlgorithmMigrating(true)
      try {
        await initializeAlgorithmMigration(settings.algorithm)
      } catch (err) {
        console.error('Failed to initialize algorithm migration:', err)
      } finally {
        if (isMounted) {
          setAlgorithmMigrating(false)
        }
      }
    }

    void runMigration()

    return () => {
      isMounted = false
    }
  }, [isSettingsHydrated, settings.algorithm, setAlgorithmMigrating])
}
