import {
  type Difficulty,
  type MemoryType,
  type SimulationCategory,
  type SupportedLocale,
} from '@/lib/constants'
import type { TableRow } from '@/lib/database.types'
import type { OrganizationSegmentProfile } from '@/lib/organizations/segments'
import type { ProfileBundle } from '@/lib/profile/service'
import {
  getWeaknessesByKeys,
  getMemoryEntries,
  getRecommendations,
  getRecentAttemptsWithSimulations,
  getWeaknesses,
  insertMemoryEntries,
  upsertWeaknesses,
  updateTrainingProfileRow,
  type AppSupabaseClient,
  type AttemptWithSimulation,
} from '@/lib/training/repository'
import type { MemoryUpdateResponse } from '@/lib/validators/ai'

export interface TrainingContext {
  bundle: ProfileBundle
  recentAttempts: AttemptWithSimulation[]
  weaknesses: TableRow<'user_weaknesses'>[]
  memories: TableRow<'memory_entries'>[]
  recommendations: TableRow<'training_recommendations'>[]
  organizationProfile?: OrganizationSegmentProfile | null
}

interface AttemptSignal {
  weaknessKey: string
  weaknessLabel: string
  category: SimulationCategory | null
  trigger: string
  delta: number
}

function localizeMemoryText(locale: SupportedLocale, english: string, hebrew: string) {
  return locale === 'he' ? hebrew : english
}

function inferSignals(
  simulation: TableRow<'simulations'>,
  userAnswer: boolean,
  isCorrect: boolean,
  locale: SupportedLocale,
) {
  const normalizedText = [simulation.sender, simulation.title, simulation.content, simulation.explanation]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  const signals: AttemptSignal[] = []

  if (!isCorrect) {
    if (/urgent|immediately|within|suspend|alert|דחוף|מייד|מיד|תוך|השע/.test(normalizedText)) {
      signals.push({
        weaknessKey: 'urgency_cues',
        weaknessLabel: 'Urgency cues',
        category: simulation.category,
        trigger: localizeMemoryText(
          locale,
          'User often misses urgency-based phishing cues.',
          'המשתמש נוטה לפספס סימני דחיפות בהודעות פישינג.',
        ),
        delta: 1,
      })
    }

    if (simulation.sender?.includes('@') || /https?:\/\//.test(normalizedText)) {
      signals.push({
        weaknessKey: 'fake_domain_detection',
        weaknessLabel: 'Domain verification',
        category: simulation.category,
        trigger: localizeMemoryText(
          locale,
          'User should spend more time verifying domains and links.',
          'המשתמש צריך להקדיש יותר תשומת לב לאימות דומיינים וקישורים.',
        ),
        delta: 1,
      })
    }

    signals.push({
      weaknessKey: `channel_${simulation.channel}`,
      weaknessLabel: `${simulation.channel.toUpperCase()} handling`,
      category: simulation.category,
      trigger: localizeMemoryText(
        locale,
        `User is struggling more on ${simulation.channel.toUpperCase()} scenarios.`,
        `המשתמש מתקשה יותר בתרחישי ${simulation.channel.toUpperCase()}.`,
      ),
      delta: 1,
    })

    if (locale === 'he') {
      signals.push({
        weaknessKey: 'hebrew_detection_gap',
        weaknessLabel: 'Hebrew detection',
        category: simulation.category,
        trigger: 'המשתמש מתקשה יותר בזיהוי הודעות בעברית.',
        delta: 1,
      })
    } else {
      signals.push({
        weaknessKey: 'english_detection_gap',
        weaknessLabel: 'English detection',
        category: simulation.category,
        trigger: 'User is struggling more with English-language messages.',
        delta: 1,
      })
    }

    if (simulation.category === 'delivery' && simulation.is_phishing && userAnswer === false) {
      signals.push({
        weaknessKey: 'delivery_overtrust',
        weaknessLabel: 'Delivery over-trust',
        category: simulation.category,
        trigger: localizeMemoryText(
          locale,
          'User tends to over-trust delivery-themed messages.',
          'המשתמש נוטה לתת אמון יתר בהודעות משלוחים.',
        ),
        delta: 1,
      })
    }

    if (simulation.category === 'account_security' && !simulation.is_phishing && userAnswer === true) {
      signals.push({
        weaknessKey: 'account_security_overtrust',
        weaknessLabel: 'Legitimate security notices',
        category: simulation.category,
        trigger: localizeMemoryText(
          locale,
          'User tends to distrust legitimate account-security messages.',
          'המשתמש נוטה לחשוד גם בהודעות אבטחה לגיטימיות.',
        ),
        delta: 1,
      })
    }
  }

  return signals
}

