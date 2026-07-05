/**
 * AI_CONTEXT:
 * Role: Static Professor Messer SY0-701 course metadata: the five exam domains and the official course link.
 * Used by: VideosView (domain grouping, external course link).
 * Important: Playback is fully local (localVideoManifest); the YouTube-era video-ID map and embed helpers were removed with it.
 */
/**
 * Professor Messer — kostenloser CompTIA Security+ (SY0-701) Videokurs.
 *
 * Quelle (abgerufen 2026-06-19):
 *   Kurs-Index: https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-comptia-security-plus-course/
 */

export const PROF_MESSER_COURSE_URL =
  'https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-comptia-security-plus-course/'

export interface MesserDomain {
  domain: number
  title: string
}

export const MESSER_DOMAINS: MesserDomain[] = [
  { domain: 1, title: 'General Security Concepts' },
  { domain: 2, title: 'Threats, Vulnerabilities & Mitigations' },
  { domain: 3, title: 'Security Architecture' },
  { domain: 4, title: 'Security Operations' },
  { domain: 5, title: 'Security Program Management & Oversight' },
]
