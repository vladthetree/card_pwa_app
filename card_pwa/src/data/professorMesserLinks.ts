/**
 * AI_CONTEXT:
 * Role: Static Professor Messer SY0-701 course metadata: domains, objective-to-video IDs, deck IDs, playlist/course links.
 * Used by: legacy/video navigation and objective mapping around the Messer course.
 * Important: Local self-hosted video playback now relies mainly on localVideoManifest, but these IDs still document the official source mapping.
 */
/**
 * Professor Messer — kostenloser CompTIA Security+ (SY0-701) Videokurs.
 *
 * Die Decks der App tragen bereits die Objective-IDs (`sy0-701-objective-D-O`),
 * was 1:1 Professor Messers Kursgliederung entspricht. Diese Map ordnet jedem
 * Objective das ERSTE Video des jeweiligen Abschnitts zu; der In-App-Player
 * startet dort und spielt über die offizielle Playlist weiter.
 *
 * Quelle (abgerufen 2026-06-19):
 *   Kurs-Index: https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-comptia-security-plus-course/
 *   Playlist:   https://www.youtube.com/playlist?list=PLG49S3nxzAnl4QDVqK-hOnoqcSKEIDDuv
 * Die Video-IDs sind Professor Messers Uploads (Titelschema
 * "<Titel> - CompTIA Security+ SY0-701 - X.Y"). NEU GENERIERTE Ansicht.
 */

export const PROF_MESSER_PLAYLIST_ID = 'PLG49S3nxzAnl4QDVqK-hOnoqcSKEIDDuv'
export const PROF_MESSER_COURSE_URL =
  'https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-comptia-security-plus-course/'

export interface MesserDomain {
  domain: number
  title: string
}

export interface MesserVideo {
  objective: string
  domain: number
  title: string
  videoId: string
  deckId: string
}

export const MESSER_DOMAINS: MesserDomain[] = [
  { domain: 1, title: 'General Security Concepts' },
  { domain: 2, title: 'Threats, Vulnerabilities & Mitigations' },
  { domain: 3, title: 'Security Architecture' },
  { domain: 4, title: 'Security Operations' },
  { domain: 5, title: 'Security Program Management & Oversight' },
]

export const MESSER_VIDEOS: MesserVideo[] = [
  { objective: '1.1', domain: 1, title: 'Security Controls', videoId: 'STM3EUvL7wg', deckId: 'sy0-701-objective-1-1' },
  { objective: '1.2', domain: 1, title: 'The CIA Triad', videoId: 'SBcDGb9l6yo', deckId: 'sy0-701-objective-1-2' },
  { objective: '1.3', domain: 1, title: 'Change Management', videoId: '48wRbMdHFVI', deckId: 'sy0-701-objective-1-3' },
  { objective: '1.4', domain: 1, title: 'Public Key Infrastructure', videoId: 'xHAMEF7-inQ', deckId: 'sy0-701-objective-1-4' },
  { objective: '2.1', domain: 2, title: 'Threat Actors', videoId: '6xUH0t6ugIM', deckId: 'sy0-701-objective-2-1' },
  { objective: '2.2', domain: 2, title: 'Common Threat Vectors', videoId: '4lAbGpTDZ18', deckId: 'sy0-701-objective-2-2' },
  { objective: '2.3', domain: 2, title: 'Memory Injections', videoId: 'kBcTczu8FsM', deckId: 'sy0-701-objective-2-3' },
  { objective: '2.4', domain: 2, title: 'An Overview of Malware', videoId: '-eZs8wjjGGE', deckId: 'sy0-701-objective-2-4' },
  { objective: '2.5', domain: 2, title: 'Segmentation and Access Control', videoId: 'yDeDGCh_PDs', deckId: 'sy0-701-objective-2-5' },
  { objective: '3.1', domain: 3, title: 'Cloud Infrastructures', videoId: '8qpQ8Q6xxiU', deckId: 'sy0-701-objective-3-1' },
  { objective: '3.2', domain: 3, title: 'Secure Infrastructures', videoId: 'l64La1xYXL4', deckId: 'sy0-701-objective-3-2' },
  { objective: '3.3', domain: 3, title: 'Data Types and Classifications', videoId: 'R0W0_gZCVzk', deckId: 'sy0-701-objective-3-3' },
  { objective: '3.4', domain: 3, title: 'Resiliency', videoId: 'sb0dRaQbuBA', deckId: 'sy0-701-objective-3-4' },
  { objective: '4.1', domain: 4, title: 'Secure Baselines', videoId: 'BWPJD9Eb9iE', deckId: 'sy0-701-objective-4-1' },
  { objective: '4.2', domain: 4, title: 'Asset Management', videoId: 'BJ2UMB4a04g', deckId: 'sy0-701-objective-4-2' },
  { objective: '4.3', domain: 4, title: 'Vulnerability Scanning', videoId: '9B0mtWk_AM0', deckId: 'sy0-701-objective-4-3' },
  { objective: '4.4', domain: 4, title: 'Security Monitoring', videoId: 'np2WI_rM-Ok', deckId: 'sy0-701-objective-4-4' },
  { objective: '4.5', domain: 4, title: 'Firewalls', videoId: 'VgNyh4HEqSU', deckId: 'sy0-701-objective-4-5' },
  { objective: '4.6', domain: 4, title: 'Identity and Access Management', videoId: 'ZoOyyqhptik', deckId: 'sy0-701-objective-4-6' },
  { objective: '4.7', domain: 4, title: 'Scripting and Automation', videoId: 'R9ojg881dLs', deckId: 'sy0-701-objective-4-7' },
  { objective: '4.8', domain: 4, title: 'Incident Response', videoId: 'X2UiMLxRdhE', deckId: 'sy0-701-objective-4-8' },
  { objective: '4.9', domain: 4, title: 'Log Data', videoId: 'EDru1LTYDJw', deckId: 'sy0-701-objective-4-9' },
  { objective: '5.1', domain: 5, title: 'Security Policies', videoId: '5kY9kvzeWjA', deckId: 'sy0-701-objective-5-1' },
  { objective: '5.2', domain: 5, title: 'Risk Management', videoId: 'cLhUMoQS1a8', deckId: 'sy0-701-objective-5-2' },
  { objective: '5.3', domain: 5, title: 'Third-party Risk Assessment', videoId: '13KNjPexnEI', deckId: 'sy0-701-objective-5-3' },
  { objective: '5.4', domain: 5, title: 'Compliance', videoId: 'IjJf4jLtONQ', deckId: 'sy0-701-objective-5-4' },
  { objective: '5.5', domain: 5, title: 'Audits and Assessments', videoId: 'uo2Yw720mv4', deckId: 'sy0-701-objective-5-5' },
  { objective: '5.6', domain: 5, title: 'Security Awareness', videoId: 'W_Npxwk4fbI', deckId: 'sy0-701-objective-5-6' },
]

/** Embed-URL für den In-App-Player: startet beim Objective-Video, läuft über die Playlist weiter. */
export function messerEmbedUrl(videoId: string): string {
  const params = new URLSearchParams({
    list: PROF_MESSER_PLAYLIST_ID,
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
  })
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
}

/** Externer Fallback-Link (neuer Tab), falls der Embed nicht spielt. */
export function messerWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}&list=${PROF_MESSER_PLAYLIST_ID}`
}
