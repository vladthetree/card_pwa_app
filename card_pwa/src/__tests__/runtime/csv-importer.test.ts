/**
 * AI_CONTEXT: Vitest coverage for csv importer; protects runtime behavior from regressions in the learning PWA.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CSV_WORKER_THRESHOLD_BYTES, parseCsv, parseCsvText } from '../../utils/import/csvImporter'
import type { CardRecord } from '../../db'

const uuidV7Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

function encodeTxtMetadataForTest(payload: { card: CardRecord; deckName: string }): string {
  const json = JSON.stringify(payload)
  return `card-pwa-meta:${globalThis.btoa(unescape(encodeURIComponent(json)))}`
}

describe('csvImporter', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates UUIDv7 identifiers for imported decks and cards', async () => {
    const parsed = await parseCsvText('sample.csv', 'Question,Answer\n', 'de', 'sm2')

    expect(parsed.decks).toHaveLength(1)
    expect(parsed.cards).toHaveLength(1)
    expect(parsed.decks[0].id).toMatch(uuidV7Pattern)
    expect(parsed.cards[0].id).toMatch(uuidV7Pattern)
    expect(parsed.cards[0].noteId).toMatch(uuidV7Pattern)
  })

  it('parses semicolon-separated csv and currently keeps header row as card', async () => {
    const parsed = await parseCsvText(
      'semicolon.csv',
      'Front;Back;Tags\nQ1;A1;tag1 tag2\nQ2;A2;tag3\n',
      'de',
      'sm2',
    )

    expect(parsed.cards).toHaveLength(3)
    expect(parsed.cards[0].front).toBe('Front')
    expect(parsed.cards[0].back).toBe('Back')
  })

  it('strips html tags from front/back content', async () => {
    const parsed = await parseCsvText('html.csv', '<b>Frage</b>,<div>Antwort</div>\n', 'de', 'sm2')

    expect(parsed.cards).toHaveLength(1)
    expect(parsed.cards[0].front).toBe('Frage')
    expect(parsed.cards[0].back).toBe('Antwort')
  })

  it('maps fsrs algorithm fields consistently', async () => {
    const parsed = await parseCsvText('fsrs.csv', 'Q,A\n', 'de', 'fsrs')
    const card = parsed.cards[0]

    expect(card.algorithm).toBe('fsrs')
    expect(card.stability).toBeDefined()
    expect(card.difficulty).toBeDefined()
    expect(card.factor).toBe(Math.round((card.difficulty ?? 0) * 500))
  })

  it('parses txt header deck metadata and tab separated rows', async () => {
    const txt = [
      '#separator:tab',
      '#deck:Netzwerke',
      'Frage\tAntwort',
    ].join('\n')

    const parsed = await parseCsvText('anki.txt', txt, 'de', 'sm2')

    expect(parsed.format).toBe('txt')
    expect(parsed.decks).toHaveLength(1)
    expect(parsed.decks[0].name).toBe('Netzwerke')
    expect(parsed.cards).toHaveLength(1)
    expect(parsed.cards[0].front).toBe('Frage')
    expect(parsed.cards[0].back).toBe('Antwort')
  })

  it('restores card-pwa txt backup metadata as original card scheduling fields', async () => {
    const baseCard: CardRecord = {
      id: 'card-restore-1',
      noteId: 'note-restore-1',
      deckId: 'deck-original',
      front: [
        'Welche Kontrolle begrenzt laterale Bewegung?',
        'A: Gemeinsamer Admin-Account',
        'B: Mikrosegmentierung',
        'C: Flaches VLAN',
        'D: Offenes Ost-West-Routing',
      ].join('\n'),
      back: [
        '>> CORRECT: B | Mikrosegmentierung',
        '',
        'Mikrosegmentierung begrenzt Ost-West-Traffic und reduziert laterale Bewegung.',
        '',
        'Merkhilfe: Kleine Segmente, kleine Blast Radius.',
      ].join('\n'),
      tags: ['security', 'iam'],
      extra: { acronym: 'ZTNA', examples: 'Least privilege', port: '', protocol: '' },
      type: 2,
      queue: 2,
      due: 20610,
      dueAt: 1780000000000,
      interval: 42,
      factor: 2700,
      stability: 18,
      difficulty: 5.4,
      reps: 9,
      lapses: 1,
      createdAt: 1710000000000,
      updatedAt: 1720000000000,
      algorithm: 'fsrs',
      metadata: {
        preMigrationAlgorithm: 'sm2',
        preMigrationFactor: 2500,
        preMigrationInterval: 12,
        migratedAt: 1715000000000,
      },
    }
    const meta = encodeTxtMetadataForTest({ card: baseCard, deckName: 'Security::IAM' })
    const txt = [
      '#separator:tab',
      '#html:true',
      '#notetype:Basic',
      '#card-pwa:backup-v1',
      [baseCard.front, baseCard.back, baseCard.tags.join(' '), meta].join('\t'),
    ].join('\n')

    const parsed = await parseCsvText('card-pwa-backup.txt', txt, 'de', 'sm2')
    const card = parsed.cards[0]

    expect(parsed.decks).toHaveLength(1)
    expect(parsed.decks[0].name).toBe('Security::IAM')
    expect(card.id).toBe(baseCard.id)
    expect(card.noteId).toBe(baseCard.noteId)
    expect(card.deckId).toBe(parsed.decks[0].id)
    expect(card.front).toBe(baseCard.front)
    expect(card.back).toBe(baseCard.back)
    expect(card.tags).toEqual(baseCard.tags)
    expect(card.type).toBe(baseCard.type)
    expect(card.queue).toBe(baseCard.queue)
    expect(card.due).toBe(baseCard.due)
    expect(card.dueAt).toBe(baseCard.dueAt)
    expect(card.interval).toBe(baseCard.interval)
    expect(card.factor).toBe(Math.round((baseCard.difficulty ?? 0) * 500))
    expect(card.stability).toBe(baseCard.stability)
    expect(card.difficulty).toBe(baseCard.difficulty)
    expect(card.reps).toBe(baseCard.reps)
    expect(card.lapses).toBe(baseCard.lapses)
    expect(card.algorithm).toBe(baseCard.algorithm)
    expect(card.createdAt).toBe(baseCard.createdAt)
    expect(card.updatedAt).toBe(baseCard.updatedAt)
    expect(card.metadata).toEqual(baseCard.metadata)
  })

  it('throws when file contains no usable rows', async () => {
    await expect(parseCsvText('empty.csv', '', 'de', 'sm2')).rejects.toThrow()
  })

  it('uses worker path for large csv files when Worker is available', async () => {
    const workerResult = {
      decks: [{ id: 'deck-worker', name: 'Worker Deck', createdAt: 1, source: 'anki-import' as const }],
      cards: [],
      format: 'csv' as const,
      sourceName: 'large.csv',
    }

    const workerCtor = vi.fn()
    const terminate = vi.fn()

    class WorkerMock {
      onmessage: ((event: MessageEvent<{ ok: boolean; result?: typeof workerResult }>) => void) | null = null
      onerror: (() => void) | null = null

      constructor(url: URL, options: WorkerOptions) {
        workerCtor(url, options)
      }

      postMessage(): void {
        this.onmessage?.({ data: { ok: true, result: workerResult } } as MessageEvent<{ ok: boolean; result?: typeof workerResult }>)
      }

      terminate(): void {
        terminate()
      }
    }

    vi.stubGlobal('Worker', WorkerMock)

    const bigContent = `front,back\n${'q,a\n'.repeat(Math.ceil(CSV_WORKER_THRESHOLD_BYTES / 4) + 10)}`
    const file = new File([bigContent], 'large.csv', { type: 'text/csv' })
    const parsed = await parseCsv(file, 'de', 'sm2')

    expect(workerCtor).toHaveBeenCalledTimes(1)
    expect(terminate).toHaveBeenCalledTimes(1)
    expect(parsed).toEqual(workerResult)
  })
})
