import {
  CHANNELS,
  DIFFICULTIES,
  SIMULATION_CATEGORIES,
  type Channel,
  type Difficulty,
  type OrganizationType,
  type SimulationCategory,
} from '@/lib/constants'
import { getOrganizationSegmentProfile } from '@/lib/organizations/segments'
import { formatCategoryLabel } from '@/lib/presentation'
import type { ProfileBundle } from '@/lib/profile/service'
import { normalizePreferredDomains } from '@/lib/training/domains'
import type { AttemptWithSimulation } from '@/lib/training/repository'

interface PersonalizationContext {
  bundle: ProfileBundle
  recentAttempts: AttemptWithSimulation[]
  weaknesses: Array<{
    weakness_key: string
    category: string | null
    score: number
  }>
  organizationType?: OrganizationType | null
  organizationIndustry?: string | null
  preferredDomains?: SimulationCategory[]
}

export interface PersonalizedSelection {
  locale: ProfileBundle['profile']['preferred_language']
  difficulty: Difficulty
  channel: Channel
  category: SimulationCategory
  focusTags: string[]
  reasons: string[]
  selectedDomains: SimulationCategory[]
  isMixed: boolean
}

function nextDifficulty(level: Difficulty, direction: 'up' | 'down'): Difficulty {
  const index = DIFFICULTIES.indexOf(level)

  if (index === -1) {
    return 'easy'
  }

  if (direction === 'up') {
    return DIFFICULTIES[Math.min(index + 1, DIFFICULTIES.length - 1)]
  }

  return DIFFICULTIES[Math.max(index - 1, 0)]
}

function mostFrequent<T extends string>(values: T[]) {
  const counts = new Map<T, number>()

  values.forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  })

  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0]
}

function pickRotated<T>(values: T[], seed: number) {
  return values[Math.abs(seed) % values.length]
}

function categoryIsInPool(
  value: string | null | undefined,
  pool: SimulationCategory[],
): value is SimulationCategory {
  return Boolean(value && pool.includes(value as SimulationCategory))
}

