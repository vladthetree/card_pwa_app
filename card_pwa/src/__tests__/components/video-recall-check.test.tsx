import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import VideoRecallCheck, { describeCard } from '../../components/videos/VideoRecallCheck'
import type { Card } from '../../types'

/**
 * Abruf-Check: aktives Erinnern direkt nach dem Video. `describeCard` reduziert
 * eine Karte beliebigen Typs (MC / Ordering / Matching / Plain) auf eine
 * schlichte, HTML-freie Frage/Antwort-Ansicht. Kein jsdom → SSR-Markup.
 */

function makeCard(front: string, back: string): Card {
  return {
    id: 'c1',
    noteId: 'n1',
    type: 'new',
    front,
    back,
    extra: { acronym: '', examples: '', port: '', protocol: '' },
    tags: [],
    interval: 0,
    due: 0,
    reps: 0,
    lapses: 0,
    queue: 0,
  }
}

describe('describeCard — Frage/Antwort-Reduktion', () => {
  it('extrahiert bei Multiple-Choice Frage und korrekte Option', () => {
    const card = makeCard(
      'Was beschreibt die CIA-Triade?\nA: Confidentiality\nB: Integrity\nC: Availability\nD: Alle drei',
      'RICHTIG: D\nAlle drei Schutzziele zusammen.',
    )
    const { prompt, answer } = describeCard(card)
    expect(prompt).toContain('CIA-Triade')
    expect(prompt).not.toContain('A: Confidentiality') // Optionen gehören nicht in den Prompt
    expect(answer).toContain('Alle drei')
  })

  it('listet bei Ordering die korrekte Reihenfolge samt Erklärung', () => {
    const card = makeCard(
      'ORDERING:\nBringe die Incident-Response-Phasen in die richtige Reihenfolge\n1. Preparation\n2. Detection\n3. Containment',
      'CORRECT_ORDER: 1,2,3\nReihenfolge laut NIST.',
    )
    const { prompt, answer } = describeCard(card)
    expect(prompt).toContain('Reihenfolge')
    expect(answer).toContain('1. Preparation')
    expect(answer).toContain('3. Containment')
    expect(answer).toContain('NIST')
  })

  it('listet bei Matching die Paare', () => {
    const card = makeCard(
      'MATCHING:\nOrdne Dienst und Port zu\nHTTPS >> 443\nSSH >> 22',
      'HTTPS = 443\nSSH = 22',
    )
    const { answer } = describeCard(card)
    expect(answer).toContain('HTTPS = 443')
    expect(answer).toContain('SSH = 22')
  })

  it('nutzt bei einfachen Karten ohne Optionen den Antworttext', () => {
    const card = makeCard(
      'Nenne die drei Schutzziele der Informationssicherheit',
      'Confidentiality, Integrity, Availability',
    )
    const { prompt, answer } = describeCard(card)
    expect(prompt).toContain('Schutzziele')
    expect(answer).toContain('Confidentiality')
  })

  it('entfernt HTML aus Prompt und Antwort', () => {
    const card = makeCard('<b>Was</b> ist <i>AES</i>?', '<p>Ein <b>symmetrisches</b> Verfahren</p>')
    const { prompt, answer } = describeCard(card)
    expect(prompt).toBe('Was ist AES?')
    expect(prompt).not.toMatch(/<[^>]+>/)
    expect(answer).not.toMatch(/<[^>]+>/)
    expect(answer).toContain('symmetrisches')
  })

  it('fällt bei leerem Inhalt auf „—" zurück', () => {
    const { prompt, answer } = describeCard(makeCard('', ''))
    expect(prompt).toBe('—')
    expect(answer).toBe('—')
  })
})

describe('VideoRecallCheck — Render-Smoke-Test', () => {
  function render() {
    return renderToStaticMarkup(
      createElement(VideoRecallCheck, {
        deckId: 'sy0-701-objective-1-2',
        objective: '1.2',
        videoTitle: 'The CIA Triad',
        language: 'de' as const,
        onClose: () => {},
        onConfidence: () => {},
      }),
    )
  }

  it('mountet, zeigt Kopf und den Nicht-Planungs-Hinweis', () => {
    const html = render()
    expect(html).toContain('Abruf-Check')
    expect(html).toContain('1.2')
    expect(html).toContain('The CIA Triad')
    // Pädagogisch zentral: der Check verändert den FSRS-Zeitplan nicht.
    expect(html).toContain('Zählt nicht zur Wiederholung')
  })
})
