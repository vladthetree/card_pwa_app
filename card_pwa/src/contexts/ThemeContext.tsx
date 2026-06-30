/**
 * AI_CONTEXT: React context for theme Context; provides global settings/theme state to the application tree.
 */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { STORAGE_KEYS } from '../constants/appIdentity'

/**
 * Theme definitions with CSS custom properties
 */
export const THEMES = {
  default: {
    name: 'Ledger',
    primary: '#e75f3c',
    secondary: '#79b7aa',
    accent: '#d8a24c',
    background: '#0b0b09',
    surface: '#15130f',
    surfaceHover: '#1b1812',
    border: '#2b271f',
    borderHover: '#574c3f',
    text: '#f2eee5',
    textSecondary: 'rgba(242,238,229,0.70)',
    textMuted: '#837c6f',
    glow: 'rgba(231,95,60,0.16)',
  },
  ghost: {
    name: 'Ghost',
    primary: '#f2eee5',
    secondary: '#9ea79d',
    accent: '#c8bfae',
    background: '#090908',
    surface: '#121210',
    surfaceHover: '#191815',
    border: '#282720',
    borderHover: '#555044',
    text: '#f6f2eb',
    textSecondary: 'rgba(246,242,235,0.70)',
    textMuted: '#807a6c',
    glow: 'rgba(246,242,235,0.10)',
  },
  blueSteel: {
    name: 'Slate Reed',
    primary: '#8aa39b',
    secondary: '#d2a45c',
    accent: '#b8c2bb',
    background: '#080a0a',
    surface: '#101413',
    surfaceHover: '#171d1b',
    border: '#22302c',
    borderHover: '#4a635b',
    text: '#e8eee9',
    textSecondary: 'rgba(232,238,233,0.70)',
    textMuted: '#748078',
    glow: 'rgba(138,163,155,0.14)',
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
const APP_CHROME_COLOR = '#0b0b09'

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
      return APP_CHROME_COLOR
    case 'ghost':
      return APP_CHROME_COLOR
    case 'default':
      return APP_CHROME_COLOR
    default:
      return APP_CHROME_COLOR
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
