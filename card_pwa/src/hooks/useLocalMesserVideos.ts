/**
 * AI_CONTEXT:
 * Role: React hook that merges server video manifest, IndexedDB offline downloads, queue progress, and playable online/offline source URLs.
 * Used by: VideosView for catalog, chapter download, offline playback, and server-unreachable states.
 * Important: Downloads run sequentially to protect device storage and the Pi server; metadata and Blob access are deliberately separated.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { liveQuery } from 'dexie'
import { db, type VideoDownloadRecord } from '../db'
import { saveVideoBlob, getVideoBlob, deleteVideoDownload } from '../db/queries'
import {
  buildLocalVideoManifest,
  groupLocalVideosByObjective,
  localVideoUrl,
  type LocalVideoMeta,
} from '../utils/localVideoManifest'
import { selectDownloadsToEnqueue, summarizeDownloads } from '../utils/videoDownloadQueue'

/**
 * Selbst gehostete Lernvideos (Pi) statt YouTube-Embed. Das Manifest (welche
 * Videos existieren) kommt vom Server; Offline-Kopien liegen in IndexedDB. Beide
 * Quellen werden gemischt, damit heruntergeladene Videos auch ohne Netz
 * erscheinen und abspielbar bleiben.
 */

const MANIFEST_URL = '/media/messer/index.json'

export type LocalVideoStatus = 'loading' | 'ready' | 'unreachable'

export interface LocalVideoItem extends LocalVideoMeta {
  downloaded: boolean
  /** 0..1, solange dieser Download aktiv läuft; sonst undefined. */
  progress?: number
  /** In der Warteschlange (Kapitel-Download), aber noch nicht gestartet. */
  queued?: boolean
}

export type DownloadError = 'quota' | 'network' | null

export interface LocalVideoObjectiveGroup {
  objective: string
  domain: number
  videos: LocalVideoItem[]
}

export interface DomainDownloadStats {
  total: number
  done: number
  pending: LocalVideoItem[]
  active: boolean
}

/** Aggregierter Offline-Status eines Kapitels (Domain). */
export function domainDownloadStats(groups: LocalVideoObjectiveGroup[]): DomainDownloadStats {
  const videos = groups.flatMap(group => group.videos)
  const summary = summarizeDownloads(videos)
  return {
    total: summary.total,
    done: summary.done,
    active: summary.active,
    pending: videos.filter(video => !video.downloaded && video.progress === undefined && !video.queued),
  }
}

interface DownloadsState {
  byFile: Map<string, VideoDownloadRecord>
  totalBytes: number
}

function useDownloads(): DownloadsState {
  const [state, setState] = useState<DownloadsState>(() => ({ byFile: new Map(), totalBytes: 0 }))
  useEffect(() => {
    const sub = liveQuery(() => db.videoDownloads.toArray()).subscribe({
      next: rows => {
        const byFile = new Map<string, VideoDownloadRecord>()
        let totalBytes = 0
        for (const row of rows) {
          byFile.set(row.file, row)
          totalBytes += row.size || 0
        }
        setState({ byFile, totalBytes })
      },
      error: () => {},
    })
    return () => sub.unsubscribe()
  }, [])
  return state
}

