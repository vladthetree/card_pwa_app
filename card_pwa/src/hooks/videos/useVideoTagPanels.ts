/**
 * AI_CONTEXT:
 * Role: Owns the tag-related overlay state for VideosView — the desktop tag
 * sidebar's visibility, the mobile tag bottom-sheet, and which tag's detail page
 * (activeTag) is showing. Kept as its own hook (not folded into VideosView's
 * video-navigation state) so future tag work (Video-Tags Obsidian-Ausbau, phase 5+)
 * has one obvious place to extend instead of scattered state.
 * Used by: VideosView.
 * Important: does not know about video playback — openObjectiveFromTag/
 * openObjectiveAtTime (which need to both switch videos AND clear activeTag) stay
 * in VideosView, calling setActiveTag from here.
 */
import { useState } from 'react'
import { usePersistentBool } from './usePersistentBool'

export function useVideoTagPanels(): {
  activeTag: string | null
  setActiveTag: (tag: string | null) => void
  showTagSidebar: boolean
  setShowTagSidebar: (next: boolean | ((prev: boolean) => boolean)) => void
  tagSheetOpen: boolean
  setTagSheetOpen: (next: boolean) => void
  openTagFromSidebar: (tag: string) => void
} {
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [showTagSidebar, setShowTagSidebar] = usePersistentBool('card-pwa-video-tags-open-v2', false)
  const [tagSheetOpen, setTagSheetOpen] = useState(false)

  // Tag aus der Sidebar öffnen → Tag-Seite; auf Handy das Bottom-Sheet schließen.
  const openTagFromSidebar = (tag: string) => {
    setActiveTag(tag)
    setTagSheetOpen(false)
  }

  return { activeTag, setActiveTag, showTagSidebar, setShowTagSidebar, tagSheetOpen, setTagSheetOpen, openTagFromSidebar }
}
