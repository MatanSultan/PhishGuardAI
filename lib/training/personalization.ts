import {
  CHANNELS,
  DIFFICULTIES,
  SIMULATION_CATEGORIES,
  type Channel,
  type Difficulty,
  type SimulationCategory,
} from '@/lib/constants'
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
        ? 'רמת הדיוק האחרונה גבוהה, ולכן אפשר להעלות את רמת הקושי בהדרגה.'
        : 'Recent accuracy is strong, so difficulty can increase gradually.',
    )
  } else if (recentWindow.length >= 3 && recentAccuracy <= 0.4) {
    difficulty = nextDifficulty(difficulty, 'down')
    reasons.push(
      locale === 'he'
        ? 'רצף הטעויות האחרון מצביע על צורך ברמת קושי נגישה יותר.'
        : 'Recent misses suggest the difficulty should stay manageable.',
    )
  }

  const selectedDomains = normalizePreferredDomains(
    context.preferredDomains ?? bundle.trainingProfile.preferred_domains,
  )
  const isMixed = selectedDomains.length === 0
  const variationPool = SIMULATION_CATEGORIES.filter((category) => !selectedDomains.includes(category))
  const shouldVaryOutsideSelection =
    selectedDomains.length > 0 &&
    variationPool.length > 0 &&
    bundle.trainingProfile.total_attempts > 0 &&
    bundle.trainingProfile.total_attempts % 5 === 4

  const activeDomainPool =
    shouldVaryOutsideSelection
      ? variationPool
      : selectedDomains.length
        ? selectedDomains
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
    CHANNELS[bundle.trainingProfile.total_attempts % CHANNELS.length]

  if (strongestWeakness?.weakness_key === 'delivery_overtrust') {
    category = selectedDomains.length && !selectedDomains.includes('delivery') ? category : 'delivery'
    focusTags.push('delivery skepticism')
  }

  if (strongestWeakness?.weakness_key === 'account_security_overtrust') {
    category =
      selectedDomains.length && !selectedDomains.includes('account_security')
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

  if (selectedDomains.length) {
    reasons.push(
      locale === 'he'
        ? `תחומי האימון שנבחרו מקבלים עדיפות: ${selectedDomains
            .map((domain) => formatCategoryLabel(domain, locale))
            .join(', ')}.`
        : `Your selected training domains are prioritized: ${selectedDomains
            .map((domain) => formatCategoryLabel(domain, locale))
            .join(', ')}.`,
    )
  } else {
    reasons.push(
      locale === 'he'
        ? 'מצב מעורב פעיל, לכן המערכת תשלב תחומים שונים כדי לשמור על גיוון.'
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

  reasons.push(
    locale === 'he'
      ? `תחום המיקוד הנוכחי הוא ${formatCategoryLabel(category, locale)}.`
      : `Current priority domain is ${formatCategoryLabel(category, locale)}.`,
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
    selectedDomains,
    isMixed,
  }
}
