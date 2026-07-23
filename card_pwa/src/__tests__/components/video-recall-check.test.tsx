/**
 * AI_CONTEXT: Vitest coverage for video recall check; protects components behavior from regressions in the learning PWA.
 */
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import VideoRecallCheck, { buildRecallCardView, buildTranscriptQuestionView, isProfessorMesserRecallCard } from '../../components/videos/VideoRecallCheck'
import { MESSER_VIDEO_BY_QUESTION_ID, normalizeMesserVideoTitle } from '../../data/messerVideoQuestionMap'
import { MESSER_TRANSCRIPT_QUESTIONS } from '../../data/messerTranscriptQuestions'
import type { Card } from '../../types'

/**
 * Abruf-Check: aktives Erinnern direkt nach dem Video. `buildRecallCardView` reduziert
 * eine Karte beliebigen Typs (MC / Ordering / Matching / Plain) auf eine
 * schlichte, HTML-freie Frage/Antwort-Ansicht. Kein jsdom → SSR-Markup.
 */

function makeCard(front: string, back: string, overrides: Partial<Card> = {}): Card {
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
    ...overrides,
  }
}

describe('buildRecallCardView — Frage/Antwort-Reduktion', () => {
  it('extrahiert bei Multiple-Choice Frage, Optionen und korrekte Option', () => {
    const card = makeCard(
      'Was beschreibt die CIA-Triade?\nA: Confidentiality\nB: Integrity\nC: Availability\nD: Alle drei',
      'RICHTIG: D\nAlle drei Schutzziele zusammen.',
    )
    const { prompt, options, answer } = buildRecallCardView(card)
    expect(prompt).toContain('CIA-Triade')
    expect(prompt).not.toContain('A: Confidentiality') // Optionen gehören nicht in den Prompt
    expect(options.map(option => option.label)).toEqual(['A', 'B', 'C', 'D'])
    expect(options.find(option => option.correct)?.text).toBe('Alle drei')
    expect(answer).toContain('Alle drei Schutzziele') // Erklärung bleibt separat erhalten
  })

  it('entfernt die interne Messer-Fragen-ID aus dem Prompt und trennt die Merkhilfe', () => {
    const card = makeCard(
      'M1-001: Which security control category does anti-virus software belong to?\nA: Managerial\nB: Operational\nC: Technical\nD: Physical',
      '>> CORRECT: C | Technical\n\nTechnische Controls sind softwarebasiert.\n\nMerkhilfe: Technical = Technologie.',
    )
    const view = buildRecallCardView(card)
    expect(view.prompt).not.toContain('M1-001')
    expect(view.prompt).toContain('Which security control category')
    expect(view.options.find(option => option.correct)?.label).toBe('C')
    expect(view.answer).toContain('softwarebasiert')
    expect(view.answer).not.toContain('Merkhilfe')
    expect(view.merkhilfe).toContain('Technical = Technologie')
  })

  it('mischt auch Legacy-MC-Optionen und behält die korrekte Markierung', () => {
    const card = makeCard(
      'M1-001: Which category?\nA: Managerial\nB: Operational\nC: Technical\nD: Physical',
      '>> CORRECT: C | Technical\n\nErklärung.',
    )
    const view = buildRecallCardView(card, [3, 2, 1, 0])
    expect(view.options.map(option => option.text)).toEqual(['Physical', 'Technical', 'Operational', 'Managerial'])
    expect(view.options.find(option => option.correct)?.label).toBe('B')
  })

  it('fällt ohne erkannte korrekte Option auf die schlichte Text-Ansicht zurück', () => {
    const card = makeCard(
      'Frage mit Optionen ohne Marker\nA: Eins\nB: Zwei',
      'Nur Fließtext ohne CORRECT-Marker.',
    )
    const view = buildRecallCardView(card)
    expect(view.options).toEqual([]) // keine stumme Optionsliste, die nichts aufdeckt
    expect(view.answer).toContain('Fließtext')
  })

  it('listet bei Ordering die korrekte Reihenfolge samt Erklärung', () => {
    const card = makeCard(
      'ORDERING:\nBringe die Incident-Response-Phasen in die richtige Reihenfolge\n1. Preparation\n2. Detection\n3. Containment',
      'CORRECT_ORDER: 1,2,3\nReihenfolge laut NIST.',
    )
    const { prompt, answer } = buildRecallCardView(card)
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
    const { answer } = buildRecallCardView(card)
    expect(answer).toContain('HTTPS = 443')
    expect(answer).toContain('SSH = 22')
  })

  it('nutzt bei einfachen Karten ohne Optionen den Antworttext', () => {
    const card = makeCard(
      'Nenne die drei Schutzziele der Informationssicherheit',
      'Confidentiality, Integrity, Availability',
    )
    const { prompt, answer } = buildRecallCardView(card)
    expect(prompt).toContain('Schutzziele')
    expect(answer).toContain('Confidentiality')
  })

  it('entfernt HTML aus Prompt und Antwort', () => {
    const card = makeCard('<b>Was</b> ist <i>AES</i>?', '<p>Ein <b>symmetrisches</b> Verfahren</p>')
    const { prompt, answer } = buildRecallCardView(card)
    expect(prompt).toBe('Was ist AES?')
    expect(prompt).not.toMatch(/<[^>]+>/)
    expect(answer).not.toMatch(/<[^>]+>/)
    expect(answer).toContain('symmetrisches')
  })

  it('fällt bei leerem Inhalt auf „—" zurück', () => {
    const { prompt, answer } = buildRecallCardView(makeCard('', ''))
    expect(prompt).toBe('—')
    expect(answer).toBe('—')
  })
})

