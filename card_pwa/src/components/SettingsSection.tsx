/**
 * AI_CONTEXT: Reusable React component for settings Section; contributes to the card-learning UI and shared app interactions.
 */
import { AccordionSection } from './AccordionSection'

interface SettingsSectionProps {
  title: string
  description: string
  icon: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
  presentation?: 'accordion' | 'panel'
}

export function SettingsSection({ presentation = 'accordion', title, description, icon, children, ...accordionProps }: SettingsSectionProps) {
  if (presentation === 'panel') {
    return (
      <section className="overflow-hidden rounded-ds-2xl border border-[#27272a] bg-[#0c0c0c] shadow-card">
        <header className="flex items-start gap-3 border-b border-[#27272a] px-4 py-4 sm:px-5">
          <span className="mt-0.5 text-zinc-300">{icon}</span>
          <span className="min-w-0">
            <h2 className="text-base font-black tracking-tight text-zinc-100">{title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">{description}</p>
          </span>
        </header>
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">{children}</div>
      </section>
    )
  }

  return (
    <AccordionSection
      variant="settings"
      title={title}
      description={description}
      icon={icon}
      {...accordionProps}
    >
      {children}
    </AccordionSection>
  )
}
