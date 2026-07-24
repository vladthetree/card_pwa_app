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
    name: 'Neo-Brutalismus',
    primary: '#FF6B6B',
    secondary: '#C4B5FD',
    accent: '#FFD93D',
    background: '#FFFDF5',
    floor: '#FFFDF5',
    card: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceHover: '#FFD93D',
    panel: '#C4B5FD',
    panelHover: '#FFD93D',
    border: '#000000',
    borderStrong: '#000000',
    borderHover: '#000000',
    text: '#000000',
    textSecondary: 'rgba(0,0,0,0.72)',
    textMuted: '#000000',
    subtle: '#000000',
    codeBg: '#FFFFFF',
    cardBorder: '#000000',
    glow: 'rgba(255,107,107,0.18)',
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
  // Frühere Theme-Keys werden bewusst auf das einzige aktuelle System
  // migriert. Eine Auswahl gibt es erst wieder, wenn weitere Designs fertig
  // und vollständig durch alle Ansichten gezogen sind.
  void value
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
    // Das einzige visuelle Grundsystem ist appweit Neo-Brutalismus. Die Klasse
    // sitzt auf body, damit auch Portale und Modale dieselben Tokens erben.
    document.body.classList.add('neo-app')
    const themeColor = getThemeChromeColor(themeKey)
    const [primaryR, primaryG, primaryB] = hexToRgbTuple(theme.primary)
    const [secondaryR, secondaryG, secondaryB] = hexToRgbTuple(theme.secondary)

    root.setAttribute('data-theme', 'neo')

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
