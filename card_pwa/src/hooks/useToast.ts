
import { useCallback } from 'react'

export type ToastVariant = 'info' | 'success' | 'error' | 'warning'

export interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
  durationMs?: number
}

type Listener = (toasts: ToastItem[]) => void

// Module-level singleton so any component can push toasts without prop drilling
let toasts: ToastItem[] = []
const listeners = new Set<Listener>()

function notify() {
  for (const fn of listeners) fn([...toasts])
}

export const toast = {
  show(message: string, variant: ToastVariant = 'info', durationMs = 3500): string {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    toasts = [...toasts, { id, message, variant, durationMs }]
    notify()
    if (durationMs > 0) {
      setTimeout(() => toast.dismiss(id), durationMs)
    }
    return id
  },
  dismiss(id: string) {
    toasts = toasts.filter(t => t.id !== id)
    notify()
  },
  success: (msg: string, ms?: number) => toast.show(msg, 'success', ms),
  error:   (msg: string, ms?: number) => toast.show(msg, 'error', ms ?? 5000),
  warning: (msg: string, ms?: number) => toast.show(msg, 'warning', ms),
}

export function useToastStore() {
  const subscribe = useCallback((fn: Listener) => {
    fn([...toasts])
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  }, [])
  return { subscribe }
}
