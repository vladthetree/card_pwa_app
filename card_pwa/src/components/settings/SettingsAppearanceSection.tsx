/**
 * AI_CONTEXT: Settings domain subcomponent — Appearance accordion (language, font, theme, build-version visibility, focus mode).
 */
import { Palette } from 'lucide-react'
import { useSettings, STRINGS, type FontFamily, FONT_FAMILY_OPTIONS } from '../../contexts/SettingsContext'
import { useTheme } from '../../contexts/ThemeContext'
import { UI_TOKENS } from '../../constants/ui'
import { formatBuildVersionTitle, formatServiceWorkerVersionLabel } from '../../utils/buildInfo'
import { SettingsSection } from '../SettingsSection'
import { SettingsSwitchRow } from '../SettingsSwitchRow'
import { useMemo } from 'react'

interface Props {
  isOpen: boolean
  onToggle: () => void
}

export function SettingsAppearanceSection({ isOpen, onToggle }: Props) {
  const { settings, setLanguage, setFontFamily, setShowBuildVersion, setFocusMode } = useSettings()
  const { setTheme } = useTheme()
  const t = STRINGS[settings.language]
  const buildVersionLabel = useMemo(() => formatServiceWorkerVersionLabel(), [])
  const buildVersionTitle = useMemo(() => formatBuildVersionTitle(), [])

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
      description={settings.language === 'de' ? 'Sprache, Schrift und Fokus-Modus.' : 'Language, font, and focus mode.'}
      icon={<Palette size={18} />}
      isOpen={isOpen}
      onToggle={onToggle}
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
          <label className="mb-2 block text-xs font-black uppercase tracking-wide text-black">
            {settings.language === 'de' ? 'Design' : 'Design'}
          </label>
          <p className="mb-3 text-xs font-bold leading-relaxed text-black">
            {settings.language === 'de'
              ? 'Aktuell ist ausschließlich Neo-Brutalismus verfügbar.'
              : 'Neo-Brutalism is currently the only available design.'}
          </p>
          <button
            type="button"
            onClick={() => setTheme('default')}
            aria-pressed="true"
            data-testid="theme-option-neo"
            className="w-full border-4 border-black bg-[#C4B5FD] p-4 text-left shadow-[7px_7px_0_0_#000] transition-all duration-100 active:translate-x-[7px] active:translate-y-[7px] active:shadow-none"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-black uppercase text-black">Neo-Brutalismus</p>
                <p className="mt-1 text-xs font-bold text-black">
                  {settings.language === 'de' ? 'Aktuelles App-Design' : 'Current app design'}
                </p>
              </div>
              <span className="border-2 border-black bg-[#FFD93D] px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black">
                {settings.language === 'de' ? 'Aktiv' : 'Active'}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-4 border-2 border-black">
              <span className="h-8 bg-[#FFFDF5]" aria-label="Cream" />
              <span className="h-8 bg-[#FF6B6B]" aria-label="Red" />
              <span className="h-8 bg-[#FFD93D]" aria-label="Yellow" />
              <span className="h-8 bg-[#C4B5FD]" aria-label="Violet" />
            </div>
          </button>
        </div>

        <div className={`${UI_TOKENS.surface.panelSoft} p-4 space-y-3`}>
          <p className="text-xs text-white/50 font-medium uppercase tracking-wide">{t.build_version_visibility_title}</p>
          <SettingsSwitchRow
            label={t.build_version_visibility_toggle}
            description={buildVersionLabel}
            title={buildVersionTitle}
            checked={settings.showBuildVersion}
            onCheckedChange={setShowBuildVersion}
          />
        </div>

        <div>
          <label className="block text-xs text-white/50 font-medium mb-3 uppercase tracking-wide">
            {settings.language === 'de' ? 'Fokus-Modus' : 'Focus mode'}
          </label>
          <div className={`${UI_TOKENS.surface.panelSoft} p-4`}>
            <SettingsSwitchRow
              label={settings.language === 'de' ? 'Session-Header beim Lernen ausblenden' : 'Hide session header while studying'}
              labelClassName="text-sm font-medium text-white"
              description={settings.language === 'de'
                ? 'Blendet Statistiken und Fortschritt in der Lernansicht aus. Der Platz bleibt reserviert, die Karte springt nicht; der Zurück-Button bleibt sichtbar.'
                : 'Hides stats and progress in the study view. The space stays reserved so the card does not jump; the back button remains visible.'}
              descriptionClassName="mt-1 text-xs leading-relaxed text-white/45"
              checked={settings.focusMode}
              onCheckedChange={setFocusMode}
            />
          </div>
        </div>
      </div>
    </SettingsSection>
  )
}
