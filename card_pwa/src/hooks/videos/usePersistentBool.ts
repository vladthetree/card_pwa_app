/**
 * AI_CONTEXT: Gerätelokal gemerkter Boolean (Panel auf/zu) — überlebt Reloads.
 * Used by: VideosView (studyBarOpen, coursePanelOpen) and useVideoTagPanels (showTagSidebar).
 */
import { useEffect, useState } from 'react'

export function usePersistentBool(key: string, fallback: boolean): [boolean, (next: boolean | ((prev: boolean) => boolean)) => void] {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? fallback : raw === '1'
    } catch {
      return fallback
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, value ? '1' : '0')
    } catch {
      /* privater Modus o. Ä. — Zustand bleibt für die Session erhalten */
    }
  }, [key, value])
  return [value, setValue]
}
