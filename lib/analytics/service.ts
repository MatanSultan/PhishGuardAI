import type { Channel, SimulationCategory } from '@/lib/constants'
import type { TableRow } from '@/lib/database.types'
import type { ProfileBundle } from '@/lib/profile/service'
import { formatCategoryLabel } from '@/lib/presentation'
import type { AttemptWithSimulation } from '@/lib/training/repository'

function ratioToPercent(value: number) {
  return Number.isFinite(value) ? Math.round(value * 100) : 0
}

function safeDivide(value: number, total: number) {
  return total > 0 ? value / total : 0
}

function displayTitle(simulation: TableRow<'simulations'> | null) {
  if (!simulation) {
    return 'Training attempt'
  }

  if (simulation.title?.trim()) {
    return simulation.title
  }

  return `${simulation.channel.toUpperCase()} ${formatCategoryLabel(simulation.category, 'en')}`
}

function groupAccuracyBy<T extends string>(
  attempts: AttemptWithSimulation[],
  getKey: (attempt: AttemptWithSimulation) => T | null | undefined,
) {
  const groups = new Map<T, { total: number; correct: number }>()

  attempts.forEach((attempt) => {
    const key = getKey(attempt)
    if (!key) {
      return
    }

    const current = groups.get(key) ?? { total: 0, correct: 0 }
    current.total += 1
    current.correct += attempt.is_correct ? 1 : 0
    groups.set(key, current)
  })

  return Array.from(groups.entries()).map(([key, value]) => ({
    key,
    attempts: value.total,
    correctRate: ratioToPercent(safeDivide(value.correct, value.total)),
  }))
}

function computeDailyStreak(attempts: AttemptWithSimulation[]) {
  const uniqueDays = Array.from(
    new Set(attempts.map((attempt) => attempt.created_at.slice(0, 10))),
  ).sort((a, b) => b.localeCompare(a))

  if (!uniqueDays.length) {
    return 0
  }

  let streak = 1
  let cursor = new Date(`${uniqueDays[0]}T00:00:00.000Z`)

  for (let index = 1; index < uniqueDays.length; index += 1) {
    const current = new Date(`${uniqueDays[index]}T00:00:00.000Z`)
    const diffDays = Math.round((cursor.getTime() - current.getTime()) / 86_400_000)

    if (diffDays === 1) {
      streak += 1
      cursor = current
      continue
    }

    break
  }

  return streak
}

function buildRecentAttempts(attempts: AttemptWithSimulation[]) {
  return attempts.slice(0, 10).map((attempt) => ({
    id: attempt.id,
    createdAt: attempt.created_at,
    isCorrect: attempt.is_correct,
    userAnswer: attempt.user_answer,
    confidence: attempt.confidence,
    aiFeedback: attempt.ai_feedback,
    simulation: attempt.simulation,
    title: displayTitle(attempt.simulation),
  }))
}

function buildScoreTrend(attempts: AttemptWithSimulation[]) {
  const chronological = [...attempts].reverse()
  let runningScore = 0

  return chronological.map((attempt, index) => {
    runningScore += attempt.is_correct ? 10 : 0

    return {
      index: index + 1,
      date: attempt.created_at.slice(0, 10),
      score: runningScore,
      correct: attempt.is_correct,
    }
  })
}

