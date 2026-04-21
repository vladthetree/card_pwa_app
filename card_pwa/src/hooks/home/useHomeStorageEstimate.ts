import { useEffect, useState } from 'react'

export function useHomeStorageEstimate() {
  const [storageUsedBytes, setStorageUsedBytes] = useState<number | null>(null)
  const [storageQuotaBytes, setStorageQuotaBytes] = useState<number | null>(null)
  const [storageEstimateUnavailable, setStorageEstimateUnavailable] = useState(false)

  useEffect(() => {
    let active = true

    if (!navigator.storage?.estimate) {
      setStorageEstimateUnavailable(true)
      return () => {
        active = false
      }
    }

    navigator.storage.estimate().then(estimate => {
      if (!active) return
      const usage = estimate.usage ?? 0
      const quota = estimate.quota ?? 0
      setStorageUsedBytes(usage)
      setStorageQuotaBytes(quota)
      if (quota <= 0) setStorageEstimateUnavailable(true)
    }).catch(() => {
      if (!active) return
      setStorageEstimateUnavailable(true)
    })

    return () => {
      active = false
    }
  }, [])

  return {
    storageUsedBytes,
    storageQuotaBytes,
    storageEstimateUnavailable,
  }
}
