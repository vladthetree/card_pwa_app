/**
 * AI_CONTEXT: Home-screen React component for home Tag Browse Section; supports dashboard, deck browsing, tag browsing, export, or quick study workflows.
 */
import { useState } from 'react'
import { motion, useReducedMotion } from '../../ui/motion'
import { BookOpen, ChevronDown, ChevronRight, Loader2, Tag } from 'lucide-react'
import { cardEnter } from '../../constants/animations'
import type { Card } from '../../types'

interface Props {
  language: 'de' | 'en'
  tagIndex: Record<string, Card[]>
  allTags: string[]
  loading: boolean
  onStartTagStudy: (tag: string, cards: Card[]) => void
}

const TAG_LABELS: Record<string, { de: string; en: string }> = {
  application_security: { de: 'Anwendungssicherheit', en: 'Application security' },
  asset_management: { de: 'Asset Management', en: 'Asset management' },
  authentication: { de: 'Authentifizierung', en: 'Authentication' },
  authorization: { de: 'Autorisierung', en: 'Authorization' },
  automation_orchestration: { de: 'Automation & Orchestrierung', en: 'Automation & orchestration' },
  business_continuity_disaster_recovery: { de: 'Business Continuity & Recovery', en: 'Business continuity & recovery' },
  change_management: { de: 'Change Management', en: 'Change management' },
  cloud_security: { de: 'Cloud Security', en: 'Cloud security' },
  cryptography: { de: 'Kryptografie', en: 'Cryptography' },
  data_security: { de: 'Datensicherheit', en: 'Data security' },
  detection_response: { de: 'Erkennung & Response', en: 'Detection & response' },
  digital_forensics: { de: 'Digitale Forensik', en: 'Digital forensics' },
  email_security: { de: 'E-Mail-Sicherheit', en: 'Email security' },
  endpoint_security: { de: 'Endpoint Security', en: 'Endpoint security' },
  governance_risk_compliance: { de: 'Governance, Risiko & Compliance', en: 'Governance, risk & compliance' },
  hardening: { de: 'Hardening', en: 'Hardening' },
  identity_access_management: { de: 'Identity & Access Management', en: 'Identity & access management' },
  incident_response: { de: 'Incident Response', en: 'Incident response' },
  logging_monitoring: { de: 'Logging & Monitoring', en: 'Logging & monitoring' },
  malware_analysis: { de: 'Malware Analysis', en: 'Malware analysis' },
  mobile_security: { de: 'Mobile Security', en: 'Mobile security' },
  network_security: { de: 'Netzwerksicherheit', en: 'Network security' },
  operational_technology: { de: 'Operational Technology', en: 'Operational technology' },
  physical_security: { de: 'Physische Sicherheit', en: 'Physical security' },
  security_architecture: { de: 'Security Architecture', en: 'Security architecture' },
  security_awareness: { de: 'Security Awareness', en: 'Security awareness' },
  security_operations: { de: 'Security Operations', en: 'Security operations' },
  threat_intelligence: { de: 'Threat Intelligence', en: 'Threat intelligence' },
  threats_attacks: { de: 'Threats & Attacks', en: 'Threats & attacks' },
  vulnerability_management: { de: 'Vulnerability Management', en: 'Vulnerability management' },
  wireless_security: { de: 'Wireless Security', en: 'Wireless security' },
}