export function useLocalMesserVideos() {
  const [serverFiles, setServerFiles] = useState<string[] | null>(null)
  const [status, setStatus] = useState<LocalVideoStatus>('loading')
  const [progressByFile, setProgressByFile] = useState<Record<string, number>>({})
  const [queuedFiles, setQueuedFiles] = useState<string[]>([])
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<DownloadError>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const downloads = useDownloads()

  // Sequentielle Download-Warteschlange (plattformunabhängig: fetch-Stream →
  // Blob → IndexedDB). Bewusst nacheinander, damit ein ganzes Kapitel den Pi und
  // den Gerätespeicher nicht mit parallelen ~50–100 MB-Requests überlastet.
  const queueRef = useRef<LocalVideoMeta[]>([])
  const runningRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const activeFileRef = useRef<string | null>(null)
  const downloadsRef = useRef(downloads.byFile)
  useEffect(() => {
    downloadsRef.current = downloads.byFile
  }, [downloads.byFile])

  // Manifest vom Server laden (kann offline fehlschlagen → 'unreachable').
  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    fetch(MANIFEST_URL, { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { files?: unknown }) => {
        if (cancelled) return
        const files = Array.isArray(data.files) ? data.files.filter((f): f is string => typeof f === 'string') : []
        setServerFiles(files)
        setStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setServerFiles(null)
        setStatus('unreachable')
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const retry = useCallback(() => setReloadKey(k => k + 1), [])

  // Server-Dateien ∪ heruntergeladene Dateien → vollständige Liste.
  const groups = useMemo<LocalVideoObjectiveGroup[]>(() => {
    const files = new Set<string>(serverFiles ?? [])
    for (const file of downloads.byFile.keys()) files.add(file)
    const manifest = buildLocalVideoManifest(Array.from(files))
    const byObjective = groupLocalVideosByObjective(manifest)
    const queuedSet = new Set(queuedFiles)

    const result: LocalVideoObjectiveGroup[] = []
    for (const [objective, videos] of byObjective) {
      result.push({
        objective,
        domain: videos[0].domain,
        videos: videos.map(meta => ({
          ...meta,
          downloaded: downloads.byFile.has(meta.file),
          progress: progressByFile[meta.file],
          queued: queuedSet.has(meta.file),
        })),
      })
    }
    result.sort((a, b) => a.objective.localeCompare(b.objective, undefined, { numeric: true }))
    return result
  }, [serverFiles, downloads.byFile, progressByFile, queuedFiles])

  // Eine Datei laden (Streaming mit Fortschritt; Fallback ohne Stream-Reader für
  // ältere Engines → bleibt plattformunabhängig). Wirft bei Abbruch/Quota/HTTP.
  const downloadOne = useCallback(async (meta: LocalVideoMeta, signal: AbortSignal) => {
    setProgressByFile(prev => ({ ...prev, [meta.file]: 0 }))
    try {
      const res = await fetch(localVideoUrl(meta.file), { cache: 'no-store', signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      let blob: Blob
      if (res.body && typeof res.body.getReader === 'function') {
        const total = Number(res.headers.get('Content-Length')) || 0
        const reader = res.body.getReader()
        const chunks: BlobPart[] = []
        let received = 0
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          if (value) {
            chunks.push(value)
            received += value.length
            if (total > 0) setProgressByFile(prev => ({ ...prev, [meta.file]: received / total }))
          }
        }
        blob = new Blob(chunks, { type: 'video/mp4' })
      } else {
        // Kein ReadableStream (sehr alte Browser): ganzer Blob, ohne Fortschritt.
        blob = await res.blob()
      }

      await saveVideoBlob({ file: meta.file, objective: meta.objective, title: meta.title, blob })
    } finally {
      setProgressByFile(prev => {
        const next = { ...prev }
        delete next[meta.file]
        return next
      })
    }
  }, [])

  // Warteschlange sequentiell abarbeiten.
  const processQueue = useCallback(async () => {
    if (runningRef.current) return
    runningRef.current = true
    try {
      // Persistenten Speicher anfordern, damit iOS die Offline-Kopien nicht verdrängt.
      try { await navigator.storage?.persist?.() } catch { /* best effort */ }

      while (queueRef.current.length > 0) {
        const meta = queueRef.current[0]
        queueRef.current = queueRef.current.slice(1)
        setQueuedFiles(queueRef.current.map(m => m.file))

        if (downloadsRef.current.has(meta.file)) continue

        activeFileRef.current = meta.file
        setActiveFile(meta.file)
        const controller = new AbortController()
        abortRef.current = controller

        try {
          await downloadOne(meta, controller.signal)
        } catch (err) {
          if (controller.signal.aborted) break // Abbruch: Queue ist bereits geleert
          const name = err instanceof Error ? err.name : ''
          if (name === 'QuotaExceededError' || /quota/i.test(String(err))) {
            setDownloadError('quota')
            queueRef.current = []
            setQueuedFiles([])
            break
          }
          setDownloadError('network') // transient: nächste Datei weiterversuchen
        } finally {
          abortRef.current = null
          activeFileRef.current = null
          setActiveFile(null)
        }
      }
    } finally {
      runningRef.current = false
    }
  }, [downloadOne])

  /** Videos in die Warteschlange legen (überspringt bereits geladene/eingereihte). */
  const enqueueDownloads = useCallback((metas: LocalVideoMeta[]) => {
    setDownloadError(null)
    const toAdd = selectDownloadsToEnqueue(metas, {
      downloaded: new Set(downloadsRef.current.keys()),
      queued: new Set(queueRef.current.map(m => m.file)),
      active: activeFileRef.current,
    })
    if (toAdd.length === 0) return
    queueRef.current = [...queueRef.current, ...toAdd]
    setQueuedFiles(queueRef.current.map(m => m.file))
    void processQueue()
  }, [processQueue])

  /** Laufenden Download abbrechen und Warteschlange leeren. */
  const cancelDownloads = useCallback(() => {
    queueRef.current = []
    setQueuedFiles([])
    abortRef.current?.abort()
  }, [])

  const downloadVideo = useCallback((meta: LocalVideoMeta) => enqueueDownloads([meta]), [enqueueDownloads])

  const removeVideo = useCallback(async (file: string) => {
    await deleteVideoDownload(file)
  }, [])

  return {
    status,
    groups,
    totalBytes: downloads.totalBytes,
    downloadedCount: downloads.byFile.size,
    activeFile,
    queuedCount: queuedFiles.length,
    downloadError,
    downloadVideo,
    enqueueDownloads,
    cancelDownloads,
    removeVideo,
    retry,
  }
}

/** Liefert eine spielbare Quelle: Offline-Blob (Object-URL) oder Stream-URL. */
export function useVideoSource(file: string | null, downloaded: boolean): { src: string | null; resolving: boolean } {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)

  useEffect(() => {
    if (!file || !downloaded) {
      setObjectUrl(null)
      setResolving(false)
      return
    }
    let revoked = false
    let created: string | null = null
    setResolving(true)
    void getVideoBlob(file).then(blob => {
      if (revoked) return
      if (blob) {
        created = URL.createObjectURL(blob)
        setObjectUrl(created)
      }
      setResolving(false)
    })
    return () => {
      revoked = true
      if (created) URL.revokeObjectURL(created)
      setObjectUrl(null)
    }
  }, [file, downloaded])

  if (!file) return { src: null, resolving: false }
  if (downloaded) return { src: objectUrl, resolving }
  return { src: localVideoUrl(file), resolving: false }
}
