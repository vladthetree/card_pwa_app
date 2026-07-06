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
    name: 'Ember Ledger',
    primary: '#f05f3e',
    secondary: '#8fc7ba',
    accent: '#d9a24a',
    background: '#000000',
    floor: '#070605',
    card: '#11100d',
    surface: '#11100d',
    surfaceHover: '#1f1a12',
    panel: '#17140f',
    panelHover: '#211b13',
    border: '#2a251c',
    borderStrong: '#5d5040',
    borderHover: '#806a52',
    text: '#f7f2e8',
    textSecondary: 'rgba(247,242,232,0.74)',
    textMuted: '#8c8274',
    subtle: '#655d50',
    codeBg: '#17130e',
    cardBorder: 'rgba(255,255,255,0.58)',
    glow: 'rgba(240,95,62,0.16)',
  },
  ghost: {
    name: 'Bone Ink',
    primary: '#f3efe7',
    secondary: '#9fa99c',
    accent: '#c9bfad',
    background: '#000000',
    floor: '#060606',
    card: '#10100e',
    surface: '#10100e',
    surfaceHover: '#191813',
    panel: '#151511',
    panelHover: '#1d1b15',
    border: '#292820',
    borderStrong: '#5a5548',
    borderHover: '#817767',
    text: '#f6f2eb',
    textSecondary: 'rgba(246,242,235,0.72)',
    textMuted: '#837d70',
    subtle: '#625b50',
    codeBg: '#161511',
    cardBorder: 'rgba(255,255,255,0.56)',
    glow: 'rgba(246,242,235,0.10)',
  },
  blueSteel: {
    name: 'Slate Reed',
    primary: '#9bb7ad',
    secondary: '#d6a85e',
    accent: '#c5cfc8',
    background: '#000000',
    floor: '#050707',
    card: '#0d1311',
    surface: '#0d1311',
    surfaceHover: '#17211d',
    panel: '#121a17',
    panelHover: '#1a2520',
    border: '#22312c',
    borderStrong: '#4f6c62',
    borderHover: '#709184',
    text: '#eaf1ed',
    textSecondary: 'rgba(234,241,237,0.72)',
    textMuted: '#77847d',
    subtle: '#56615b',
    codeBg: '#111916',
    cardBorder: 'rgba(255,255,255,0.56)',
    glow: 'rgba(155,183,173,0.14)',
  },
  mono: {
    name: 'Mono Signal',
    primary: '#ffffff',
    secondary: '#d9d9d9',
    accent: '#8f8f8f',
    background: '#000000',
    floor: '#050505',
    card: '#0b0b0b',
    surface: '#0b0b0b',
    surfaceHover: '#151515',
    panel: '#101010',
    panelHover: '#181818',
    border: '#242424',
    borderStrong: '#686868',
    borderHover: '#f0f0f0',
    text: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.76)',
    textMuted: '#8b8b8b',
    subtle: '#5f5f5f',
    codeBg: '#111111',
    cardBorder: 'rgba(255,255,255,0.68)',
    glow: 'rgba(255,255,255,0.12)',
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
const APP_CHROME_COLOR = '#000000'

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
  // Chrome-Farbe (theme-color-Meta + body-Fallback) bleibt bewusst echtes
  // Schwarz, damit iOS Status-/Home-Indicator-Zonen keine getönten Streifen
  // gegen den App-Hintergrund zeigen.
  void key
  return APP_CHROME_COLOR
}

function normalizeSavedThemeKey(value: string | null): ThemeKey {
  if (!value) return 'default'
  if (value === 'blue-steel' || value === 'blue_steel' || value === 'bluesteel') return 'blueSteel'
  if (value === 'mono' || value === 'black-white' || value === 'black_white' || value === 'blackwhite' || value === 'monochrome') return 'mono'
  if (value === 'dark') return 'mono'
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
    root.style.setProperty('--ds-accent-amber', theme.accent)
    root.style.setProperty('--ds-bg', theme.background)
    root.style.setProperty('--ds-floor', theme.floor)
    root.style.setProperty('--ds-card', theme.card)
    root.style.setProperty('--ds-panel', theme.panel)
    root.style.setProperty('--ds-panel-hover', theme.panelHover)
    root.style.setProperty('--ds-border', theme.border)
    root.style.setProperty('--ds-border-strong', theme.borderStrong)
    root.style.setProperty('--ds-border-hover', theme.borderHover)
    root.style.setProperty('--ds-fg', theme.text)
    root.style.setProperty('--ds-text-normal', theme.textSecondary)
    root.style.setProperty('--ds-muted', theme.textMuted)
    root.style.setProperty('--ds-subtle', theme.subtle)
    root.style.setProperty('--ds-code-bg', theme.codeBg)
    root.style.setProperty('--app-background', theme.background)
    root.style.setProperty('--home-bottom-bar-bg', theme.background)
    root.style.setProperty('--card-border-color', theme.cardBorder)

    // Keep legacy variables in sync while migrating components to the manifest brand contract.
    root.style.setProperty('--theme-primary', theme.primary)
    root.style.setProperty('--theme-secondary', theme.secondary)
    root.style.setProperty('--theme-accent', theme.accent)
    root.style.setProperty('--theme-background', theme.background)
    root.style.setProperty('--theme-floor', theme.floor)
    root.style.setProperty('--theme-card', theme.card)
    root.style.setProperty('--theme-surface', theme.surface)
    root.style.setProperty('--theme-surface-hover', theme.surfaceHover)
    root.style.setProperty('--theme-panel', theme.panel)
    root.style.setProperty('--theme-panel-hover', theme.panelHover)
    root.style.setProperty('--theme-border', theme.border)
    root.style.setProperty('--theme-border-strong', theme.borderStrong)
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
