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
import { formatCategoryLabel, formatChannelLabel } from '@/lib/presentation'
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

function pickRotated<T>(values: T[], seed: number) {
  return values[Math.abs(seed) % values.length]
}

function uniqueValues<T>(values: readonly T[]) {
  return Array.from(new Set(values))
}

function pickWeightedRandom<T>(items: Array<{ value: T; weight: number }>) {
  const normalized = items.map((item) => ({
    ...item,
    weight: Math.max(1, item.weight),
  }))
  const totalWeight = normalized.reduce((sum, item) => sum + item.weight, 0)

  if (totalWeight <= 0) {
    return normalized[0]?.value ?? null
  }

  let cursor = Math.random() * totalWeight

  for (const item of normalized) {
    cursor -= item.weight

    if (cursor <= 0) {
      return item.value
    }
  }

  return normalized.at(-1)?.value ?? null
}

function asCategory(value: string | null | undefined): SimulationCategory | null {
  if (!value || !SIMULATION_CATEGORIES.includes(value as SimulationCategory)) {
    return null
  }

  return value as SimulationCategory
}

function asChannel(value: string | null | undefined): Channel | null {
  if (!value || !CHANNELS.includes(value as Channel)) {
    return null
  }

  return value as Channel
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

  const strongestWeakness = [...weaknesses].sort((left, right) => right.score - left.score)[0]
  const recentIncorrect = recentAttempts.filter((attempt) => !attempt.is_correct)
  const organizationSuggestedDomains = organizationProfile?.suggestedDomains ?? []
  const savedDomainBias = normalizePreferredDomains(
    context.preferredDomains ?? bundle.trainingProfile.preferred_domains,
  )
  const weaknessDomains = weaknesses
    .map((weakness) => asCategory(weakness.category))
    .filter((value): value is SimulationCategory => Boolean(value))
  const recentIncorrectDomains = recentIncorrect
    .map((attempt) => asCategory(attempt.simulation?.category))
    .filter((value): value is SimulationCategory => Boolean(value))
  const relevantDomainPool =
    uniqueValues([
      ...organizationSuggestedDomains,
      ...savedDomainBias,
      ...weaknessDomains,
      ...recentIncorrectDomains,
    ]).filter((value): value is SimulationCategory =>
      SIMULATION_CATEGORIES.includes(value as SimulationCategory),
    ) || []
  const activeDomainPool = relevantDomainPool.length ? relevantDomainPool : [...SIMULATION_CATEGORIES]
  const recentCategoryPenalty = new Set(
    recentAttempts
      .map((attempt) => asCategory(attempt.simulation?.category))
      .filter((value): value is SimulationCategory => Boolean(value))
      .slice(0, 2),
  )

  let category =
    pickWeightedRandom(
      activeDomainPool.map((candidateCategory) => {
        const weaknessBonus = strongestWeakness?.category === candidateCategory ? 5 : 0
        const recentIncorrectBonus =
          recentIncorrect.filter((attempt) => attempt.simulation?.category === candidateCategory).length * 2
        const organizationBonus = organizationSuggestedDomains.includes(candidateCategory) ? 2 : 0
        const preferenceBonus = savedDomainBias.includes(candidateCategory) ? 1 : 0
        const repeatPenalty =
          recentCategoryPenalty.has(candidateCategory) && activeDomainPool.length > 1 ? 2 : 0

        return {
          value: candidateCategory,
          weight:
            1 +
            weaknessBonus +
            recentIncorrectBonus +
            organizationBonus +
            preferenceBonus -
            repeatPenalty,
        }
      }),
    ) ?? pickRotated(activeDomainPool, bundle.trainingProfile.total_attempts)

  const weaknessChannel =
    (() => {
      if (strongestWeakness?.weakness_key === 'channel_email') return 'email'
      if (strongestWeakness?.weakness_key === 'channel_sms') return 'sms'
      if (strongestWeakness?.weakness_key === 'channel_whatsapp') return 'whatsapp'
      return null
    })()
  const priorityChannels = organizationProfile?.priorityChannels ?? [...CHANNELS]
  const recentIncorrectChannels = recentIncorrect
    .map((attempt) => asChannel(attempt.simulation?.channel))
    .filter((value): value is Channel => Boolean(value))
  const channelPool = uniqueValues([
    ...priorityChannels,
    ...recentIncorrectChannels,
    ...(weaknessChannel ? [weaknessChannel] : []),
  ]).filter((value): value is Channel => CHANNELS.includes(value as Channel))
  const recentChannelPenalty = new Set(
    recentAttempts
      .map((attempt) => asChannel(attempt.simulation?.channel))
      .filter((value): value is Channel => Boolean(value))
      .slice(0, 1),
  )
  const channel =
    pickWeightedRandom(
      channelPool.map((candidateChannel) => {
        const priorityIndex = priorityChannels.indexOf(candidateChannel)
        const priorityBonus = priorityIndex >= 0 ? Math.max(priorityChannels.length - priorityIndex, 1) : 0
        const weaknessBonus = weaknessChannel === candidateChannel ? 4 : 0
        const recentIncorrectBonus =
          recentIncorrect.filter((attempt) => attempt.simulation?.channel === candidateChannel).length * 2
        const repeatPenalty =
          recentChannelPenalty.has(candidateChannel) && channelPool.length > 1 ? 2 : 0

        return {
          value: candidateChannel,
          weight: 1 + priorityBonus + weaknessBonus + recentIncorrectBonus - repeatPenalty,
        }
      }),
    ) ?? pickRotated(priorityChannels, bundle.trainingProfile.total_attempts)

  if (strongestWeakness?.weakness_key === 'delivery_overtrust' && activeDomainPool.includes('delivery')) {
    category = 'delivery'
    focusTags.push('delivery skepticism')
  }

  if (
    strongestWeakness?.weakness_key === 'account_security_overtrust' &&
    activeDomainPool.includes('account_security')
  ) {
    category = 'account_security'
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

  if (organizationSuggestedDomains.length) {
    reasons.push(
      locale === 'he'
        ? `התרחיש נבחר אוטומטית מתוך תחומים שרלוונטיים לארגון שלכם: ${organizationSuggestedDomains
            .map((domain) => formatCategoryLabel(domain, locale, context.organizationType))
            .join(', ')}.`
        : `This scenario was selected automatically from domains that fit your organization: ${organizationSuggestedDomains
            .map((domain) => formatCategoryLabel(domain, locale, context.organizationType))
            .join(', ')}.`,
    )
  } else {
    reasons.push(
      locale === 'he'
        ? 'המערכת בחרה תרחיש אוטומטי ומגוון כדי לבנות זיהוי רחב של הודעות חשודות ותקינות.'
        : 'The system selected a varied scenario automatically to build broad detection habits.',
    )
  }

  if (savedDomainBias.length) {
    reasons.push(
      locale === 'he'
        ? `העדפות האימון השמורות נלקחו בחשבון: ${savedDomainBias
            .map((domain) => formatCategoryLabel(domain, locale, context.organizationType))
            .join(', ')}.`
        : `Saved training preferences were considered: ${savedDomainBias
            .map((domain) => formatCategoryLabel(domain, locale, context.organizationType))
            .join(', ')}.`,
    )
  }

  if (strongestWeakness?.category && asCategory(strongestWeakness.category) === category) {
    reasons.push(
      locale === 'he'
        ? `התרחיש מכוון לחיזוק התחום ${formatCategoryLabel(category, locale, context.organizationType)} בעקבות תוצאות קודמות.`
        : `This drill reinforces ${formatCategoryLabel(category, locale, context.organizationType)} based on previous results.`,
    )
  } else if (organizationProfile?.adminHint && bundle.trainingProfile.total_attempts === 0) {
    reasons.push(
      locale === 'he'
        ? `זהו תרחיש פתיחה טוב לארגון מהסוג שלכם: ${organizationProfile.focusTopics[0]}.`
        : `This is a strong first scenario for your organization type: ${organizationProfile.focusTopics[0]}.`,
    )
  }

  reasons.push(
    locale === 'he'
      ? `המיקוד הפעם הוא ${formatCategoryLabel(category, locale, context.organizationType)} דרך ${formatChannelLabel(channel, locale)}.`
      : `This round focuses on ${formatCategoryLabel(category, locale, context.organizationType)} via ${formatChannelLabel(channel, locale)}.`,
  )

  return {
    locale,
    difficulty,
    channel,
    category,
    focusTags,
    reasons: reasons.slice(0, 4),
    selectedDomains: activeDomainPool,
    isMixed: activeDomainPool.length > 1,
  }
}
