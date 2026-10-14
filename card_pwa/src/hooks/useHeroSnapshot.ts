/**
 * AI_CONTEXT: Hook für den Helden-Zustand (Gold, Etagen, Ausrüstung, Skilltree). Lädt beim Mounten und
 * neu, wenn sich die Ausrüstung ändert. Das Level kommt aus dem bestehenden Gamification-Profil.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { HERO_LOADOUT_CHANGED_EVENT } from '../db/queries/heroLoadout'
import { getHeroSnapshot, type HeroSnapshot } from '../db/queries/heroState'

export function useHeroSnapshot(level: number, nextDayStartsAt: number, enabled = true) {
  const [snapshot, setSnapshot] = useState<HeroSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const requestRef = useRef(0)

  const load = useCallback(async () => {
    const request = requestRef.current + 1
    requestRef.current = request
    try {
      const next = await getHeroSnapshot({ level, nextDayStartsAt })
      if (requestRef.current === request) {
        setSnapshot(next)
        setError(null)
      }
    } catch (e) {
      if (requestRef.current === request) setError(e instanceof Error ? e.message : String(e))
    }
  }, [level, nextDayStartsAt])

  useEffect(() => {
    if (!enabled) return undefined
    void load()
    const onChanged = () => { void load() }
    window.addEventListener(HERO_LOADOUT_CHANGED_EVENT, onChanged)
    return () => {
      requestRef.current += 1
      window.removeEventListener(HERO_LOADOUT_CHANGED_EVENT, onChanged)
    }
  }, [enabled, load])

  return { snapshot, error, reload: load }
}
