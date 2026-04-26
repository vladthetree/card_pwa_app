const T = 'transition-all duration-300 ease-out'

export const UI_TOKENS = {
  layout: {
    homeMaxWidth: 'max-w-5xl',
    contentPadding: 'px-4 py-10',
  },

  // ─── Radius scale ──────────────────────────────────────────────────────────
  radius: {
    sm: 'rounded-[6px]',
    md: 'rounded-[12px]',
    lg: 'rounded-[14px]',
    xl: 'rounded-[14px]',
    modal: 'rounded-[1.5rem] sm:rounded-[2rem]',
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
    again: 'bg-red-950/70 text-red-300 hover:brightness-[1.15]',
    hard:  'bg-orange-950/70 text-yellow-300 hover:brightness-[1.15]',
    good:  'bg-blue-950/80 text-blue-300 hover:brightness-[1.15]',
    easy:  'bg-green-950/80 text-green-300 hover:brightness-[1.15]',
  },

  header: {
    row: 'flex items-center justify-between gap-2 rounded-[14px] border border-ds-border bg-[#050505]/85 px-2.5 py-2 shadow-card backdrop-blur-sm sm:mb-2 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none sm:backdrop-blur-none',
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
    panel:    `rounded-[14px] border border-ds-border bg-ds-card p-4 shadow-card ${T}`,
    panelSoft: 'rounded-[12px] border border-ds-border bg-ds-floor p-3 shadow-card',
  },

  modal: {
    overlay:     'fixed inset-0 z-[1000] flex items-center justify-center px-safe pt-safe-4 pb-4 sm:px-4',
    backdrop:    'absolute inset-0 bg-black/[0.82] backdrop-blur-md',
    shell:       `relative w-full max-h-[calc(100dvh-env(safe-area-inset-top,0px)-2rem)] ds-modal ${T}`,
    header:      'sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-ds-border bg-[#050505]/95 backdrop-blur-xl',
    title:       'text-white font-black text-lg uppercase tracking-[0.12em]',
    subtitle:    'text-xs text-white/50 mt-0.5',
    closeButton: `ds-icon-button min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] ${T}`,
    body:        'overflow-y-auto px-4 py-4 sm:px-5 sm:py-5',
    footer:      'sticky bottom-0 px-5 py-4 border-t border-ds-border flex gap-3 bg-[#050505]/95 backdrop-blur-xl',
  },

  input: {
    base:     `w-full bg-ds-card border border-ds-border rounded-[12px] px-3 py-2.5 text-white text-sm outline-none focus-visible:border-ds-border-hover focus-visible:ring-2 focus-visible:ring-orange-500/25 ${T}`,
    textarea: `w-full rounded-[12px] bg-ds-card border border-ds-border px-3 py-2 text-sm text-white outline-none focus-visible:border-ds-border-hover focus-visible:ring-2 focus-visible:ring-orange-500/25 resize-y ${T}`,
  },

  button: {
    // Mobile-first: keep interactive targets close to iOS's 44x44pt guidance.
    ghost:         `px-3 py-1.5 rounded-[12px] border border-ds-border bg-ds-card text-white/80 hover:text-white hover:border-ds-border-hover hover:bg-[#111] ${T} active:scale-95 text-xs`,
    iconGhost:     `flex min-h-11 min-w-11 items-center gap-2 px-3 py-2 ds-icon-button ${T} active:scale-95 sm:min-h-0 sm:min-w-0 sm:py-1.5`,
    secondary:     `py-2 px-3 rounded-[12px] text-xs border ${T} active:scale-95 border-ds-border bg-ds-card text-white/70 hover:text-white hover:border-ds-border-hover`,
    secondaryActive: `py-2 px-3 rounded-[12px] text-xs border ${T} active:scale-95 border-ds-border-hover bg-ds-panel text-white`,
    footerSecondary: `flex-1 py-3 rounded-[12px] border border-ds-border bg-ds-card text-white/80 hover:text-white hover:border-ds-border-hover ${T} active:scale-95`,
    footerPrimary:   `flex-1 py-3 rounded-[12px] bg-white text-black hover:bg-white/90 font-semibold ${T} active:scale-95 disabled:opacity-60`,
    // Min 44×44px icon button for iOS touch targets
    iconAction:    `ds-icon-button flex w-11 h-11 ${T} active:scale-95`,
    // Compact 36px icon button for dense UI (desktop / secondary controls)
    iconCompact:   `ds-icon-button flex w-9 h-9 ${T} active:scale-95`,
  },
} as const
