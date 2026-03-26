import type {
  Channel,
  Difficulty,
  OrganizationType,
  SimulationCategory,
} from '@/lib/constants'
import type { Locale } from '@/lib/i18n'
import { getOrganizationCategoryLabelOverride } from '@/lib/organizations/segments'

const categoryLabels: Record<SimulationCategory, { en: string; he: string }> = {
  bank: { en: 'Invoices & Payments', he: 'חשבוניות ותשלומים' },
  delivery: { en: 'Delivery & Courier', he: 'משלוחים ושליחים' },
  account_security: { en: 'Account Security', he: 'אבטחת חשבון' },
  workplace: { en: 'Internal Communications', he: 'תקשורת פנימית' },
  social: { en: 'WhatsApp & Social Messaging', he: 'WhatsApp והודעות מיידיות' },
  shopping: { en: 'Vendors & External Requests', he: 'ספקים ובקשות חיצוניות' },
  government: { en: 'Official & Government Notices', he: 'הודעות רשמיות וממשלתיות' },
}

const difficultyLabels: Record<Difficulty, { en: string; he: string }> = {
  easy: { en: 'Easy', he: 'קל' },
  medium: { en: 'Medium', he: 'בינוני' },
  hard: { en: 'Hard', he: 'קשה' },
}

const weaknessLabels: Record<string, { en: string; he: string }> = {
  urgency_cues: { en: 'Urgency Cues', he: 'סימני דחיפות' },
  fake_domain_detection: { en: 'Domain Verification', he: 'אימות דומיין' },
  suspicious_sender_detection: { en: 'Sender Verification', he: 'אימות שולח' },
  delivery_overtrust: { en: 'Delivery Over-Trust', he: 'אמון יתר בהודעות משלוח' },
  account_security_overtrust: {
    en: 'Legitimate Security Notices',
    he: 'חשד יתר כלפי הודעות אבטחה לגיטימיות',
  },
  hebrew_detection_gap: { en: 'Hebrew Detection', he: 'זיהוי בעברית' },
  english_detection_gap: { en: 'English Detection', he: 'זיהוי באנגלית' },
  channel_email: { en: 'Email Scenarios', he: 'תרחישי אימייל' },
  channel_sms: { en: 'SMS Scenarios', he: 'תרחישי SMS' },
  channel_whatsapp: { en: 'WhatsApp Scenarios', he: 'תרחישי WhatsApp' },
}

export function formatCategoryLabel(
  category: string | null | undefined,
  locale: Locale,
  organizationType?: OrganizationType | null,
) {
  if (!category || !(category in categoryLabels)) {
    return locale === 'he' ? 'לא זמין' : 'Not available'
  }

  const override = organizationType
    ? getOrganizationCategoryLabelOverride(
        organizationType,
        category as SimulationCategory,
        locale,
      )
    : null

  if (override) {
    return override
  }

  return categoryLabels[category as SimulationCategory][locale]
}

export function formatDifficultyLabel(difficulty: Difficulty, locale: Locale) {
  return difficultyLabels[difficulty][locale]
}

export function formatWeaknessLabel(key: string, fallback: string, locale: Locale) {
  return weaknessLabels[key]?.[locale] ?? fallback
}

export function formatChannelLabel(channel: Channel, locale: Locale) {
  if (channel === 'email') {
    return locale === 'he' ? 'אימייל' : 'Email'
  }

  if (channel === 'sms') {
    return 'SMS'
  }

  return locale === 'he' ? 'WhatsApp' : 'WhatsApp'
}

export function formatMixedDomainLabel(locale: Locale) {
  return locale === 'he' ? 'מעורב' : 'Mixed'
}

export function formatDomainSummary(
  domains: string[] | null | undefined,
  locale: Locale,
  maxItems = 3,
  organizationType?: OrganizationType | null,
) {
  if (!domains?.length) {
    return formatMixedDomainLabel(locale)
  }

  const labels = domains
    .map((domain) => formatCategoryLabel(domain, locale, organizationType))
    .filter(Boolean)

  if (labels.length <= maxItems) {
    return labels.join(' • ')
  }

  const remaining = labels.length - maxItems
  return `${labels.slice(0, maxItems).join(' • ')} ${
    locale === 'he' ? `ועוד ${remaining}` : `+${remaining} more`
  }`
}

export function formatRelativeTimestamp(isoDate: string, locale: Locale) {
  const now = Date.now()
  const target = new Date(isoDate).getTime()
  const seconds = Math.round((target - now) / 1000)
  const absSeconds = Math.abs(seconds)

  const formatter = new Intl.RelativeTimeFormat(locale === 'he' ? 'he' : 'en', {
    numeric: 'auto',
  })

  if (absSeconds < 60) {
    return formatter.format(seconds, 'second')
  }

  const minutes = Math.round(seconds / 60)
  if (Math.abs(minutes) < 60) {
    return formatter.format(minutes, 'minute')
  }

  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) {
    return formatter.format(hours, 'hour')
  }

  const days = Math.round(hours / 24)
  return formatter.format(days, 'day')
}

export function splitSender(sender: string | null | undefined) {
  if (!sender) {
    return {
      name: '',
      address: '',
    }
  }

  const match = sender.match(/^(.*)<(.*)>$/)
  if (!match) {
    return {
      name: sender,
      address: sender,
    }
  }

  return {
    name: match[1].trim(),
    address: match[2].trim(),
  }
}

export function normalizeSimulationContent(content: string | null | undefined) {
  if (!content) return ''
  return content
    .replace(/\r\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\/n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
}
