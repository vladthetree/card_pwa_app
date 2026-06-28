/**
 * AI_CONTEXT: Vitest coverage for tag identity; protects utils behavior from regressions in the learning PWA.
 */
import { describe, expect, it } from 'vitest'
import { normalizeTagId, tagsMatch, toInlineTag, uniqueByTagId } from '../../utils/tagIdentity'

describe('tagIdentity', () => {
  it('normalisiert Schreibweisen auf stabile Tag-IDs', () => {
    expect(normalizeTagId('Incident Response')).toBe('incident-response')
    expect(normalizeTagId('incident_response')).toBe('incident-response')
    expect(normalizeTagId('#Incident---Response')).toBe('incident-response')
    expect(normalizeTagId('  #IAM  ')).toBe('iam')
  })

  it('vergleicht Tags ueber die kanonische ID', () => {
    expect(tagsMatch('Incident Response', 'incident_response')).toBe(true)
    expect(tagsMatch('#IAM', 'iam')).toBe(true)
    expect(tagsMatch('iam', 'identity-access-management')).toBe(false)
  })

  it('dedupliziert Tags nach kanonischer ID und behaelt die erste Anzeigeform', () => {
    expect(uniqueByTagId(['Incident Response', 'incident_response', '#Cloud'])).toEqual([
      'Incident Response',
      'Cloud',
    ])
  })

  it('erstellt inline-kompatible Tags ohne die Anzeigeform zu lowercasen', () => {
    expect(toInlineTag('Incident Response')).toBe('Incident-Response')
    expect(toInlineTag('#Cloud Security')).toBe('Cloud-Security')
  })
})