export function buildPersonalizedSelection(context: PersonalizationContext): PersonalizedSelection {
  const { bundle, recentAttempts, weaknesses } = context
  const locale = bundle.profile.preferred_language
  const organizationProfile =
    context.organizationType
      ? getOrganizationSegmentProfile(
          context.organizationType,
          context.organizationIndustry,
          locale,
        )
      : null
  const recentWindow = recentAttempts.slice(0, 5)
  const recentAccuracy =
    recentWindow.length > 0
      ? recentWindow.filter((attempt) => attempt.is_correct).length / recentWindow.length
      : 0

  let difficulty = bundle.trainingProfile.current_level
  const reasons: string[] = []
  const focusTags: string[] = []

  if (recentWindow.length >= 3 && recentAccuracy >= 0.8) {
    difficulty = nextDifficulty(difficulty, 'up')
    reasons.push(
      locale === 'he'
        ? 'הדיוק האחרון חזק, ולכן אפשר להעלות מעט את רמת הקושי.'
        : 'Recent accuracy is strong, so difficulty can increase gradually.',
    )
  } else if (recentWindow.length >= 3 && recentAccuracy <= 0.4) {
    difficulty = nextDifficulty(difficulty, 'down')
    reasons.push(
      locale === 'he'
        ? 'הרצף האחרון מצביע על צורך בתרגול נגיש יותר לפני שמעלים קושי.'
        : 'Recent misses suggest the difficulty should stay manageable.',
    )
  }

  const explicitDomains = normalizePreferredDomains(
    context.preferredDomains ?? bundle.trainingProfile.preferred_domains,
  )
  const effectiveDomains =
    explicitDomains.length === 0 && organizationProfile?.suggestedDomains.length
      ? organizationProfile.suggestedDomains
      : explicitDomains
  const isMixed = effectiveDomains.length === 0
  const variationPool = SIMULATION_CATEGORIES.filter((category) => !effectiveDomains.includes(category))
  const shouldVaryOutsideSelection =
    effectiveDomains.length > 0 &&
    variationPool.length > 0 &&
    bundle.trainingProfile.total_attempts > 0 &&
    bundle.trainingProfile.total_attempts % 5 === 4

  const activeDomainPool =
    shouldVaryOutsideSelection
      ? variationPool
      : effectiveDomains.length
        ? effectiveDomains
        : [...SIMULATION_CATEGORIES]

  const strongestWeakness = [...weaknesses].sort((left, right) => right.score - left.score)[0]
  const recentIncorrect = recentAttempts.filter((attempt) => !attempt.is_correct)

  let category =
    (categoryIsInPool(strongestWeakness?.category, activeDomainPool)
      ? strongestWeakness.category
      : null) ??
    (mostFrequent(
      recentIncorrect
        .map((attempt) => attempt.simulation?.category)
        .filter((value): value is SimulationCategory => categoryIsInPool(value, activeDomainPool)),
    ) as SimulationCategory | undefined) ??
    pickRotated(activeDomainPool, bundle.trainingProfile.total_attempts)

  const channel =
    (() => {
      if (strongestWeakness?.weakness_key === 'channel_email') return 'email'
      if (strongestWeakness?.weakness_key === 'channel_sms') return 'sms'
      if (strongestWeakness?.weakness_key === 'channel_whatsapp') return 'whatsapp'
      return null
    })() ??
    mostFrequent(
      recentIncorrect
        .map((attempt) => attempt.simulation?.channel)
        .filter((value): value is Channel => Boolean(value)),
    ) ??
    (organizationProfile?.priorityChannels[
      bundle.trainingProfile.total_attempts % organizationProfile.priorityChannels.length
    ] ??
      CHANNELS[bundle.trainingProfile.total_attempts % CHANNELS.length])

  if (strongestWeakness?.weakness_key === 'delivery_overtrust') {
    category = effectiveDomains.length && !effectiveDomains.includes('delivery') ? category : 'delivery'
    focusTags.push('delivery skepticism')
  }

  if (strongestWeakness?.weakness_key === 'account_security_overtrust') {
    category =
      effectiveDomains.length && !effectiveDomains.includes('account_security')
        ? category
        : 'account_security'
    focusTags.push('legitimate security notices')
  }

  if (strongestWeakness?.weakness_key === 'urgency_cues') {
    focusTags.push('urgency cues')
  }

  if (strongestWeakness?.weakness_key === 'fake_domain_detection') {
    focusTags.push('domain verification')
  }

  if (strongestWeakness?.weakness_key === 'suspicious_sender_detection') {
    focusTags.push('sender authenticity')
  }

  if (explicitDomains.length) {
    reasons.push(
      locale === 'he'
        ? `התחומים שבחרתם מקבלים עדיפות: ${explicitDomains
            .map((domain) => formatCategoryLabel(domain, locale, context.organizationType))
            .join(', ')}.`
        : `Your selected training domains are prioritized: ${explicitDomains
            .map((domain) => formatCategoryLabel(domain, locale, context.organizationType))
            .join(', ')}.`,
    )
  } else if (organizationProfile?.suggestedDomains.length) {
    reasons.push(
      locale === 'he'
        ? `ברירות המחדל של הארגון פעילות: ${organizationProfile.suggestedDomains
            .map((domain) => formatCategoryLabel(domain, locale, context.organizationType))
            .join(', ')}.`
        : `Organization starter domains are active: ${organizationProfile.suggestedDomains
            .map((domain) => formatCategoryLabel(domain, locale, context.organizationType))
            .join(', ')}.`,
    )
  } else {
    reasons.push(
      locale === 'he'
        ? 'מצב מעורב פעיל, ולכן המערכת תשלב תחומים שונים כדי לשמור על גיוון.'
        : 'Mixed mode is active, so the system will rotate across domains for variety.',
    )
  }

  if (shouldVaryOutsideSelection) {
    reasons.push(
      locale === 'he'
        ? 'נוספה סטייה קלה מהבחירה כדי למנוע חזרתיות ולשמור על אימון מציאותי.'
        : 'A small variation was introduced to avoid repetition and keep training realistic.',
    )
  }

  if (organizationProfile?.adminHint && bundle.trainingProfile.total_attempts === 0) {
    reasons.push(
      locale === 'he'
        ? `לארגון מהסוג הזה כדאי להתמקד קודם ב-${organizationProfile.focusTopics[0]}.`
        : `For this kind of organization, start with ${organizationProfile.focusTopics[0]}.`,
    )
  }

  reasons.push(
    locale === 'he'
      ? `תחום המיקוד הנוכחי הוא ${formatCategoryLabel(category, locale, context.organizationType)}.`
      : `Current priority domain is ${formatCategoryLabel(category, locale, context.organizationType)}.`,
  )
  reasons.push(
    locale === 'he'
      ? `ערוץ המיקוד הוא ${channel}.`
      : `Priority channel is ${channel}.`,
  )

  return {
    locale,
    difficulty,
    channel,
    category,
    focusTags,
    reasons,
    selectedDomains: effectiveDomains,
    isMixed,
  }
}