export function computeTrainingProfilePatch(
  attempts: AttemptWithSimulation[],
  fallbackLevel: TableRow<'user_training_profile'>['current_level'],
) {
  const totalAttempts = attempts.length
  const totalCorrect = attempts.filter((attempt) => attempt.is_correct).length
  const phishingAttempts = attempts.filter((attempt) => attempt.simulation?.is_phishing)
  const legitAttempts = attempts.filter((attempt) => attempt.simulation && !attempt.simulation.is_phishing)
  const phishingCorrect = phishingAttempts.filter((attempt) => attempt.is_correct).length
  const legitCorrect = legitAttempts.filter((attempt) => attempt.is_correct).length
  const confidenceValues = attempts
    .map((attempt) => attempt.confidence)
    .filter((value): value is number => typeof value === 'number')

  const categoryBreakdown = groupAccuracyBy(
    attempts,
    (attempt) => attempt.simulation?.category as SimulationCategory | undefined,
  )
  const sortedByAccuracy = [...categoryBreakdown].sort((left, right) => left.correctRate - right.correctRate)

  return {
    current_level: fallbackLevel,
    total_score: totalCorrect * 10,
    confidence_score: confidenceValues.length
      ? Math.round(
          safeDivide(
            confidenceValues.reduce((sum, value) => sum + value, 0),
            confidenceValues.length,
          ) * 50,
        )
      : 0,
    phishing_detection_rate: ratioToPercent(safeDivide(phishingCorrect, phishingAttempts.length)),
    legit_detection_rate: ratioToPercent(safeDivide(legitCorrect, legitAttempts.length)),
    weakest_category: sortedByAccuracy[0]?.key ?? null,
    strongest_category: sortedByAccuracy.at(-1)?.key ?? null,
    streak_count: computeDailyStreak(attempts),
    total_attempts: totalAttempts,
    last_trained_at: attempts[0]?.created_at ?? null,
  }
}

export function buildDashboardSummary(
  bundle: ProfileBundle,
  attempts: AttemptWithSimulation[],
  recommendations: TableRow<'training_recommendations'>[],
  weaknesses: TableRow<'user_weaknesses'>[],
) {
  const totalCorrect = attempts.filter((attempt) => attempt.is_correct).length
  const correctRate = ratioToPercent(safeDivide(totalCorrect, attempts.length))

  return {
    profile: bundle.profile,
    trainingProfile: bundle.trainingProfile,
    stats: {
      totalAttempts: bundle.trainingProfile.total_attempts,
      correctRate,
      phishingDetectionRate: Number(bundle.trainingProfile.phishing_detection_rate),
      legitDetectionRate: Number(bundle.trainingProfile.legit_detection_rate),
      totalScore: bundle.trainingProfile.total_score,
      streakCount: bundle.trainingProfile.streak_count,
      weakestCategory: bundle.trainingProfile.weakest_category,
      strongestCategory: bundle.trainingProfile.strongest_category,
      confidenceScore: Number(bundle.trainingProfile.confidence_score),
    },
    recentActivity: buildRecentAttempts(attempts).map((attempt) => ({
      ...attempt,
      channel: attempt.simulation?.channel ?? null,
      type: 'attempt' as const,
    })),
    recommendations,
    weaknesses,
  }
}

export function buildReportsPayload(
  bundle: ProfileBundle,
  attempts: AttemptWithSimulation[],
  recommendations: TableRow<'training_recommendations'>[],
  analyticsEvents: TableRow<'analytics_events'>[],
) {
  const overview = {
    totalAttempts: attempts.length,
    correctRate: ratioToPercent(safeDivide(attempts.filter((attempt) => attempt.is_correct).length, attempts.length)),
    phishingDetectionRate: Number(bundle.trainingProfile.phishing_detection_rate),
    legitDetectionRate: Number(bundle.trainingProfile.legit_detection_rate),
    totalScore: bundle.trainingProfile.total_score,
    streakCount: bundle.trainingProfile.streak_count,
    confidenceScore: Number(bundle.trainingProfile.confidence_score),
  }

  const categoryBreakdown = groupAccuracyBy(
    attempts,
    (attempt) => attempt.simulation?.category as SimulationCategory | undefined,
  )

  const channelBreakdown = groupAccuracyBy(
    attempts,
    (attempt) => attempt.simulation?.channel as Channel | undefined,
  )

  return {
    overview,
    categoryBreakdown,
    channelBreakdown,
    scoreTrend: buildScoreTrend(attempts),
    recentAttempts: buildRecentAttempts(attempts),
    recommendations,
    recentActivity: analyticsEvents,
  }
}
