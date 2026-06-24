import { describe, it, expect } from 'vitest'
import {
  parseLocalVideoFilename,
  buildLocalVideoManifest,
  groupLocalVideosByObjective,
  localVideoUrl,
} from '../../utils/localVideoManifest'

/**
 * Selbst gehostete Professor-Messer-Videos. Die Dateinamen folgen
 * `NNN - D.O - Titel - CompTIA … SY0-701.mp4`; daraus werden Index, Objective,
 * Domain und ein sauberer Titel abgeleitet (server-frei, daher hier testbar).
 */

describe('parseLocalVideoFilename', () => {
  it('extrahiert Index, Objective, Domain und Titel', () => {
    const meta = parseLocalVideoFilename('003 - 1.2 - The CIA Triad - CompTIA Security+ SY0-701.mp4')
    expect(meta).toEqual({
      index: 3,
      objective: '1.2',
      domain: 1,
      title: 'The CIA Triad',
      file: '003 - 1.2 - The CIA Triad - CompTIA Security+ SY0-701.mp4',
    })
  })

  it('behandelt die vertauschte Suffix-Variante „CompTIA SY0-701 Security+"', () => {
    const meta = parseLocalVideoFilename('008 - 1.2 - Physical Security - CompTIA SY0-701 Security+.mp4')
    expect(meta?.title).toBe('Physical Security')
    expect(meta?.objective).toBe('1.2')
  })

  it('leitet die Domain aus der ersten Ziffer ab', () => {
    expect(parseLocalVideoFilename('045 - 4.5 - Firewalls - CompTIA Security+ SY0-701.mp4')?.domain).toBe(4)
  })

  it('liefert null für das Intro ohne Objective-Code', () => {
    expect(parseLocalVideoFilename('001 - How to Pass Your SY0-701 Security+ Exam in 2026.mp4')).toBeNull()
  })

  it('liefert null für Nicht-mp4-Dateien', () => {
    expect(parseLocalVideoFilename('failed-downloads.txt')).toBeNull()
  })
})

describe('buildLocalVideoManifest', () => {
  it('filtert nicht passende Dateien und sortiert nach Index', () => {
    const files = [
      '003 - 1.2 - The CIA Triad - CompTIA Security+ SY0-701.mp4',
      '001 - How to Pass Your SY0-701 Security+ Exam in 2026.mp4',
      '002 - 1.1 - Security Controls - CompTIA Security+ SY0-701.mp4',
      'failed-downloads.txt',
    ]
    const manifest = buildLocalVideoManifest(files)
    expect(manifest.map(m => m.index)).toEqual([2, 3])
    expect(manifest.map(m => m.objective)).toEqual(['1.1', '1.2'])
  })
})

describe('groupLocalVideosByObjective', () => {
  it('gruppiert mehrere Videos je Objective unter Beibehaltung der Reihenfolge', () => {
    const manifest = buildLocalVideoManifest([
      '003 - 1.2 - The CIA Triad - CompTIA Security+ SY0-701.mp4',
      '004 - 1.2 - Non-repudiation - CompTIA Security+ SY0-701.mp4',
      '002 - 1.1 - Security Controls - CompTIA Security+ SY0-701.mp4',
    ])
    const grouped = groupLocalVideosByObjective(manifest)
    expect(grouped.get('1.1')?.length).toBe(1)
    expect(grouped.get('1.2')?.map(v => v.title)).toEqual(['The CIA Triad', 'Non-repudiation'])
  })
})

describe('localVideoUrl', () => {
  it('kodiert Leerzeichen/Sonderzeichen für die Medien-Route', () => {
    const url = localVideoUrl('003 - 1.2 - The CIA Triad - CompTIA Security+ SY0-701.mp4')
    expect(url.startsWith('/media/messer/')).toBe(true)
    expect(url).not.toContain(' ')
    expect(url).toContain('%20')
  })
})
