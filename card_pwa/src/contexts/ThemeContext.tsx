/**
 * AI_CONTEXT: React context for theme Context; provides global settings/theme state to the application tree.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
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
  newsprint: {
    name: 'Newsprint',
    primary: '#CC0000',
    secondary: '#404040',
    accent: '#E5E5E0',
    background: '#F9F9F7',
    floor: '#F9F9F7',
    card: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceHover: '#F5F5F5',
    panel: '#E5E5E0',
    panelHover: '#DCDCD6',
    border: '#111111',
    borderStrong: '#111111',
    borderHover: '#111111',
    text: '#111111',
    textSecondary: '#4D4D4D',
    textMuted: '#595959',
    subtle: '#666666',
    codeBg: '#F5F5F5',
    cardBorder: '#111111',
    glow: 'rgba(204,0,0,0.15)',
  },
  // Optionaler Dunkelmodus des Newsprint-Looks: gleiche CSS-Verträge
  // (Body trägt zusätzlich `newsprint-dark`), nur die Palette invertiert.
  newsprintDark: {
    name: 'Newsprint Dark',
    primary: '#FF6166',
    secondary: '#B3B3AD',
    accent: '#2C2C29',
    // True black canvas lets OLED panels switch off pixels outside cards and
    // controls. Raised content keeps the warmer paper tones below.
    background: '#000000',
    floor: '#141413',
    card: '#1E1E1C',
    surface: '#1E1E1C',
    surfaceHover: '#232320',
    panel: '#2C2C29',
    panelHover: '#343431',
    border: '#E8E8E3',
    borderStrong: '#E8E8E3',
    borderHover: '#E8E8E3',
    text: '#E8E8E3',
    textSecondary: '#C9C9C2',
    textMuted: '#A3A39C',
    subtle: '#8A8A83',
    codeBg: '#232320',
    cardBorder: '#E8E8E3',
    glow: 'rgba(255,97,102,0.2)',
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

export function normalizeSavedThemeKey(value: string | null): ThemeKey {
  if (value !== null && Object.prototype.hasOwnProperty.call(THEMES, value)) {
    return value as ThemeKey
  }
  return 'default'
}

// Lernplan-Views setzen zusätzlich zur Body-Klasse eine lokal gescopte
// Wrapper-Klasse (z.B. `learning-units-neo`/`-newsprint`), deren
// CSS-Block (index.css) dieselben --neo-*-Variablennamen wie .neo-app pro
// Theme neu belegt. 'default' behält den historischen Suffix 'neo';
// Newsprint Dark teilt den Newsprint-Scope (dunkel wird er über die
// Body-Modifier-Klasse `newsprint-dark`, nicht über einen eigenen Scope).
export function themeScopeClass(themeKey: ThemeKey, base: string): string {
  const suffix = themeKey === 'default'
    ? 'neo'
    : themeKey === 'newsprintDark'
      ? 'newsprint'
      : themeKey
  return `${base}-${suffix}`
}

// Body-Klasse pro Theme — trägt die CSS-Var- und Selektor-Repaint-Verträge
// aus index.css (`.neo-app` / `.newsprint-app`, jeweils @layer components).
// Werte können mehrere Klassen tragen (Leerzeichen-getrennt): Newsprint Dark
// erbt den kompletten .newsprint-app-Vertrag und stimmt ihn per zusätzlicher
// Modifier-Klasse dunkel.
const THEME_BODY_CLASS: Record<ThemeKey, string> = {
  default: 'neo-app',
  newsprint: 'newsprint-app',
  newsprintDark: 'newsprint-app newsprint-dark',
}
const THEME_DATA_ATTR: Record<ThemeKey, string> = {
  default: 'neo',
  newsprint: 'newsprint',
  newsprintDark: 'newsprint-dark',
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeKey, setThemeKey] = useState<ThemeKey>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.theme)
    return normalizeSavedThemeKey(saved)
  })

  const theme = THEMES[themeKey]

  const setTheme = useCallback((key: ThemeKey) => {
    setThemeKey(key)
    localStorage.setItem(STORAGE_KEYS.theme, key)
  }, [])

  // Apply theme to CSS custom properties
  useEffect(() => {
    const root = document.documentElement
    // Die Body-Klasse trägt den vollständigen visuellen Vertrag (CSS-Vars +
    // Selektor-Repaints) für das aktive Theme; Portale/Modale erben davon,
    // weil sie im DOM unter body hängen. Die jeweils andere Theme-Klasse wird
    // entfernt, damit nie zwei Verträge gleichzeitig aktiv sind.
    // Erst alle Theme-Klassen entfernen, dann die aktiven setzen — Themes
    // können sich Klassen teilen (newsprint/newsprintDark → newsprint-app),
    // ein naives toggle(…, key === themeKey) würde geteilte Klassen der
    // jeweils anderen Variante wieder wegräumen.
    const allThemeClasses = new Set(
      Object.values(THEME_BODY_CLASS).flatMap(value => value.split(' ')),
    )
    for (const cls of allThemeClasses) document.body.classList.remove(cls)
    for (const cls of THEME_BODY_CLASS[themeKey].split(' ')) {
      document.body.classList.add(cls)
    }
    const themeColor = getThemeChromeColor(themeKey)
    const [primaryR, primaryG, primaryB] = hexToRgbTuple(theme.primary)
    const [secondaryR, secondaryG, secondaryB] = hexToRgbTuple(theme.secondary)

    root.setAttribute('data-theme', THEME_DATA_ATTR[themeKey])

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

  const value = useMemo(() => ({ theme, themeKey, setTheme }), [theme, themeKey, setTheme])

  return (
    <ThemeContext.Provider value={value}>
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
