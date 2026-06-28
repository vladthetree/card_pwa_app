/**
 * AI_CONTEXT: Vitest coverage for no animatepresence wait; protects ui behavior from regressions in the learning PWA.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Regressions-Guard gegen den "schwarzer Screen"-Bug (2026-06-11):
 *
 * `AnimatePresence mode="wait"` mountet das nächste Kind erst, wenn das alte
 * seinen Exit abgeschlossen meldet. Dieser Exit→Enter-Handover ging in der App
 * intermittierend verloren — beobachtete Folgen (Headless-Repro + Nutzer):
 *  - nach dem Bewerten einer Karte mountete die Folgekarte nie
 *    (leerer Kartenbereich, nur Undo-Button),
 *  - nach einer Drag-Match-Antwort führte der Zurück-Pfeil nicht zurück
 *    auf den Homescreen (Home-View mountete nie).
 *
 * Deshalb gilt: Keyed-Remount mit Enter-Animation statt Exit-Gate.
 * `mode="wait"` (und das gleich anfällige `mode="popLayout"`) sind in src/
 * verboten. Wer es wieder braucht, muss diesen Test bewusst anfassen.
 */

const SRC_ROOT = join(__dirname, '..', '..')
const FORBIDDEN = /mode\s*=\s*["']\s*(wait|popLayout)\s*["']/

function collectSourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === '__tests__' || entry === 'node_modules') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...collectSourceFiles(full))
    } else if (/\.(tsx|ts)$/.test(entry)) {
      out.push(full)
    }
  }
  return out
}

describe('AnimatePresence Exit-Gates', () => {
  it('verwendet nirgendwo in src/ mode="wait" oder mode="popLayout"', () => {
    const offenders: string[] = []
    for (const file of collectSourceFiles(SRC_ROOT)) {
      const content = readFileSync(file, 'utf-8')
      if (FORBIDDEN.test(content)) {
        offenders.push(file.replace(SRC_ROOT, 'src'))
      }
    }
    expect(offenders, 'Exit-gated AnimatePresence gefunden — siehe Test-Doku oben').toEqual([])
  })

  it('die kritischen Ansichten existieren weiterhin (Guard prüft das Richtige)', () => {
    for (const rel of ['App.tsx', 'components/StudyView.tsx', 'components/ShuffleStudyView.tsx']) {
      const content = readFileSync(join(SRC_ROOT, rel), 'utf-8')
      expect(content.length, `${rel} fehlt oder ist leer`).toBeGreaterThan(0)
    }
  })
})
