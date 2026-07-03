/**
 * AI_CONTEXT:
 * Role: Settings-side tag browser for video-note tags; searches profile-scoped tags and opens the same collection overlay used in video mode.
 * Used by: SettingsModal/profile tools where the user wants a Second-Brain tag index outside the video screen.
 * Important: It currently reads video-note tags only; cross-card links are surfaced after opening TagCollectionPanel.
 */
import { useMemo, useState } from 'react'
import { Hash, Search } from 'lucide-react'
import { useAllVideoNoteTags } from '../hooks/useVideoNotes'
import TagCollectionPanel from './videos/TagCollectionPanel'

/**
 * Tag-Browser in den Einstellungen: listet alle im aktiven Profil vergebenen
 * Tags und öffnet pro Tag die Sammlung (alle Inhalte + Quelle, Video/Karten).
 */

const COPY = {
  de: {
    intro: 'Alle Tags, die du in Video-Notizen vergeben hast. Tippe einen Tag an, um alle gesammelten Inhalte dazu zu sehen.',
    search: 'Tag suchen …',
    empty: 'Noch keine Tags vergeben. Setze in den Video-Notizen Tags mit #tag.',
    noMatch: 'Kein Tag passt zur Suche.',
  },
  en: {
    intro: 'All tags you used in video notes. Tap a tag to see every collected item for it.',
    search: 'Search tag …',
    empty: 'No tags yet. Add tags as #tag in your video notes.',
    noMatch: 'No tag matches the search.',
  },
} as const

interface Props {
  language: 'de' | 'en'
  profileId: string
}

export default function TagBrowserSection({ language, profileId }: Props) {
  const copy = COPY[language]
  const allTags = useAllVideoNoteTags(profileId)
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allTags
    return allTags.filter(tag => tag.toLowerCase().includes(q))
  }, [allTags, query])

  return (
    <div className="pt-5 space-y-3">
      <p className="text-xs text-zinc-500 leading-relaxed">{copy.intro}</p>

      {allTags.length === 0 ? (
        <p className="text-xs text-zinc-600 leading-relaxed">{copy.empty}</p>
      ) : (
        <>
          <div className="relative">
            <Search size={14} strokeWidth={1.5} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={copy.search}
              aria-label={copy.search}
              data-testid="tag-browser-search"
              className="w-full rounded-ds border border-[#1f1f23] bg-[#0c0c0c] py-2 pl-8 pr-2.5 font-mono text-[12px] text-zinc-100 placeholder:text-zinc-600 focus:border-[#3f3f46] focus:outline-none"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="text-xs text-zinc-600">{copy.noMatch}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {filtered.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(tag)}
                  data-testid={`tag-browser-tag-${tag}`}
                  className="flex items-center gap-1 rounded-ds border border-sky-500/30 bg-sky-500/10 px-2 py-1 font-mono text-[11px] text-sky-200 transition-colors hover:border-sky-400/70 hover:text-sky-100"
                >
                  <Hash size={10} strokeWidth={2} className="opacity-60" />
                  {tag}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {activeTag && (
        <TagCollectionPanel
          profileId={profileId}
          tag={activeTag}
          language={language}
          onClose={() => setActiveTag(null)}
          onOpenTag={setActiveTag}
        />
      )}
    </div>
  )
}
