# Edge-to-Edge Safe-Area Architecture

## Goal
- Render edge-to-edge on modern mobile devices.
- Keep safe-area handling local to components that need it.
- Avoid global wrappers, notch fillers, and legacy CSS variables.

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
