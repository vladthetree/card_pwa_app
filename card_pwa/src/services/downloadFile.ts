/**
 * AI_CONTEXT: Application service for downloadFile; triggers a client-side
 * file download via a throwaway object URL (shared by dbBackup.ts and
 * errorLog.ts's export actions).
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
