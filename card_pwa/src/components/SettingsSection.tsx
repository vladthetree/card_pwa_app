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
}

export function SettingsSection(props: SettingsSectionProps) {
  return <AccordionSection variant="settings" {...props} />
}
