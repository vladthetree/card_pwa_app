/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        glass: {
          DEFAULT: 'var(--theme-surface)',
          border: 'var(--theme-border)',
          hover: 'var(--theme-surface-hover)',
        },
        accent: {
          purple: 'var(--theme-primary)',
          blue: 'var(--theme-secondary)',
          green: 'var(--theme-accent)',
          yellow: '#ffd166',
          red: '#ef476f',
        },
        theme: {
          primary: 'var(--theme-primary)',
          secondary: 'var(--theme-secondary)',
          accent: 'var(--theme-accent)',
          text: 'var(--theme-text)',
          'text-secondary': 'var(--theme-text-secondary)',
          'text-muted': 'var(--theme-text-muted)',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-soft': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['Share Tech Mono', 'IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [
    ({ addUtilities }) => {
      addUtilities({
        '.pt-safe': { paddingTop: 'env(safe-area-inset-top, 0px)' },
        '.pb-safe': { paddingBottom: 'env(safe-area-inset-bottom, 0px)' },
        '.pl-safe': { paddingLeft: 'env(safe-area-inset-left, 0px)' },
        '.pr-safe': { paddingRight: 'env(safe-area-inset-right, 0px)' },
        '.px-safe': {
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        },
        '.py-safe': {
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        },
        '.pt-safe-2': { paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' },
        '.pt-safe-4': { paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' },
        '.pb-safe-2': { paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' },
        '.pb-safe-3': { paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' },
        '.pb-safe-4': { paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' },
        '.px-safe-4': {
          paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 1rem)',
          paddingRight: 'calc(env(safe-area-inset-right, 0px) + 1rem)',
        },
        '.bottom-safe': { bottom: 'env(safe-area-inset-bottom, 0px)' },
        '.bottom-safe-3': { bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' },
        '.bottom-safe-4': { bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' },
        '.top-safe': { top: 'env(safe-area-inset-top, 0px)' },
        '.left-safe-4': { left: 'calc(env(safe-area-inset-left, 0px) + 1rem)' },
        '.right-safe-4': { right: 'calc(env(safe-area-inset-right, 0px) + 1rem)' },
        '.max-h-screen-safe': {
          maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
        },
        '.h-screen-safe': {
          height: 'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
        },
      })
    },
  ],
}
