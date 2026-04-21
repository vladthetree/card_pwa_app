import { parseCsvText } from '../import/csvImporter'
import type { Algorithm, Language } from '../../contexts/SettingsContext'

self.onmessage = async (event: MessageEvent<{
  fileName: string
  text: string
  language: Language
  algorithm: Algorithm
}>) => {
  try {
    const result = await parseCsvText(
      event.data.fileName,
      event.data.text,
      event.data.language,
      event.data.algorithm,
    )

    self.postMessage({ ok: true, result })
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}