/**
 * AI_CONTEXT:
 * Role: UI-only overlay stack state; stores ids and lightweight payloads, not
 * form drafts or persistent domain data.
 */
export type CloseReason = 'escape' | 'backdrop' | 'close-button' | 'cancel' | 'submit' | 'programmatic'

export interface OverlayEntry<Payload = unknown> {
  id: string
  payload?: Payload
  dismissible?: boolean
  openedAt: number
}

export interface OverlaySlice {
  overlayStack: OverlayEntry[]
  lastCloseReason: CloseReason | null
  openOverlay: <Payload = unknown>(entry: Omit<OverlayEntry<Payload>, 'openedAt'>) => void
  closeOverlay: (id?: string, reason?: CloseReason) => void
  setActivePayload: <Payload = unknown>(id: string, payload: Payload) => void
  topOverlayId: () => string | null
}

export interface OverlaySliceState {
  overlayStack: OverlayEntry[]
  lastCloseReason: CloseReason | null
}

export const initialOverlayState: OverlaySliceState = {
  overlayStack: [],
  lastCloseReason: null,
}

