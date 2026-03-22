import type { Channel, Difficulty, SimulationCategory } from '@/lib/constants'
import type { Locale } from '@/lib/i18n'

const categoryLabels: Record<SimulationCategory, { en: string; he: string }> = {
  bank: { en: 'Banking & Finance', he: 'בנקאות ופיננסים' },
  delivery: { en: 'Delivery & Packages', he: 'משלוחים וחבילות' },
  account_security: { en: 'Account Security', he: 'אבטחת חשבון' },
  workplace: { en: 'Workplace & Internal', he: 'עבודה ותקשורת פנימית' },
  social: { en: 'Social Media', he: 'מדיה חברתית' },
  shopping: { en: 'E-commerce & Shopping', he: 'מסחר מקוון וקניות' },
  government: { en: 'Government & Official', he: 'ממשל והודעות רשמיות' },
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
  delivery_overtrust: { en: 'Delivery Over-Trust', he: 'אמון יתר במשלוחים' },
  account_security_overtrust: {
    en: 'Legitimate Security Notices',
    he: 'חשד כלפי הודעות אבטחה לגיטימיות',
  },
  hebrew_detection_gap: { en: 'Hebrew Detection', he: 'זיהוי בעברית' },
  english_detection_gap: { en: 'English Detection', he: 'זיהוי באנגלית' },
  channel_email: { en: 'Email Scenarios', he: 'תרחישי אימייל' },
  channel_sms: { en: 'SMS Scenarios', he: 'תרחישי SMS' },
  channel_whatsapp: { en: 'WhatsApp Scenarios', he: 'תרחישי WhatsApp' },
}

export function formatCategoryLabel(category: string | null | undefined, locale: Locale) {
  if (!category || !(category in categoryLabels)) {
    return locale === 'he' ? 'לא זמין' : 'Not available'
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

  return locale === 'he' ? 'וואטסאפ' : 'WhatsApp'
}

export function formatMixedDomainLabel(locale: Locale) {
  return locale === 'he' ? 'מעורב' : 'Mixed'
}

export function formatDomainSummary(
  domains: string[] | null | undefined,
  locale: Locale,
  maxItems = 3,
) {
  if (!domains?.length) {
    return formatMixedDomainLabel(locale)
  }

  const labels = domains
    .map((domain) => formatCategoryLabel(domain, locale))
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
