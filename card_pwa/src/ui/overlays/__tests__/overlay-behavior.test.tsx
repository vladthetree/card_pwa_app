// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Dialog } from '../Dialog'
import { resetAppStoreForTests } from '../../../state/appStore'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const nextFrame = () => new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()))

describe('Dialog browser behavior', () => {
  let root: Root
  let mountNode: HTMLDivElement
  let trigger: HTMLButtonElement
  let appNode: HTMLElement

  beforeEach(() => {
    resetAppStoreForTests()
    document.body.innerHTML = ''
    appNode = document.createElement('main')
    appNode.id = 'app'
    trigger = document.createElement('button')
    trigger.textContent = 'Open'
    appNode.appendChild(trigger)
    document.body.appendChild(appNode)
    mountNode = document.createElement('div')
    document.body.appendChild(mountNode)
    root = createRoot(mountNode)
    trigger.focus()
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    document.body.innerHTML = ''
    resetAppStoreForTests()
  })

  it('connects ARIA, isolates the page, traps focus and restores it', async () => {
    const onClose = vi.fn()
    await act(async () => {
      root.render(
        <Dialog
          title="Test dialog"
          subtitle="Useful description"
          closeLabel="Close dialog"
          onClose={onClose}
        >
          <button type="button">First action</button>
          <button type="button">Last action</button>
        </Dialog>,
      )
      await nextFrame()
    })

    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog?.getAttribute('aria-modal')).toBe('true')
    expect(document.getElementById(dialog?.getAttribute('aria-labelledby') ?? '')?.textContent).toBe('Test dialog')
    expect(document.getElementById(dialog?.getAttribute('aria-describedby') ?? '')?.textContent).toBe('Useful description')
    expect(appNode.inert).toBe(true)
    expect(appNode.getAttribute('aria-hidden')).toBe('true')
    expect(document.body.style.overflow).toBe('hidden')
    expect(dialog?.contains(document.activeElement)).toBe(true)

    const focusable = Array.from(dialog?.querySelectorAll<HTMLElement>('button') ?? [])
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    last.focus()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }))
    expect(document.activeElement).toBe(first)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(onClose).toHaveBeenCalledWith('escape')

    await act(async () => {
      root.render(<></>)
      await nextFrame()
    })
    expect(appNode.inert).toBe(false)
    expect(appNode.hasAttribute('aria-hidden')).toBe(false)
    expect(document.body.style.overflow).toBe('')
    expect(document.activeElement).toBe(trigger)
  })

  it('routes Escape only to the topmost nested overlay', async () => {
    const closeParent = vi.fn()
    const closeChild = vi.fn()
    await act(async () => {
      root.render(
        <>
          <Dialog title="Parent" closeLabel="Close parent" onClose={closeParent}>
            Parent body
          </Dialog>
          <Dialog title="Child" closeLabel="Close child" onClose={closeChild}>
            Child body
          </Dialog>
        </>,
      )
      await nextFrame()
    })

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(closeChild).toHaveBeenCalledWith('escape')
    expect(closeParent).not.toHaveBeenCalled()
  })
})
