/**
 * AI_CONTEXT: Settings domain subcomponent — Appearance settings (language, font, and theme).
 */
import { Palette } from 'lucide-react'
import { useSettings, STRINGS, type FontFamily, FONT_FAMILY_OPTIONS } from '../../contexts/SettingsContext'
import { useTheme, type ThemeKey } from '../../contexts/ThemeContext'
import { SettingsSection } from '../SettingsSection'

interface Props {
  isOpen: boolean
  onToggle: () => void
  presentation?: 'accordion' | 'panel'
}

interface ThemeOption {
  key: ThemeKey
  nameKey: string
  helpKey: string
  cardBg: string
  swatches: Array<{ color: string; label: string }>
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    key: 'default',
    nameKey: 'theme_neo_name',
    helpKey: 'theme_neo_help',
    cardBg: 'bg-[#C4B5FD]',
    swatches: [
      { color: '#FFFDF5', label: 'Cream' },
      { color: '#FF6B6B', label: 'Red' },
      { color: '#FFD93D', label: 'Yellow' },
      { color: '#C4B5FD', label: 'Violet' },
    ],
  },
  {
    key: 'newsprint',
    nameKey: 'theme_newsprint_name',
    helpKey: 'theme_newsprint_help',
    cardBg: 'bg-[#E5E5E0]',
    swatches: [
      { color: '#F9F9F7', label: 'Off-White' },
      { color: '#111111', label: 'Ink' },
      { color: '#CC0000', label: 'Editorial Red' },
      { color: '#E5E5E0', label: 'Divider Grey' },
    ],
  },
  {
    key: 'newsprintDark',
    nameKey: 'theme_newsprint_dark_name',
    helpKey: 'theme_newsprint_dark_help',
    cardBg: 'bg-[#C9C9C2]',
    swatches: [
      { color: '#000000', label: 'OLED Black' },
      { color: '#E8E8E3', label: 'Light Ink' },
      { color: '#FF6166', label: 'Editorial Red' },
      { color: '#2C2C29', label: 'Divider Dark' },
    ],
  },
  {
    key: 'editorial',
    nameKey: 'theme_editorial_name',
    helpKey: 'theme_editorial_help',
    cardBg: 'bg-[#D8D1C4]',
    swatches: [
      { color: '#100F0E', label: 'Charcoal Paper' },
      { color: '#F2EDE2', label: 'Warm Ink' },
      { color: '#E08A70', label: 'Editorial Coral' },
      { color: '#555047', label: 'Soft Rule' },
    ],
  },
]

export function SettingsAppearanceSection({ isOpen, onToggle, presentation }: Props) {
  const { settings, setLanguage, setFontFamily } = useSettings()
  const { themeKey, setTheme } = useTheme()
  const t = STRINGS[settings.language]

  const fontOptions: Array<{ key: FontFamily; label: string; description: string; preview: string }> = [
    {
      key: 'industrial',
      label: t.font_family_industrial,
      description: t.font_family_industrial_help,
      preview: 'A1 GRID LOCK',
    },
    {
      key: 'modern',
      label: t.font_family_modern,
      description: t.font_family_modern_help,
      preview: 'Signal Flow 204',
    },
  ]

  return (
    <SettingsSection
      title={settings.language === 'de' ? 'Darstellung' : 'Appearance'}
      description={settings.language === 'de' ? 'Sprache, Schrift und Design.' : 'Language, font, and design.'}
      icon={<Palette size={18} />}
      isOpen={isOpen}
      onToggle={onToggle}
      presentation={presentation}
    >
      <div className="pt-5 space-y-4">
        <div>
          <label className="block text-xs text-white/50 font-medium mb-3 uppercase tracking-wide">
            {t.language}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['de', 'en'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`py-2.5 px-3 rounded-ds-xl font-medium transition-all ${
                  settings.language === lang
                    ? 'border border-[--brand-primary-50] bg-[--brand-primary-08] text-white'
                    : 'bg-[#0c0c0c] text-zinc-400 hover:text-zinc-200 border border-[#18181b]'
                }`}
              >
                {lang === 'de' ? t.german : t.english}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/50 font-medium mb-2 uppercase tracking-wide">
            {t.font_family}
          </label>
          <p className="text-xs text-white/40 leading-relaxed mb-3">{t.font_family_help}</p>
          <div className="grid grid-cols-1 gap-3">
            {fontOptions.map(option => {
              const selected = option.key === settings.fontFamily

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setFontFamily(option.key)}
                  className={`rounded-ds-2xl border p-3 text-left transition-all duration-300 ease-out active:scale-95 ${
                    selected
                      ? 'border-[#3f3f46] bg-[#111] shadow-card'
                      : 'border-[#18181b] bg-[#0c0c0c] hover:border-[#3f3f46] hover:bg-[#111]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-white">{option.label}</p>
                      <p className="mt-1 text-xs text-white/45">{option.description}</p>
                    </div>
                    <span className="text-[10px] text-white/45 uppercase tracking-wide">
                      {selected ? t.current_selection : ''}
                    </span>
                  </div>
                  <div
                    className="mt-3 rounded-ds-xl border border-[#18181b] bg-[#0a0a0a] px-3 py-3 text-sm text-white/85"
                    style={{
                      fontFamily: FONT_FAMILY_OPTIONS[option.key],
                    }}
                  >
                    {option.preview}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-white/50">
            {t.theme}
          </label>
          <p className="mb-3 text-xs leading-relaxed text-white/40">
            {t.theme_help}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {THEME_OPTIONS.map(option => {
              const selected = option.key === themeKey
              const name = t[option.nameKey]
              const help = t[option.helpKey]

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setTheme(option.key)}
                  aria-pressed={selected}
                  data-testid={`theme-option-${option.key === 'default' ? 'neo' : option.key}`}
                  className={`w-full min-w-0 border-4 border-black ${option.cardBg} p-3 text-left shadow-[5px_5px_0_0_#000] transition-all duration-100 active:translate-x-[5px] active:translate-y-[5px] active:shadow-none sm:p-4 sm:shadow-[7px_7px_0_0_#000] sm:active:translate-x-[7px] sm:active:translate-y-[7px]`}
                >
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <p className="break-words text-xs font-black uppercase leading-tight text-black sm:text-base">{name}</p>
                      <p className="mt-1 text-[10px] font-bold leading-snug text-black sm:text-xs">{help}</p>
                    </div>
                    {selected && (
                      <span className="self-start border-2 border-black bg-[#FFD93D] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-black sm:px-2 sm:py-1 sm:text-[10px] sm:tracking-widest">
                        {t.current_selection}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-4 border-2 border-black sm:mt-4">
                    {option.swatches.map(swatch => (
                      <span key={swatch.label} className="h-5 sm:h-8" style={{ backgroundColor: swatch.color }} aria-label={swatch.label} />
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

      </div>
    </SettingsSection>
  )
}
