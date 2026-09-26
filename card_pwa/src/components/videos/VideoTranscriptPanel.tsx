/**
 * AI_CONTEXT:
 * Role: Read-along transcript overlay for the active Messer video (clean professormesser.com text, no timestamps).
 * Used by: VideosView study bar ("Transkript" button).
 * Important: Pure display — it must not interact with FSRS, notes, or progress; a missing transcript is a normal state.
 */
import { Loader2 } from 'lucide-react'
import { useMesserVideoTranscript } from '../../hooks/useMesserVideoTranscript'
import { Dialog } from '../../ui/overlays/Dialog'

const COPY = {
  de: {
    title: 'Transkript',
    loading: 'Transkript wird geladen …',
    missing: 'Zu diesem Video liegt kein Transkript vor.',
    source: 'Redaktionelles Transkript (professormesser.com)',
    close: 'Schließen',
  },
  en: {
    title: 'Transcript',
    loading: 'Loading transcript …',
    missing: 'No transcript available for this video.',
    source: 'Editorial transcript (professormesser.com)',
    close: 'Close',
  },
} as const

interface Props {
  /** Playlist-Index des aktiven Videos (Schlüssel der Transkript-Assets). */
  videoIndex: number
  objective: string
  videoTitle: string
  language: 'de' | 'en'
  onClose: () => void
}

export default function VideoTranscriptPanel({ videoIndex, objective, videoTitle, language, onClose }: Props) {
  const copy = COPY[language]
  const { status, transcript } = useMesserVideoTranscript(videoIndex)

  return (
    <Dialog
      title={copy.title}
      subtitle={`${objective} · ${videoTitle}`}
      closeLabel={copy.close}
      closeButtonTestId="video-transcript-close"
      onClose={() => onClose()}
      size="lg"
      className="overflow-hidden p-0"
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" data-testid="video-transcript-body">
          {status === 'loading' && (
            <div className="flex items-center justify-center gap-2 py-12 font-mono text-[12px] text-zinc-500">
              <Loader2 size={16} className="animate-spin" />
              {copy.loading}
            </div>
          )}

          {status === 'missing' && (
            <div className="py-10 text-center font-mono text-[12px] text-zinc-500">{copy.missing}</div>
          )}

          {status === 'ready' && transcript && (
            <div className="flex flex-col gap-3">
              {transcript.paragraphs.map((paragraph, i) => (
                <p key={i} className="font-mono text-[13px] leading-relaxed text-zinc-300">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
      </div>

      <div className="border-t border-[#18181b] px-4 py-2.5">
        <p className="font-mono text-[10px] leading-relaxed text-zinc-600">{copy.source}</p>
      </div>
    </Dialog>
  )
}
