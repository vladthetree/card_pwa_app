/**
 * AI_CONTEXT: Vitest coverage for acronym practice view; protects components behavior from regressions in the learning PWA.
 */
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import AcronymPracticeView from '../../components/acronyms/AcronymPracticeView'
import { SY0701_ACRONYMS } from '../../data/sy0701Acronyms'

describe('AcronymPracticeView', () => {
  it('rendert Titel, Untertitel mit Paar-Anzahl, Fortschritt und die erste Frage', () => {
    const html = renderToStaticMarkup(createElement(AcronymPracticeView, { language: 'de', embedded: true }))
    expect(html).toContain('Akronyme')
    expect(html).toContain(`${SY0701_ACRONYMS.length} Paare`)
    expect(html).toContain('1 / 20')
    expect(html).toContain('Wofür steht')
  })

  it('zeigt 4 Antwort-Optionen und einen deaktivierten "Weiter"-Button vor der Auswahl', () => {
    const html = renderToStaticMarkup(createElement(AcronymPracticeView, { language: 'de', embedded: true }))
    const optionMatches = html.match(/data-testid="acronym-option"/g) ?? []
    expect(optionMatches).toHaveLength(4)
    expect(html).toContain('data-testid="acronym-next"')
    expect(html).toContain('disabled=""')
  })

  it('zeigt im embedded-Modus keinen Zurück-Pfeil, sonst schon', () => {
    const embeddedHtml = renderToStaticMarkup(createElement(AcronymPracticeView, { language: 'de', embedded: true }))
    const standaloneHtml = renderToStaticMarkup(createElement(AcronymPracticeView, { language: 'de', embedded: false, onExit: () => {} }))
    expect(embeddedHtml).not.toContain('aria-label="Zurück"')
    expect(standaloneHtml).toContain('aria-label="Zurück"')
  })

  it('rendert die englische Variante mit übersetztem Titel und Fragetext', () => {
    const html = renderToStaticMarkup(createElement(AcronymPracticeView, { language: 'en', embedded: true }))
    expect(html).toContain('Acronyms')
    expect(html).toContain('What does')
  })

  it('rendert durchgängig Mono-Schrift', () => {
    const html = renderToStaticMarkup(createElement(AcronymPracticeView, { language: 'de', embedded: true }))
    expect(html).toContain('font-mono')
    expect(html).not.toContain('font-sans')
  })
})
