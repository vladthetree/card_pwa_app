/**
 * UC-3  Card type detection and routing
 *
 * The app renders three fundamentally different card UIs:
 *   - ordering  → drag-and-drop reorder list  (ORDERING: prefix)
 *   - matching  → tap-to-connect pairs        (MATCHING: prefix)
 *   - standard  → classic Q/A flip card
 *
 * getCardVariant() is the single decision point for which UI is shown.
 * A wrong detection means the user sees the wrong renderer.
 */
import { describe, expect, it } from 'vitest'
import { getCardVariant } from '../../utils/cardVariant'

describe('UC-3  Card variant detection (getCardVariant)', () => {
  // ── Ordering ────────────────────────────────────────────────────────────────

  it('UC-3a: detects ordering variant from ORDERING: prefix', () => {
    const front = `ORDERING:\nBringe die NIST-IR-Phasen in die richtige Reihenfolge.\n\n1) Containment\n2) Preparation`
    expect(getCardVariant(front)).toBe('ordering')
  })

  it('UC-3b: ordering detection is case-insensitive', () => {
    expect(getCardVariant('ordering:\nsome items')).toBe('ordering')
    expect(getCardVariant('Ordering:\nsome items')).toBe('ordering')
    expect(getCardVariant('ORDERING:\nsome items')).toBe('ordering')
  })

  it('UC-3c: ordering prefix with leading whitespace is still detected', () => {
    expect(getCardVariant('  ORDERING:\nsome items')).toBe('ordering')
  })

  // ── Matching ─────────────────────────────────────────────────────────────────

  it('UC-3d: detects matching variant from MATCHING: prefix', () => {
    const front = `MATCHING:\nOrdne die Ports den Protokollen zu.\n\n22 >> SSH\n443 >> HTTPS`
    expect(getCardVariant(front)).toBe('matching')
  })

  it('UC-3e: matching detection is case-insensitive', () => {
    expect(getCardVariant('matching:\nsome pairs')).toBe('matching')
    expect(getCardVariant('Matching:\nsome pairs')).toBe('matching')
    expect(getCardVariant('MATCHING:\nsome pairs')).toBe('matching')
  })

  it('UC-3f: matching prefix with leading whitespace is still detected', () => {
    expect(getCardVariant('  MATCHING:\nsome pairs')).toBe('matching')
  })

  // ── Standard ─────────────────────────────────────────────────────────────────

  it('UC-3g: plain question text → standard variant', () => {
    expect(getCardVariant('Which port does SSH use?')).toBe('standard')
  })

  it('UC-3h: multi-choice question text → standard variant', () => {
    const front = `Which of the following is a symmetric cipher?\nA) RSA\nB) AES\nC) ECC\nD) DSA`
    expect(getCardVariant(front)).toBe('standard')
  })

  it('UC-3i: text that contains ORDERING or MATCHING mid-sentence → standard', () => {
    // The prefix must appear at the START of the trimmed text
    expect(getCardVariant('What does ORDERING mean in security?')).toBe('standard')
    expect(getCardVariant('Explain MATCHING algorithms.')).toBe('standard')
  })

  it('UC-3j: empty string → standard variant (no crash)', () => {
    expect(getCardVariant('')).toBe('standard')
  })
})
