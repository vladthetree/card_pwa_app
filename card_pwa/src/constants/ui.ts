const T = 'transition-all duration-300 ease-out'

export const UI_TOKENS = {
  layout: {
    homeMaxWidth: 'max-w-5xl',
    contentPadding: 'px-4 py-10',
  },

  // ─── Radius scale ──────────────────────────────────────────────────────────
  radius: {
    sm: 'rounded-lg',           // 8px  – small chips, kbd tags
    md: 'rounded-xl',           // 12px – surface panels, inputs
    lg: 'rounded-2xl',          // 16px – buttons, badges, cards
    xl: 'rounded-[1.35rem]',    // 22px – flashcard face
    modal: 'rounded-[2.5rem]',  // 40px – full modal shells
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
    again: 'bg-gradient-to-b from-[#2d0f14] to-[#1a080b] border-[#3f1520] ring-1 ring-rose-500/15 shadow-[0_0_18px_rgba(225,29,72,0.12)] text-rose-400 hover:from-[#3a131a] hover:to-[#2d0f14]',
    hard:  'bg-gradient-to-b from-[#271a08] to-[#170e04] border-[#3a2510] ring-1 ring-amber-500/15 shadow-[0_0_18px_rgba(245,158,11,0.12)] text-amber-400 hover:from-[#382310] hover:to-[#271a08]',
    good:  'bg-gradient-to-b from-[#0e1828] to-[#09101e] border-[#1a2c44] ring-1 ring-blue-500/15 shadow-[0_0_18px_rgba(59,130,246,0.12)] text-blue-300 hover:from-[#152038] hover:to-[#0e1828]',
    easy:  'bg-gradient-to-b from-[#072b1a] to-[#03140b] border-[#0d3f26] ring-1 ring-emerald-500/15 shadow-[0_0_18px_rgba(16,185,129,0.12)] text-emerald-300 hover:from-[#0d3a22] hover:to-[#072b1a]',
  },

  header: {
    row: 'flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/55 px-2.5 py-2 backdrop-blur-sm sm:mb-2 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none',
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
    panel:    `rounded-xl border border-white/15 bg-black/35 p-4 ${T}`,
    panelSoft: 'rounded-xl border border-white/10 bg-white/[0.03] p-3',
  },

  modal: {
    overlay:     'fixed inset-0 z-[1000] flex items-center justify-center pl-[calc(var(--safe-left)+0.75rem)] pr-[calc(var(--safe-right)+0.75rem)] sm:px-4',
    backdrop:    'absolute inset-0 bg-black/[0.82] backdrop-blur-md',
    shell:       `relative w-full max-h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom)_-_2rem)] rounded-[2rem] sm:rounded-[2.5rem] border border-white/15 bg-slate-950/95 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/45 ${T}`,
    header:      'sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-white/10 bg-black/40 backdrop-blur-xl',
    title:       'text-white font-black text-lg uppercase tracking-[0.12em]',
    subtitle:    'text-xs text-white/50 mt-0.5',
    closeButton: `p-2 rounded-xl text-white/45 hover:text-white hover:bg-white/10 ${T} active:scale-95 min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center`,
    body:        'overflow-y-auto px-4 py-4 sm:px-5 sm:py-5',
    footer:      'sticky bottom-0 px-5 py-4 border-t border-white/10 flex gap-3 bg-black/40 backdrop-blur-xl',
  },

  input: {
    base:     `w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus-visible:border-white/40 focus-visible:ring-2 focus-visible:ring-orange-500/25 ${T}`,
    textarea: `w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-sm text-white outline-none focus-visible:border-white/40 focus-visible:ring-2 focus-visible:ring-orange-500/25 resize-y ${T}`,
  },

  button: {
    // Mobile-first: keep interactive targets close to iOS's 44x44pt guidance.
    ghost:         `px-3 py-1.5 rounded-2xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 ${T} active:scale-95 text-xs`,
    iconGhost:     `flex min-h-11 min-w-11 items-center gap-2 px-3 py-2 rounded-2xl glass-hover text-white/60 hover:text-white/80 ${T} active:scale-95 sm:min-h-0 sm:min-w-0 sm:py-1.5`,
    secondary:     `py-2 px-3 rounded-2xl text-xs border ${T} active:scale-95 border-white/15 text-white/70 hover:text-white hover:border-white/30`,
    secondaryActive: `py-2 px-3 rounded-2xl text-xs border ${T} active:scale-95 border-white/40 bg-white/15 text-white`,
    footerSecondary: `flex-1 py-3 rounded-2xl border border-white/20 text-white/80 hover:text-white hover:border-white/35 ${T} active:scale-95`,
    footerPrimary:   `flex-1 py-3 rounded-2xl bg-white text-black hover:bg-white/90 font-semibold ${T} active:scale-95 disabled:opacity-60`,
    // Min 44×44px icon button for iOS touch targets
    iconAction:    `flex items-center justify-center w-11 h-11 rounded-2xl border border-white/20 text-white/55 hover:text-white/90 hover:border-white/35 hover:bg-white/5 ${T} active:scale-95`,
    // Compact 36px icon button for dense UI (desktop / secondary controls)
    iconCompact:   `flex items-center justify-center w-9 h-9 rounded-xl border border-white/20 text-white/55 hover:text-white/90 hover:border-white/35 ${T} active:scale-95`,
  },
} as const
