/**
 * AI_CONTEXT: Shared Dexie liveQuery subscription hook — subscribe/unsubscribe
 * boilerplate factored out of useVideoNotes.ts and useVideoTags.ts, which each
 * had several near-identical copies of this pattern.
 */
import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'

export function useLiveQueryValue<T>(
  factory: () => T | Promise<T>,
  deps: unknown[],
  fallback: T,
  options: { skip?: boolean; resetOnError?: boolean } = {},
): T {
  const { skip = false, resetOnError = true } = options
  const [value, setValue] = useState<T>(fallback)

  useEffect(() => {
    if (skip) {
      setValue(fallback)
      return
    }
    const subscription = liveQuery(factory).subscribe({
      next: result => setValue(result),
      error: () => { if (resetOnError) setValue(fallback) },
    })
    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, resetOnError, ...deps])

  return value
}
