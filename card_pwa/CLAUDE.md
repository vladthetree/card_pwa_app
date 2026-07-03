# Edge-to-Edge Safe-Area Architecture

## Goal
- Render edge-to-edge on modern mobile devices.
- Keep safe-area handling local to components that need it.
- Avoid global wrappers, notch fillers, and legacy CSS variables.

## iOS 26 Chrome (Liquid Glass) — verified fix, July 2026
Symptom was a visible black band in the home-indicator zone (below the screen
rounding) on iPhone only. Root causes and the rules that keep it fixed:

- **No legacy Apple metas in `index.html`.** `apple-mobile-web-app-capable`,
  `apple-mobile-web-app-status-bar-style` (`black-translucent`), and
  `apple-touch-fullscreen` MUST stay removed: since iOS 26.1,
  `black-translucent` renders the status/home zones as opaque black bars.
  Standalone mode comes solely from the manifest (`display: standalone`).
- **iOS 26 ignores `theme-color` for bar tinting.** It samples
  `position: fixed`/`sticky` elements near the viewport edges (including ones
  hidden with `opacity: 0` — unload hidden fixed overlays with `display: none`
  or unmount them, never `opacity: 0`) and otherwise falls back to the explicit
  `background-color` on `html`/`body` (set in `index.css`; keep it).
- **Chrome-color contract:** `--ds-bg` (index.css), `meta theme-color`
  (index.html), and `theme_color`/`background_color` (manifest.json) must all
  carry the same value; `getThemeChromeColor` (ThemeContext) returns the
  per-theme background. Android still reads these; drift brings the band back
  on older iOS.
- After changing metas or manifest colors, iOS only picks them up when the app
  is **removed from the home screen and re-added** (they are baked in at
  install time). Reference: https://1ar.io/updates/safari-26-liquid-glass-web/

`npm run check:safe-area` enforces the banned metas and the color contract.

## Rules
- Do not use `var(--safe-top)`, `var(--safe-bottom)`, `var(--safe-left)`, or `var(--safe-right)`.
- Do not use `--theme-notch`, `.safe-area-top`, or `.safe-area-bottom`.
- Use Tailwind safe-area utilities from `tailwind.config.js`:
  - `pt-safe`, `pb-safe`, `pl-safe`, `pr-safe`, `px-safe`, `py-safe`
  - `pt-safe-2`, `pt-safe-4`, `pb-safe-2`, `pb-safe-3`, `pb-safe-4`, `px-safe-4`
  - `top-safe`, `bottom-safe`, `bottom-safe-3`, `bottom-safe-4`, `left-safe-4`, `right-safe-4`
  - `max-h-screen-safe`, `h-screen-safe`
- For values that combine safe-area with custom spacing not covered by utilities, use `env(safe-area-inset-*, 0px)` directly.

## App Shell
- `App.tsx` must not add global safe-area padding.
- Components own their safe-area behavior.

## Guard
- Run `npm run check:safe-area` to detect forbidden legacy patterns.
- `npm run verify:phase5` includes this check.
