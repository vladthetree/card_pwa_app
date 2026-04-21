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
  plugins: [],
}
