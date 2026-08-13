/**
 * AI_CONTEXT:
 * Role: Home export command hook. Keeps backup/export side effects out of the
 * HomeView controller while preserving its public return shape.
 */
import { useCallback, useMemo, useState } from 'react'
import { exportDbBackupAsCsv, exportDbBackupAsJson, exportDbBackupAsTxt } from '../../services/dbBackup'

export function useHomeExport(selectedDeckId: 'all' | string) {
  const [isExporting, setIsExporting] = useState(false)
  const selectedDeckIds = useMemo(
    () => (selectedDeckId === 'all' ? undefined : [selectedDeckId]),
    [selectedDeckId],
  )

  const runExport = useCallback(async (format: 'txt' | 'csv' | 'json', onDone: () => void) => {
    try {
      setIsExporting(true)
      if (format === 'txt') {
        await exportDbBackupAsTxt({ deckIds: selectedDeckIds })
      } else if (format === 'csv') {
        await exportDbBackupAsCsv({ deckIds: selectedDeckIds })
      } else {
        await exportDbBackupAsJson({ deckIds: selectedDeckIds })
      }
      onDone()
    } finally {
      setIsExporting(false)
    }
  }, [selectedDeckIds])

  return {
    isExporting,
    exportTxt: runExport.bind(null, 'txt'),
    exportCsv: runExport.bind(null, 'csv'),
    exportJson: runExport.bind(null, 'json'),
  }
}

