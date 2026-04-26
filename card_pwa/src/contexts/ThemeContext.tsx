import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { STORAGE_KEYS } from '../constants/appIdentity'

/**
 * Theme definitions with CSS custom properties
 */
export const THEMES = {
  default: {
    name: 'Default',
    primary: '#f97316',
    secondary: '#3b82f6',
    accent: '#fdba74',
    background: '#050505',
    surface: '#0c0c0c',
    surfaceHover: '#111111',
    border: '#18181b',
    borderHover: '#3f3f46',
    text: '#f0ede8',
    textSecondary: 'rgba(240,237,232,0.72)',
    textMuted: '#71717a',
    glow: 'rgba(249,115,22,0.22)',
  },
  ghost: {
    name: 'Ghost',
    primary: '#f8fafc',
    secondary: '#94a3b8',
    accent: '#d4d4d8',
    background: '#050505',
    surface: '#0c0c0c',
    surfaceHover: '#111111',
    border: '#18181b',
    borderHover: '#3f3f46',
    text: '#f8fafc',
    textSecondary: 'rgba(248,250,252,0.72)',
    textMuted: '#71717a',
    glow: 'rgba(248,250,252,0.16)',
  },
  blueSteel: {
    name: 'Blue Steel',
    primary: '#64748b',
    secondary: '#38bdf8',
    accent: '#93c5fd',
    background: '#050505',
    surface: '#0c0c0c',
    surfaceHover: '#111111',
    border: '#18181b',
    borderHover: '#3f3f46',
    text: '#e5edf6',
    textSecondary: 'rgba(229,237,246,0.72)',
    textMuted: '#71717a',
    glow: 'rgba(56,189,248,0.18)',
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
    case 'blueSteel':
      return '#050505'
    case 'ghost':
      return '#050505'
    case 'default':
      return '#050505'
    default:
      return '#050505'
  }
}

function normalizeSavedThemeKey(value: string | null): ThemeKey {
  if (!value) return 'default'
  if (value === 'blue-steel' || value === 'blue_steel' || value === 'bluesteel') return 'blueSteel'
  if (value === 'dark') return 'ghost'
  if (value === 'paper' || value === 'slate' || value === 'aurora' || value === 'ocean' || value === 'forest' || value === 'cyber' || value === 'midnight') return 'blueSteel'
  if (value === 'ember' || value === 'sunset') return 'default'
  if (value in THEMES) return value as ThemeKey
  return 'default'
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

    root.setAttribute('data-theme', themeKey === 'blueSteel' ? 'blue-steel' : themeKey)

    root.style.setProperty('--brand-primary', `rgb(${primaryR}, ${primaryG}, ${primaryB})`)
    root.style.setProperty('--brand-primary-08', `rgba(${primaryR}, ${primaryG}, ${primaryB}, 0.08)`)
    root.style.setProperty('--brand-primary-12', `rgba(${primaryR}, ${primaryG}, ${primaryB}, 0.12)`)
    root.style.setProperty('--brand-primary-15', `rgba(${primaryR}, ${primaryG}, ${primaryB}, 0.15)`)
    root.style.setProperty('--brand-primary-20', `rgba(${primaryR}, ${primaryG}, ${primaryB}, 0.20)`)
    root.style.setProperty('--brand-primary-25', `rgba(${primaryR}, ${primaryG}, ${primaryB}, 0.25)`)
    root.style.setProperty('--brand-primary-50', `rgba(${primaryR}, ${primaryG}, ${primaryB}, 0.50)`)
    root.style.setProperty('--brand-primary-80', `rgba(${primaryR}, ${primaryG}, ${primaryB}, 0.80)`)
    root.style.setProperty('--brand-primary-100', `rgba(${primaryR}, ${primaryG}, ${primaryB}, 1)`)

    root.style.setProperty('--brand-secondary', `rgb(${secondaryR}, ${secondaryG}, ${secondaryB})`)
    root.style.setProperty('--brand-secondary-08', `rgba(${secondaryR}, ${secondaryG}, ${secondaryB}, 0.08)`)
    root.style.setProperty('--brand-secondary-12', `rgba(${secondaryR}, ${secondaryG}, ${secondaryB}, 0.12)`)
    root.style.setProperty('--brand-secondary-15', `rgba(${secondaryR}, ${secondaryG}, ${secondaryB}, 0.15)`)
    root.style.setProperty('--brand-secondary-20', `rgba(${secondaryR}, ${secondaryG}, ${secondaryB}, 0.20)`)
    root.style.setProperty('--brand-secondary-25', `rgba(${secondaryR}, ${secondaryG}, ${secondaryB}, 0.25)`)
    root.style.setProperty('--brand-secondary-50', `rgba(${secondaryR}, ${secondaryG}, ${secondaryB}, 0.50)`)
    root.style.setProperty('--brand-secondary-80', `rgba(${secondaryR}, ${secondaryG}, ${secondaryB}, 0.80)`)
    root.style.setProperty('--brand-secondary-100', `rgba(${secondaryR}, ${secondaryG}, ${secondaryB}, 1)`)

    root.style.setProperty('--ds-accent-primary', theme.primary)
    root.style.setProperty('--ds-accent-secondary', theme.secondary)

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