function buildFallbackMemoryUpdate(
  context: TrainingContext,
  simulation: TableRow<'simulations'>,
  userAnswer: boolean,
  isCorrect: boolean,
  locale: SupportedLocale,
) {
  const signals = inferSignals(simulation, userAnswer, isCorrect, locale)
  const recentCorrect = context.recentAttempts.filter((attempt) => attempt.is_correct).length
  const recentAccuracy = context.recentAttempts.length
    ? recentCorrect / context.recentAttempts.length
    : isCorrect
      ? 1
      : 0
  let recommendedLevel: Difficulty = context.bundle.trainingProfile.current_level

  if (recentAccuracy >= 0.8 && isCorrect) {
    recommendedLevel =
      context.bundle.trainingProfile.current_level === 'easy'
        ? 'medium'
        : context.bundle.trainingProfile.current_level === 'medium'
          ? 'hard'
          : 'hard'
  } else if (recentAccuracy <= 0.4 && !isCorrect) {
    recommendedLevel =
      context.bundle.trainingProfile.current_level === 'hard'
        ? 'medium'
        : 'easy'
  }

  const memoryItems: MemoryUpdateResponse['memoryItems'] = []

  if (isCorrect) {
    memoryItems.push({
      memoryType: 'improvement',
      content: localizeMemoryText(
        locale,
        `User is improving in ${simulation.category.replaceAll('_', ' ')} detection.`,
        `המשתמש משתפר בזיהוי תרחישי ${simulation.category.replaceAll('_', ' ')}.`,
      ),
      importanceScore: 2,
    })
  } else {
    signals.slice(0, 3).forEach((signal) => {
      memoryItems.push({
        memoryType: 'weakness' as MemoryType,
        content: signal.trigger,
        importanceScore: 3,
      })
    })
  }

  if (!memoryItems.length) {
    memoryItems.push({
      memoryType: 'summary',
      content: localizeMemoryText(
        locale,
        'User performance remains stable. Continue varied practice.',
        'ביצועי המשתמש יציבים. כדאי להמשיך בתרגול מגוון.',
      ),
      importanceScore: 1,
    })
  }

  return {
    memoryItems,
    weaknessUpdates: signals.map((signal) => ({
      weaknessKey: signal.weaknessKey,
      weaknessLabel: signal.weaknessLabel,
      category: signal.category ?? '',
      delta: signal.delta,
    })),
    recommendedLevel,
  } satisfies MemoryUpdateResponse
}

export async function getTrainingContext(
  supabase: AppSupabaseClient,
  userId: string,
  bundle: ProfileBundle,
) {
  const [recentAttempts, weaknesses, memories, recommendations] = await Promise.all([
    getRecentAttemptsWithSimulations(supabase, userId, 10),
    getWeaknesses(supabase, userId, 10),
    getMemoryEntries(supabase, userId, 10),
    getRecommendations(supabase, userId, 5),
  ])

  return {
    bundle,
    recentAttempts,
    weaknesses,
    memories,
    recommendations,
  } satisfies TrainingContext
}