describe('isProfessorMesserRecallCard', () => {
  it('erlaubt konvertierte Professor-Messer-MC-Fragen des passenden Domains', () => {
    const card = makeCard(
      'M1-001: Which security control category does anti-virus software belong to?\nA: Managerial\nB: Operational\nC: Technical\nD: Physical',
      '>> CORRECT: C | Technical',
      { tags: ['Security Controls'] },
    )
    expect(isProfessorMesserRecallCard(card, '1.1')).toBe(true)
  })

  it('filtert Bonus-, PBQ- und Acronym-Karten aus dem Abruf-Check heraus', () => {
    const pbq = makeCard(
      'MATCHING:\nOrdne jedes Beispiel der richtigen Security-Control-Kategorie zu.',
      'Guard shack = Physical',
      { tags: ['Security Controls', 'PBQ'] },
    )
    const acronym = makeCard(
      "Welche Bedeutung hat das Acronym 'CASB' im SY0-701-Kontext?",
      '>> CORRECT: D | Cloud Access Security Broker',
      { tags: ['Acronyms', 'Obj 3.1'] },
    )
    expect(isProfessorMesserRecallCard(pbq, '1.1')).toBe(false)
    expect(isProfessorMesserRecallCard(acronym, '3.1')).toBe(false)
  })

  it('filtert Messer-Fragen aus einer anderen Domain aus', () => {
    const card = makeCard(
      'M2-010: Which type of network is intentionally isolated from the internet?\nA: Air-gapped network\nB: Guest network',
      '>> CORRECT: A | Air-gapped network',
      { tags: ['Threat Vectors and Attack Surfaces'] },
    )
    expect(isProfessorMesserRecallCard(card, '3.1')).toBe(false)
  })

  it('ordnet Fragen über das generierte Mapping genau ihrem Video zu', () => {
    // Objective 1.2 hat mehrere Videos; M1-033 gehört laut Mapping zu "The CIA Triad".
    const card = makeCard(
      'M1-033: Implementing Access Controls to allow only authorized users?\nA: Eins\nB: Zwei',
      '>> CORRECT: A | Eins',
      { tags: ['Security Concepts'] },
    )
    expect(MESSER_VIDEO_BY_QUESTION_ID['M1-033']).toBe('The CIA Triad')
    expect(isProfessorMesserRecallCard(card, '1.2', 'The CIA Triad')).toBe(true)
    expect(isProfessorMesserRecallCard(card, '1.2', 'Non-repudiation')).toBe(false)
  })

  it('vergleicht Videotitel tolerant (Plural, Klammern, Füllwörter)', () => {
    // APKG-Unterdeck "Cloud Infrastructure" vs MP4-Titel "Cloud Infrastructures".
    const card = makeCard(
      'M3-001: Which cloud model?\nA: Eins\nB: Zwei',
      '>> CORRECT: A | Eins',
      { tags: ['Cloud Infrastructures'] },
    )
    expect(isProfessorMesserRecallCard(card, '3.1', 'Cloud Infrastructure')).toBe(true)
    expect(normalizeMesserVideoTitle('Authentication, Authorization, Accounting (AAA)'))
      .toBe(normalizeMesserVideoTitle('Authentication, Authorization, and Accounting'))
  })

  it('schließt Fragen ohne Mapping-Eintrag aus, statt sie dem falschen Video zu zeigen', () => {
    const card = makeCard(
      'M1-999: Not yet generated question?\nA: Eins\nB: Zwei',
      '>> CORRECT: A | Eins',
      { tags: ['Security Concepts'] },
    )
    expect(isProfessorMesserRecallCard(card, '1.2', 'The CIA Triad')).toBe(false)
    // Ohne Video-Kontext (Legacy-Aufruf) bleibt die Domain-Filterung erhalten.
    expect(isProfessorMesserRecallCard(card, '1.2')).toBe(true)
  })
})

