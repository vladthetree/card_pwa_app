/**
 * AI_CONTEXT: React hook for use Global Error Logging; encapsulates browser, persistence, sync, layout, or learning state for UI components.
 */
import { useEffect } from 'react'
import { installGlobalErrorLogging } from '../services/errorLog'

export function useGlobalErrorLogging() {
  useEffect(() => {
    return installGlobalErrorLogging()
  }, [])
}
