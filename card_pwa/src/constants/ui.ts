/**
 * AI_CONTEXT: Shared constants for ui; centralizes app identity, animation, or UI values used across modules.
 */
const T = 'transition-all duration-100 ease-linear'
const Z_INDEX = {
  base: 'z-0',
  dropdown: 'z-50',
  overlay: 'z-[1000]',
  overlayNested: 'z-[1100]',
  toast: 'z-[1150]',
  splash: 'z-[1200]',
} as const

export const UI_TOKENS = {
  zIndex: Z_INDEX,

  layout: {
    // 7xl bleibt bis 2xl der Rahmen (Tablet/kleine Desktops); ab 1536px+
    // (z. B. 1920x1080) nutzt die Home-Spalte mehr Breite statt an den
    // Rändern leerzulaufen (Nutzerwunsch 2026-08-06, Desktop-Optimierung).
    homeMaxWidth: 'max-w-7xl 2xl:max-w-[1680px]',
    contentPadding: 'px-4 py-10',
  },

  // ─── Radius scale ──────────────────────────────────────────────────────────
  radius: {
    sm: 'rounded-ds-sm',
    md: 'rounded-ds',
    lg: 'rounded-ds-lg',
    xl: 'rounded-ds-lg',
    modal: 'rounded-ds-lg sm:rounded-ds-xl',
  },

  // ─── Icon size scale ───────────────────────────────────────────────────────
  icon: {
    xs:  10,
    sm:  12,
    md:  14,   // default for most UI buttons
    lg:  16,
    xl:  18,
    xxl: 24,
  },

  // ─── Text size scale ───────────────────────────────────────────────────────
  text: {
    caption: 'text-[10px]',                  // timestamp, micro-labels
    micro:   'text-[11px]',                   // stat sub-labels (transition to xs)
    body:    'text-xs',                       // 12px – most secondary text
    base:    'text-sm',                       // 14px – primary body
    title:   'text-lg',                       // 18px – modal titles, section headings
    display: 'text-2xl',                      // 24px – page titles, numbers
  },

  // ─── Rating button colors (replaces inline hex strings in RatingBar) ───────
  rating: {
    again: 'border-red-500/30 bg-red-500/10 text-red-200 hover:border-red-400/45',
    hard:  'border-amber-500/30 bg-amber-500/10 text-amber-200 hover:border-amber-400/45',
    // Häufigste Aktion — visuell gleichwertig zu den gefüllten Nachbar-Buttons halten.
    good:  'border-[--brand-secondary-50] bg-[--brand-secondary-12] text-[--brand-secondary] hover:border-[--brand-secondary]',
    easy:  'border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:border-emerald-400/45',
  },

  header: {
    row: 'flex items-center justify-between gap-2 rounded-ds border border-ds-border bg-ds-bg/86 px-2.5 py-2 backdrop-blur-sm sm:mb-2 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none',
    brand: 'flex min-w-0 items-center gap-2 sm:gap-3',
    title: 'text-2xl font-bold text-theme-text tracking-tight',
    subtitle: 'text-theme-text-secondary text-sm',
  },

  stats: {
    grid: 'mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3',
  },

  storage: {
    minFillPercent: 1,
  },

  surface: {
    panel:    `rounded-ds border border-ds-border bg-ds-card p-4 shadow-card ${T}`,
    panelSoft: 'rounded-ds border border-ds-border bg-ds-floor p-3 shadow-card',
  },

  modal: {
    overlay:     `fixed inset-0 ${Z_INDEX.overlay} flex items-center justify-center px-safe pt-safe-4 pb-4 sm:px-4`,
    backdrop:    'absolute inset-0 bg-black/75',
    shell:       `relative flex min-h-0 w-full max-h-[calc(100dvh-env(safe-area-inset-top,0px)-2rem)] flex-col ds-modal ${T}`,
    header:      'sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b-4 border-black bg-[#FFD93D] px-5 py-4',
    title:       'text-black font-black uppercase text-lg leading-tight break-words',
    subtitle:    'mt-0.5 break-words text-xs font-bold text-black',
    closeButton: `ds-icon-button min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] ${T}`,
    body:        'min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5',
    footer:      'sticky bottom-0 flex shrink-0 gap-3 border-t-4 border-black bg-[#FFFDF5] px-5 py-4',
  },

  input: {
    base:     `w-full border-[3px] border-black bg-white px-3 py-2.5 text-sm font-bold text-black outline-none focus-visible:bg-[#FFD93D] focus-visible:shadow-[4px_4px_0_0_#000] ${T}`,
    textarea: `w-full resize-y border-[3px] border-black bg-white px-3 py-2 text-sm font-bold text-black outline-none focus-visible:bg-[#FFD93D] focus-visible:shadow-[4px_4px_0_0_#000] ${T}`,
  },

  button: {
    // Mobile-first: keep interactive targets close to iOS's 44x44pt guidance.
    ghost:         `border-2 border-black bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-black shadow-[3px_3px_0_0_#000] hover:bg-[#FFD93D] ${T} active:translate-x-[3px] active:translate-y-[3px] active:shadow-none`,
    iconGhost:     `flex min-h-11 min-w-11 items-center gap-2 px-3 py-2 ds-icon-button ${T} active:scale-[0.98] sm:min-h-0 sm:min-w-0 sm:py-1.5`,
    secondary:     `border-2 border-black bg-white px-3 py-2 text-xs font-bold uppercase text-black shadow-[3px_3px_0_0_#000] ${T} active:translate-x-[3px] active:translate-y-[3px] active:shadow-none`,
    secondaryActive: `border-2 border-black bg-[#C4B5FD] px-3 py-2 text-xs font-bold uppercase text-black shadow-[3px_3px_0_0_#000] ${T} active:translate-x-[3px] active:translate-y-[3px] active:shadow-none`,
    footerSecondary: `flex-1 border-2 border-black bg-white py-3 font-bold uppercase text-black shadow-[3px_3px_0_0_#000] ${T} active:translate-x-[3px] active:translate-y-[3px] active:shadow-none`,
    footerPrimary:   `flex-1 border-2 border-black bg-[#FF6B6B] py-3 font-bold uppercase text-black shadow-[3px_3px_0_0_#000] ${T} active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-60`,
    // Min 44×44px icon button for iOS touch targets
    iconAction:    `ds-icon-button flex w-11 h-11 ${T} active:scale-[0.98]`,
    // Compact 36px icon button for dense UI (desktop / secondary controls)
    iconCompact:   `ds-icon-button flex w-9 h-9 ${T} active:scale-[0.98]`,
  },
} as const
