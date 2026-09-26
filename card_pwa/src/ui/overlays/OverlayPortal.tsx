/**
 * AI_CONTEXT:
 * Role: Shared portal and page-isolation boundary for every overlay primitive.
 * It reference-counts body scroll locking and background inertness so nested
 * overlays cannot restore the page while another overlay remains open.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const PORTAL_ID = 'card-pwa-overlay-root'

interface SiblingSnapshot {
  element: HTMLElement
  inert: boolean
  ariaHidden: string | null
}

let activeOverlayCount = 0
let previousBodyOverflow = ''
let previousBodyPaddingRight = ''
let isolatedSiblings: SiblingSnapshot[] = []

function getPortalRoot(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  const existing = document.getElementById(PORTAL_ID)
  if (existing instanceof HTMLElement) return existing

  const root = document.createElement('div')
  root.id = PORTAL_ID
  root.dataset.overlayPortal = 'true'
  document.body.appendChild(root)
  return root
}

function isolatePage(portalRoot: HTMLElement): void {
  previousBodyOverflow = document.body.style.overflow
  previousBodyPaddingRight = document.body.style.paddingRight
  const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth)
  document.body.style.overflow = 'hidden'
  if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`

  isolatedSiblings = Array.from(document.body.children)
    .filter((child): child is HTMLElement => child instanceof HTMLElement && child !== portalRoot)
    .map(element => ({
      element,
      inert: element.inert,
      ariaHidden: element.getAttribute('aria-hidden'),
    }))

  for (const snapshot of isolatedSiblings) {
    snapshot.element.inert = true
    snapshot.element.setAttribute('aria-hidden', 'true')
  }
}

function restorePage(): void {
  document.body.style.overflow = previousBodyOverflow
  document.body.style.paddingRight = previousBodyPaddingRight
  for (const snapshot of isolatedSiblings) {
    snapshot.element.inert = snapshot.inert
    if (snapshot.ariaHidden === null) snapshot.element.removeAttribute('aria-hidden')
    else snapshot.element.setAttribute('aria-hidden', snapshot.ariaHidden)
  }
  isolatedSiblings = []
}

export function acquireOverlayEnvironment(portalRoot: HTMLElement): () => void {
  if (activeOverlayCount === 0) isolatePage(portalRoot)
  activeOverlayCount += 1

  let released = false
  return () => {
    if (released) return
    released = true
    activeOverlayCount = Math.max(0, activeOverlayCount - 1)
    if (activeOverlayCount === 0) restorePage()
  }
}

export function OverlayPortal({ children }: { children: ReactNode }) {
  const [portalRoot] = useState(getPortalRoot)

  useEffect(() => {
    if (!portalRoot) return
    return acquireOverlayEnvironment(portalRoot)
  }, [portalRoot])

  if (!portalRoot) return children
  return createPortal(children, portalRoot)
}

