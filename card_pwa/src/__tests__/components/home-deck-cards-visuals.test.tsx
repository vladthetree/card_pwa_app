// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { Card, Deck } from '../../types'
import { HomeDeckCardsModal } from '../../components/home/HomeDeckCardsModal'

const fixture = vi.hoisted(() => ({ cards: [] as Card[] }))

vi.mock('../../hooks/useCardDb', () => ({
  useDeckCards: () => ({ cards: fixture.cards, loading: false, error: null, reload: async () => undefined }),
}))
vi.mock('../../ui/overlays/Dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const deck: Deck = { id: 'deck-1', name: 'Security', total: 2, new: 2, learning: 0, due: 0 }
const front = 'Charles wants to reduce the threat scope of compromised credentials. What type of the following security controls is best suited to meeting this need?\nA: Single sign-on\nB: Federation\nC: Zero trust\nD: Multifactor authentication (MFA)'

function card(id: string, back: string): Card {
  return {
    id, noteId: id, deckId: deck.id, type: 'new', front, back,
    extra: { acronym: '', examples: '', port: '', protocol: '' }, tags: [],
    interval: 0, due: 0, reps: 0, lapses: 0, queue: 0,
  }
}

let root: Root | null = null
let container: HTMLDivElement | null = null
afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  container?.remove()
  root = null
  container = null
})

describe('Grafiken in Karten verwalten', () => {
  it('zeigt nur für passende Originalkarten einen aufklappbaren Grafik-Eintrag', async () => {
    fixture.cards = [
      card('newinfo-domain1-5fd591ee19f1274007bd', '>> CORRECT: C |\n\nErklärung'),
      card('newinfo-domain1-6af1b4dc380a1a7e2fe1', '>> CORRECT: D |\n\nAnderer Antwortschlüssel'),
    ]
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => root?.render(<HomeDeckCardsModal deck={deck} language="de" onClose={() => undefined} />))

    const button = container.querySelector<HTMLButtonElement>('button[aria-controls^="deck-card-visual-"]')
    const filter = container.querySelector<HTMLInputElement>('input[type="checkbox"]')
    expect(container.textContent).toContain('Nur Karten mit Grafik (1)')
    expect(container.querySelectorAll('[data-managed-card-id]')).toHaveLength(2)
    expect(container.querySelectorAll('button[aria-controls^="deck-card-visual-"]')).toHaveLength(1)
    expect(button?.getAttribute('aria-expanded')).toBe('false')
    expect(container.querySelector('[data-diagram]')).toBeNull()

    await act(async () => button?.click())
    expect(button?.getAttribute('aria-expanded')).toBe('true')
    expect(container.querySelector('[data-diagram="zero-trust"]')).not.toBeNull()

    await act(async () => button?.click())
    expect(container.querySelector('[data-diagram]')).toBeNull()

    await act(async () => filter?.click())
    expect(filter?.checked).toBe(true)
    expect(container.querySelectorAll('[data-managed-card-id]')).toHaveLength(1)
    expect(container.querySelector('[data-managed-card-id="newinfo-domain1-5fd591ee19f1274007bd"]')).not.toBeNull()

    await act(async () => filter?.click())
    expect(filter?.checked).toBe(false)
    expect(container.querySelectorAll('[data-managed-card-id]')).toHaveLength(2)
  })

  it('zeigt einen Leerzustand, wenn das Deck keine passende Grafik hat', async () => {
    fixture.cards = [card('without-graphic', '>> CORRECT: C |\n\nErklärung')]
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => root?.render(<HomeDeckCardsModal deck={deck} language="de" onClose={() => undefined} />))

    expect(container.textContent).toContain('Nur Karten mit Grafik (0)')
    await act(async () => container?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.click())
    expect(container.querySelectorAll('[data-managed-card-id]')).toHaveLength(0)
    expect(container.textContent).toContain('In diesem Deck gibt es noch keine Karten mit Grafik.')
  })
})