export function formatTrainingContext(context: TrainingContext) {
  return {
    profile: {
      preferredLanguage: context.bundle.profile.preferred_language,
      fullName: context.bundle.profile.full_name,
    },
    organization: context.organizationProfile
      ? {
          type: context.organizationProfile.type,
          label: context.organizationProfile.label,
          description: context.organizationProfile.description,
          onboardingHint: context.organizationProfile.onboardingHint,
          adminHint: context.organizationProfile.adminHint,
          employeeHint: context.organizationProfile.employeeHint,
          focusTopics: context.organizationProfile.focusTopics,
          priorityChannels: context.organizationProfile.priorityChannels,
          suggestedDomains: context.organizationProfile.suggestedDomains,
        }
      : null,
    trainingProfile: context.bundle.trainingProfile,
    weaknesses: context.weaknesses.map((weakness) => ({
      key: weakness.weakness_key,
      label: weakness.weakness_label,
      category: weakness.category,
      score: weakness.score,
    })),
    memories: context.memories.map((memory) => ({
      type: memory.memory_type,
      content: memory.content,
      importance: memory.importance_score,
      category: memory.related_category,
    })),
    recentAttempts: context.recentAttempts.map((attempt) => ({
      createdAt: attempt.created_at,
      isCorrect: attempt.is_correct,
      userAnswer: attempt.user_answer,
      simulationCategory: attempt.simulation?.category,
      simulationChannel: attempt.simulation?.channel,
      wasPhishing: attempt.simulation?.is_phishing,
    })),
  }
}

export async function applyMemoryUpdate(
  supabase: AppSupabaseClient,
  userId: string,
  category: SimulationCategory,
  memoryUpdate: MemoryUpdateResponse,
) {
  const memoryPayload = memoryUpdate.memoryItems.map((item) => ({
    user_id: userId,
    memory_type: item.memoryType,
    content: item.content,
    importance_score: item.importanceScore,
    related_category: category,
  }))

  const groupedWeaknessUpdates = Array.from(
    memoryUpdate.weaknessUpdates.reduce(
      (accumulator, item) => {
        const current = accumulator.get(item.weaknessKey)

        if (current) {
          current.delta += item.delta
          current.weaknessLabel = item.weaknessLabel || current.weaknessLabel
          current.category = item.category || current.category
          return accumulator
        }

        accumulator.set(item.weaknessKey, {
          weaknessKey: item.weaknessKey,
          weaknessLabel: item.weaknessLabel,
          category: item.category,
          delta: item.delta,
        })

        return accumulator
      },
      new Map<
        string,
        {
          weaknessKey: string
          weaknessLabel: string
          category?: string
          delta: number
        }
      >(),
    ).values(),
  )

  const existingWeaknesses = await getWeaknessesByKeys(
    supabase,
    userId,
    groupedWeaknessUpdates.map((item) => item.weaknessKey),
  )
  const existingWeaknessMap = new Map(
    existingWeaknesses.map((item) => [item.weakness_key, item]),
  )
  const seenAt = new Date().toISOString()

  const weaknessesPayload = groupedWeaknessUpdates.flatMap((item) => {
      const existing = existingWeaknessMap.get(item.weaknessKey)
      const nextScore = Math.max(0, (existing?.score ?? 0) + item.delta)

      if (!existing && nextScore === 0) {
        return []
      }

      return [{
        user_id: userId,
        weakness_key: item.weaknessKey,
        weakness_label: item.weaknessLabel || existing?.weakness_label || item.weaknessKey,
        category: (item.category
          ? (item.category as SimulationCategory)
          : existing?.category) ?? null,
        score: nextScore,
        last_seen_at: seenAt,
      }]
    })

  await Promise.all([
    insertMemoryEntries(supabase, memoryPayload),
    upsertWeaknesses(supabase, weaknessesPayload),
    updateTrainingProfileRow(supabase, userId, {
      current_level: memoryUpdate.recommendedLevel,
    }),
  ])
}

export async function buildMemoryUpdateFromRules(
  context: TrainingContext,
  simulation: TableRow<'simulations'>,
  userAnswer: boolean,
  isCorrect: boolean,
) {
  return buildFallbackMemoryUpdate(
    context,
    simulation,
    userAnswer,
    isCorrect,
    context.bundle.profile.preferred_language,
  )
}