describe('buildTranscriptQuestionView — kuratierte Transkript-Fragen', () => {
  const question = {
    q: 'Which port does HTTPS use?',
    options: ['80', '443', '22', '3389'] as [string, string, string, string],
    correct: 1 as const,
    why: 'HTTPS läuft über TCP 443.',
  }

  it('bildet Optionen mit Labels A–D und markiert die korrekte', () => {
    const view = buildTranscriptQuestionView(question)
    expect(view.prompt).toBe('Which port does HTTPS use?')
    expect(view.options.map(option => option.label)).toEqual(['A', 'B', 'C', 'D'])
    expect(view.options.find(option => option.correct)?.text).toBe('443')
    expect(view.answer).toContain('TCP 443')
    expect(view.merkhilfe).toBeNull()
  })

  it('hält die Korrekt-Markierung auch bei gemischter Optionsreihenfolge', () => {
    const view = buildTranscriptQuestionView(question, [3, 2, 1, 0])
    // Position der korrekten Quelle (Index 1) ist jetzt Label C.
    expect(view.options.find(option => option.correct)?.label).toBe('C')
    expect(view.options.find(option => option.correct)?.text).toBe('443')
    expect(view.options.filter(option => option.correct)).toHaveLength(1)
  })
})

describe('MESSER_TRANSCRIPT_QUESTIONS — Datenqualität', () => {
  it('jeder Eintrag: 3-stelliger Video-Index, 4 eindeutige Optionen, korrekter Index im Bereich', () => {
    const entries = Object.entries(MESSER_TRANSCRIPT_QUESTIONS)
    expect(entries.length).toBeGreaterThan(0)
    for (const [videoIndex, questions] of entries) {
      expect(videoIndex).toMatch(/^\d{3}$/)
      expect(questions.length).toBeGreaterThan(0)
      for (const question of questions) {
        expect(question.q.trim().length).toBeGreaterThan(10)
        expect(question.options).toHaveLength(4)
        expect(new Set(question.options).size).toBe(4)
        expect(question.correct).toBeGreaterThanOrEqual(0)
        expect(question.correct).toBeLessThanOrEqual(3)
        expect(question.why.trim().length).toBeGreaterThan(10)
      }
    }
  })

  it('kein extremer Längen-Bias: korrekte Option < 3x so lang wie der längste Distraktor', () => {
    // Sonst verrät die Länge die Antwort („nimm die längste") und verzerrt die
    // Verstanden-Empfehlung. Regressionsgrenze; Ziel wäre langfristig < 1.8.
    for (const [videoIndex, questions] of Object.entries(MESSER_TRANSCRIPT_QUESTIONS)) {
      questions.forEach((question, i) => {
        const correctLen = question.options[question.correct].length
        const maxDistractor = Math.max(
          ...question.options.filter((_, j) => j !== question.correct).map(o => o.length),
        )
        expect(correctLen / maxDistractor, `${videoIndex} Frage ${i + 1}`).toBeLessThan(3)
      })
    }
  })

  it('keine wortgleichen Fragen über Videos hinweg', () => {
    const seen = new Map<string, string>()
    for (const [videoIndex, questions] of Object.entries(MESSER_TRANSCRIPT_QUESTIONS)) {
      for (const question of questions) {
        const key = question.q.trim().toLowerCase()
        expect(seen.get(key), `"${question.q}" in ${seen.get(key)} und ${videoIndex}`).toBeUndefined()
        seen.set(key, videoIndex)
      }
    }
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
