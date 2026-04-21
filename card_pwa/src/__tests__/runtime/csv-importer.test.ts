import { afterEach, describe, expect, it, vi } from 'vitest'
import { CSV_WORKER_THRESHOLD_BYTES, parseCsv, parseCsvText } from '../../utils/import/csvImporter'

const uuidV7Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

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
