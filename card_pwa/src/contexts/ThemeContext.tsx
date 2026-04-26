import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { STORAGE_KEYS } from '../constants/appIdentity'

/**
 * Theme definitions with CSS custom properties
 */
export const THEMES = {
  ghost: {
    name: 'Ghost',
    primary: '#f8fafc',
    secondary: '#94a3b8',
    accent: '#94a3b8',
    background: 'linear-gradient(135deg, #050505 0%, #050505 100%)',
    surface: 'rgba(248,250,252,0.06)',
    surfaceHover: 'rgba(248,250,252,0.10)',
    border: 'rgba(248,250,252,0.22)',
    borderHover: 'rgba(248,250,252,0.34)',
    text: '#f8fafc',
    textSecondary: 'rgba(248,250,252,0.72)',
    textMuted: 'rgba(248,250,252,0.52)',
    glow: 'rgba(148,163,184,0.35)',
  },
  aurora: {
    name: 'Aurora',
    primary: '#22d3ee',
    secondary: '#818cf8',
    accent: '#34d399',
    background: 'linear-gradient(135deg, #071018 0%, #0b1220 52%, #111827 100%)',
    surface: 'rgba(255,255,255,0.05)',
    surfaceHover: 'rgba(255,255,255,0.09)',
    border: 'rgba(129,140,248,0.24)',
    borderHover: 'rgba(34,211,238,0.36)',
    text: '#ecfeff',
    textSecondary: 'rgba(236,254,255,0.74)',
    textMuted: 'rgba(236,254,255,0.50)',
    glow: 'rgba(34,211,238,0.32)',
  },
  ember: {
    name: 'Ember',
    primary: '#fb923c',
    secondary: '#f43f5e',
    accent: '#facc15',
    background: 'linear-gradient(135deg, #140708 0%, #1f0a10 48%, #2a1106 100%)',
    surface: 'rgba(255,255,255,0.04)',
    surfaceHover: 'rgba(255,255,255,0.08)',
    border: 'rgba(251,146,60,0.22)',
    borderHover: 'rgba(244,63,94,0.34)',
    text: '#fff7ed',
    textSecondary: 'rgba(255,237,213,0.72)',
    textMuted: 'rgba(255,237,213,0.50)',
    glow: 'rgba(251,146,60,0.30)',
  },
  slate: {
    name: 'Slate Light',
    primary: '#0f172a',
    secondary: '#334155',
    accent: '#0284c7',
    background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
    surface: 'rgba(15,23,42,0.04)',
    surfaceHover: 'rgba(15,23,42,0.08)',
    border: 'rgba(15,23,42,0.18)',
    borderHover: 'rgba(15,23,42,0.30)',
    text: '#0f172a',
    textSecondary: 'rgba(15,23,42,0.72)',
    textMuted: 'rgba(15,23,42,0.52)',
    glow: 'rgba(2,132,199,0.22)',
  },
} as const

export type ThemeKey = keyof typeof THEMES
export type Theme = typeof THEMES[ThemeKey]

interface ThemeContextType {
  theme: Theme
  themeKey: ThemeKey
  setTheme: (key: ThemeKey) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

function hexToRgbTuple(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '')
  const fullHex = normalized.length === 3
    ? normalized.split('').map(char => `${char}${char}`).join('')
    : normalized

  const parsed = Number.parseInt(fullHex, 16)
  return [
    (parsed >> 16) & 255,
    (parsed >> 8) & 255,
    parsed & 255,
  ]
}

function getThemeChromeColor(key: ThemeKey): string {
  switch (key) {
    case 'slate':
      return '#f8fafc'
    case 'aurora':
      return '#071018'
    case 'ember':
      return '#140708'
    case 'ghost':
      return '#050505'
    default:
      return '#050505'
  }
}