function formatFallbackTag(tag: string): string {
  return tag
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function tagDisplayName(tag: string, language: 'de' | 'en'): string {
  if (tag === '(untagged)') return language === 'de' ? 'Ohne Tag' : 'Untagged'
  return TAG_LABELS[tag]?.[language] ?? formatFallbackTag(tag)
}

function cardStateCounts(cards: Card[]) {
  return cards.reduce(
    (acc, card) => {
      if (card.queue === -1) {
        acc.suspended += 1
      } else if (card.type === 'new') {
        acc.new += 1
      } else if (card.type === 'learning' || card.type === 'relearning') {
        acc.learning += 1
      } else {
        acc.review += 1
      }
      return acc
    },
    { new: 0, learning: 0, review: 0, suspended: 0 },
  )
}

function statePills(cards: Card[], language: 'de' | 'en') {
  const counts = cardStateCounts(cards)
  const pills: Array<{ key: string; label: string; className: string }> = []

  if (counts.new > 0) {
    pills.push({
      key: 'new',
      label: `${counts.new} ${language === 'de' ? 'neu' : 'new'}`,
      className: 'border-blue-300/15 bg-blue-300/10 text-blue-100/80',
    })
  }
  if (counts.learning > 0) {
    pills.push({
      key: 'learning',
      label: `${counts.learning} ${language === 'de' ? 'lernen' : 'learning'}`,
      className: 'border-amber-300/15 bg-amber-300/10 text-amber-100/80',
    })
  }
  if (counts.review > 0) {
    pills.push({
      key: 'review',
      label: `${counts.review} ${language === 'de' ? 'Wdh.' : 'review'}`,
      className: 'border-emerald-300/15 bg-emerald-300/10 text-emerald-100/80',
    })
  }
  if (counts.suspended > 0) {
    pills.push({
      key: 'suspended',
      label: `${counts.suspended} ${language === 'de' ? 'pausiert' : 'suspended'}`,
      className: 'border-zinc-300/10 bg-zinc-300/5 text-zinc-300/60',
    })
  }

  return pills
}

function cardTypeDot(card: Card): { color: string; label: string } {
  if (card.queue === -1) return { color: 'bg-zinc-600', label: 'suspended' }
  if (card.type === 'new') return { color: 'bg-blue-500', label: 'new' }
  if (card.type === 'learning' || card.type === 'relearning') return { color: 'bg-amber-400', label: 'learning' }
  return { color: 'bg-emerald-500', label: 'review' }
}

function CardPreviewRow({ card }: { card: Card }) {
  const dot = cardTypeDot(card)
  return (
    <div className="flex min-w-0 items-start gap-2 rounded-ds-lg border border-[#1f1f23] bg-[#070707] px-3 py-2.5">
      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot.color}`} aria-label={dot.label} />
      <p className="min-w-0 flex-1 truncate text-xs leading-5 text-white/68">
        {card.front || '—'}
      </p>
    </div>
  )
}

function TagSection({
  tag,
  cards,
  language,
  onStartTagStudy,
}: {
  tag: string
  cards: Card[]
  language: 'de' | 'en'
  onStartTagStudy: (tag: string, cards: Card[]) => void
}) {
  const prefersReducedMotion = useReducedMotion()
  const [expanded, setExpanded] = useState(false)
  const displayTag = tagDisplayName(tag, language)
  const studyableCards = cards.filter(card => card.queue !== -1)
  const pills = statePills(cards, language)
  const previewCards = cards.slice(0, 8)
  const hiddenPreviewCount = Math.max(0, cards.length - previewCards.length)
  const cardCountLabel = language === 'de' ? 'Karten' : 'Cards'

  return (
    <motion.div
      initial={cardEnter.initial}
      animate={cardEnter.animate}
      transition={cardEnter.transition}
      className="ds-card group min-w-0 p-3 transition-all duration-300 ease-out hover:border-[#3f3f46] sm:p-5"
      whileHover={prefersReducedMotion ? {} : { y: -2, transition: { duration: 0.18 } }}
      whileTap={prefersReducedMotion ? {} : { scale: 0.99, transition: { duration: 0.1 } }}
    >
      <div className="flex min-w-0 gap-3">
        <button
          type="button"
          onClick={() => setExpanded(value => !value)}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
          aria-expanded={expanded}
        >
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-ds-xl border border-[--brand-primary-25] bg-[--brand-primary-12] text-[--brand-primary]">
            <Tag size={16} strokeWidth={1.5} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-base font-semibold text-white">{displayTag}</span>
              {expanded
                ? <ChevronDown size={16} strokeWidth={1.5} className="shrink-0 text-white/35" />
                : <ChevronRight size={16} strokeWidth={1.5} className="shrink-0 text-white/35" />}
            </span>
            <span className="mt-1 block truncate font-mono text-[10px] uppercase tracking-[0.14em] text-white/30">
              {tag}
            </span>
            <span className="mt-2 flex flex-wrap gap-1.5">
              {pills.length > 0
                ? pills.map(pill => (
                  <span
                    key={pill.key}
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${pill.className}`}
                  >
                    {pill.label}
                  </span>
                ))
                : (
                  <span className="rounded-full border border-zinc-300/10 bg-zinc-300/5 px-2 py-0.5 text-[10px] font-medium text-zinc-300/60">
                    {language === 'de' ? 'keine aktiven Karten' : 'no active cards'}
                  </span>
                )}
            </span>
          </span>
        </button>

        <div className="flex w-16 shrink-0 flex-col items-center justify-center border-l border-[#18181b] pl-2 sm:w-24 sm:pl-3">
          <span className="font-mono text-4xl font-black leading-none text-white tabular-nums sm:text-6xl">
            {cards.length}
          </span>
          <span className="mt-1 text-[8px] font-mono uppercase tracking-widest text-white/30 sm:mt-2 sm:text-[10px]">
            {cardCountLabel}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onStartTagStudy(tag, studyableCards)}
          disabled={studyableCards.length === 0}
          className="ds-icon-button h-11 w-11 shrink-0 border-[--brand-primary-25] text-[--brand-primary] hover:border-[--brand-primary-50] disabled:opacity-35 sm:h-9 sm:w-9"
          aria-label={language === 'de' ? `${displayTag} lernen` : `Study ${displayTag}`}
          title={language === 'de' ? 'Lernen' : 'Study'}
        >
          <BookOpen size={16} strokeWidth={1.5} />
        </button>
      </div>

      {expanded && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          className="mt-3 border-t border-[#18181b] pt-3"
        >
          <div className="flex flex-col gap-2">
            {previewCards.map(card => (
              <CardPreviewRow key={card.id} card={card} />
            ))}
          </div>
          {hiddenPreviewCount > 0 && (
            <div className="mt-2 rounded-ds-lg border border-[#1f1f23] bg-[#070707] px-3 py-2 text-xs text-white/40">
              +{hiddenPreviewCount} {language === 'de' ? 'weitere Karten' : 'more cards'}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}

export function HomeTagBrowseSection({ language, tagIndex, allTags, loading, onStartTagStudy }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-white/40">
        <Loader2 size={20} className="mr-2 animate-spin" />
        <span className="text-sm">{language === 'de' ? 'Lade Tags...' : 'Loading tags...'}</span>
      </div>
    )
  }

  if (allTags.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <Tag size={28} className="text-white/20" />
        <p className="text-sm text-white/40">
          {language === 'de'
            ? 'Noch keine Tags vorhanden. Fuege Tags zu deinen Karten hinzu.'
            : 'No tags yet. Add tags to your cards to browse them here.'}
        </p>
      </div>
    )
  }

  return (
    <div className="home-bottom-scroll-padding min-w-0 pb-safe-4">
      <div className="flex flex-col gap-2.5 sm:gap-3">
        {allTags.map(tag => (
          <TagSection
            key={tag}
            tag={tag}
            cards={tagIndex[tag] ?? []}
            language={language}
            onStartTagStudy={onStartTagStudy}
          />
        ))}
      </div>
    </div>
  )
}
