import { useEffect } from 'react'
import { installGlobalErrorLogging } from '../services/errorLog'

export function useGlobalErrorLogging() {
  useEffect(() => {
    return installGlobalErrorLogging()
  }, [])
}