function normalizeSavedThemeKey(value: string | null): ThemeKey {
  if (!value) return 'ghost'
  if (value === 'dark') return 'ghost'
  if (value === 'paper') return 'slate'
  if (value === 'default' || value === 'ocean' || value === 'forest' || value === 'sunset' || value === 'cyber' || value === 'midnight') {
    return 'aurora'
  }
  if (value in THEMES) return value as ThemeKey
  return 'ghost'
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeKey, setThemeKey] = useState<ThemeKey>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.theme)
    return normalizeSavedThemeKey(saved)
  })

  const theme = THEMES[themeKey]

  const setTheme = (key: ThemeKey) => {
    setThemeKey(key)
    localStorage.setItem(STORAGE_KEYS.theme, key)
  }

  // Apply theme to CSS custom properties
  useEffect(() => {
    const root = document.documentElement
    const themeColor = getThemeChromeColor(themeKey)
    const [primaryR, primaryG, primaryB] = hexToRgbTuple(theme.primary)
    const [secondaryR, secondaryG, secondaryB] = hexToRgbTuple(theme.secondary)

    root.style.setProperty('--brand-primary', `rgb(${primaryR}, ${primaryG}, ${primaryB})`)
    root.style.setProperty('--brand-primary-08', `rgba(${primaryR}, ${primaryG}, ${primaryB}, 0.08)`)
    root.style.setProperty('--brand-primary-12', `rgba(${primaryR}, ${primaryG}, ${primaryB}, 0.12)`)
    root.style.setProperty('--brand-primary-15', `rgba(${primaryR}, ${primaryG}, ${primaryB}, 0.15)`)
    root.style.setProperty('--brand-primary-20', `rgba(${primaryR}, ${primaryG}, ${primaryB}, 0.20)`)
    root.style.setProperty('--brand-primary-25', `rgba(${primaryR}, ${primaryG}, ${primaryB}, 0.25)`)
    root.style.setProperty('--brand-primary-50', `rgba(${primaryR}, ${primaryG}, ${primaryB}, 0.50)`)
    root.style.setProperty('--brand-primary-80', `rgba(${primaryR}, ${primaryG}, ${primaryB}, 0.80)`)

    root.style.setProperty('--brand-secondary', `rgb(${secondaryR}, ${secondaryG}, ${secondaryB})`)
    root.style.setProperty('--brand-secondary-08', `rgba(${secondaryR}, ${secondaryG}, ${secondaryB}, 0.08)`)
    root.style.setProperty('--brand-secondary-12', `rgba(${secondaryR}, ${secondaryG}, ${secondaryB}, 0.12)`)
    root.style.setProperty('--brand-secondary-15', `rgba(${secondaryR}, ${secondaryG}, ${secondaryB}, 0.15)`)
    root.style.setProperty('--brand-secondary-20', `rgba(${secondaryR}, ${secondaryG}, ${secondaryB}, 0.20)`)
    root.style.setProperty('--brand-secondary-25', `rgba(${secondaryR}, ${secondaryG}, ${secondaryB}, 0.25)`)

    // Keep legacy variables in sync while migrating components to the manifest brand contract.
    root.style.setProperty('--theme-primary', theme.primary)
    root.style.setProperty('--theme-secondary', theme.secondary)
    root.style.setProperty('--theme-accent', theme.accent)
    root.style.setProperty('--theme-background', theme.background)
    root.style.setProperty('--theme-surface', theme.surface)
    root.style.setProperty('--theme-surface-hover', theme.surfaceHover)
    root.style.setProperty('--theme-border', theme.border)
    root.style.setProperty('--theme-border-hover', theme.borderHover)
    root.style.setProperty('--theme-text', theme.text)
    root.style.setProperty('--theme-text-secondary', theme.textSecondary)
    root.style.setProperty('--theme-text-muted', theme.textMuted)
    root.style.setProperty('--theme-glow', theme.glow)

    const themeMeta = document.querySelector('meta[name="theme-color"]')
    if (themeMeta) {
      themeMeta.setAttribute('content', themeColor)
    }

    document.body.style.backgroundColor = themeColor
  }, [theme, themeKey])

  return (
    <ThemeContext.Provider value={{ theme, themeKey, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}