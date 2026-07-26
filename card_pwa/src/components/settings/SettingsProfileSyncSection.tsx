/**
 * AI_CONTEXT: Settings domain subcomponent — Profile & Sync accordion (thin wrapper around ProfileSyncSection).
 */
import { User } from 'lucide-react'
import { useSettings } from '../../contexts/SettingsContext'
import { SettingsSection } from '../SettingsSection'
import ProfileSyncSection from '../ProfileSyncSection'

interface Props {
  isOpen: boolean
  onToggle: () => void
}

export function SettingsProfileSyncSection({ isOpen, onToggle }: Props) {
  const { settings } = useSettings()

  return (
    <SettingsSection
      title={settings.language === 'de' ? 'Profil & Sync' : 'Profile & Sync'}
      description={settings.language === 'de' ? 'Lokale Nutzung oder geräteübergreifende Synchronisierung.' : 'Use locally or sync across devices.'}
      icon={<User size={18} />}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <ProfileSyncSection language={settings.language === 'de' ? 'de' : 'en'} />
    </SettingsSection>
  )
}
