import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  Channel,
  Difficulty,
  OrganizationMemberStatus,
  OrganizationType,
  SimulationCategory,
} from '@/lib/constants'
import type { Database, TableRow } from '@/lib/database.types'
import {
  listTeamInvites,
  listOrganizationMembers,
  type OrganizationContext,
  type OrganizationMemberRecord,
} from '@/lib/organizations/service'
import { getOrganizationExperienceProfile } from '@/lib/organizations/experience'
import {
  getOrganizationSegmentProfile,
  getOrganizationSuggestedDomains,
} from '@/lib/organizations/segments'
import { formatCategoryLabel, formatChannelLabel } from '@/lib/presentation'
import { getProfileBundle } from '@/lib/profile/service'
import { generateOrganizationRiskSummary } from '@/lib/summaries/service'

type AppSupabaseClient = SupabaseClient<Database>
type LeaderboardRow = Database['public']['Functions']['get_organization_leaderboard_rows']['Returns'][number]

interface OrganizationAttempt extends TableRow<'user_attempts'> {
  simulation: TableRow<'simulations'> | null
}

export interface CompanyReportFilters {
  category?: SimulationCategory
  channel?: Channel
  dateFrom?: string
  dateTo?: string
  employeeId?: string
}

export interface CompanyMemberMetric {
  rank?: number
  userId: string
  memberId: string
  fullName: string
  email: string
  role: 'member' | 'admin'
  status: OrganizationMemberStatus
  joinedAt: string
  totalScore: number
  totalAttempts: number
  accuracyRate: number
  streakCount: number
  currentLevel: Difficulty
  phishingDetectionRate: number
  safeDetectionRate: number
  weakestCategory: SimulationCategory | null
  strongestCategory: SimulationCategory | null
  lastTrainedAt: string | null
}

export interface CompanyRecommendation {
  kind:
    | 'focus_category'
    | 'improve_safe_detection'
    | 'increase_phishing_exposure'
    | 'reengage_low_activity'
    | 'segment_mix'
  category?: SimulationCategory
  count?: number
  organizationType?: OrganizationType | null
  industry?: string | null
  domains?: SimulationCategory[]
}

export interface CompanyAttentionFlag {
  userId: string
  memberId: string
  fullName: string
  email: string
  role: 'member' | 'admin'
  status: OrganizationMemberStatus
  accuracyRate: number
  totalAttempts: number
  lastTrainedAt: string | null
  daysSinceLastActivity: number | null
  repeatedCategory: SimulationCategory | null
  repeatedIncorrectCount: number
  reasons: Array<'low_accuracy' | 'inactive' | 'repeated_category_failure'>
}

function safeDivide(value: number, total: number) {
  return total > 0 ? value / total : 0
}

function ratioToPercent(value: number) {
  return Number.isFinite(value) ? Math.round(value * 100) : 0
}

function getDaysSince(date: string | null) {
  if (!date) {
    return null
  }

  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000)
}

function isActiveMember<T extends Pick<CompanyMemberMetric, 'status'>>(member: T) {
  return member.status === 'active'
}

function getRecentActiveEmployeeCount(
  members: Array<Pick<CompanyMemberMetric, 'lastTrainedAt' | 'status'>>,
  windowDays = 14,
) {
  const windowMs = windowDays * 86_400_000

  return members.filter((member) => {
    if (member.status !== 'active' || !member.lastTrainedAt) {
      return false
    }

    return Date.now() - new Date(member.lastTrainedAt).getTime() <= windowMs
  }).length
}

function toMemberMetric(record: OrganizationMemberRecord): CompanyMemberMetric {
  const profile = record.profile
  const trainingProfile = record.trainingProfile
  const totalAttempts = trainingProfile?.total_attempts ?? 0
  const totalScore = trainingProfile?.total_score ?? 0

  return {
    userId: record.membership.user_id,
    memberId: record.membership.id,
    fullName: profile?.full_name?.trim() || profile?.email || 'Team member',
    email: profile?.email ?? '',
    role: record.membership.role,
    status: record.membership.status,
    joinedAt: record.membership.joined_at,
    totalScore,
    totalAttempts,
    accuracyRate: totalAttempts > 0 ? Math.round((totalScore / 10 / totalAttempts) * 100) : 0,
    streakCount: trainingProfile?.streak_count ?? 0,
    currentLevel: trainingProfile?.current_level ?? 'easy',
    phishingDetectionRate: Number(trainingProfile?.phishing_detection_rate ?? 0),
    safeDetectionRate: Number(trainingProfile?.legit_detection_rate ?? 0),
    weakestCategory: trainingProfile?.weakest_category ?? null,
    strongestCategory: trainingProfile?.strongest_category ?? null,
    lastTrainedAt: trainingProfile?.last_trained_at ?? null,
  }
}

function toLeaderboardMetric(record: LeaderboardRow): CompanyMemberMetric {
  const totalAttempts = record.total_attempts ?? 0
  const totalScore = record.total_score ?? 0

  return {
    userId: record.user_id,
    memberId: record.member_id,
    fullName: record.full_name?.trim() || record.email || 'Team member',
    email: record.email ?? '',
    role: record.role,
    status: 'active',
    joinedAt: record.joined_at,
    totalScore,
    totalAttempts,
    accuracyRate: totalAttempts > 0 ? Math.round((totalScore / 10 / totalAttempts) * 100) : 0,
    streakCount: record.streak_count ?? 0,
    currentLevel: record.current_level ?? 'easy',
    phishingDetectionRate: Number(record.phishing_detection_rate ?? 0),
    safeDetectionRate: Number(record.safe_detection_rate ?? 0),
    weakestCategory: record.weakest_category ?? null,
    strongestCategory: record.strongest_category ?? null,
    lastTrainedAt: record.last_trained_at ?? null,
  }
}

function sortLeaderboard(left: CompanyMemberMetric, right: CompanyMemberMetric) {
  if (left.totalScore !== right.totalScore) {
    return right.totalScore - left.totalScore
  }

  if (left.accuracyRate !== right.accuracyRate) {
    return right.accuracyRate - left.accuracyRate
  }

  if (left.streakCount !== right.streakCount) {
    return right.streakCount - left.streakCount
  }

  if (left.totalAttempts !== right.totalAttempts) {
    return right.totalAttempts - left.totalAttempts
  }

  return left.fullName.localeCompare(right.fullName)
}

function withRanks(entries: CompanyMemberMetric[]) {
  let previous: CompanyMemberMetric | null = null
  let previousRank = 0

  return entries.map((entry, index) => {
    const sameAsPrevious =
      previous &&
      previous.totalScore === entry.totalScore &&
      previous.accuracyRate === entry.accuracyRate &&
      previous.streakCount === entry.streakCount &&
      previous.totalAttempts === entry.totalAttempts

    const rank = sameAsPrevious ? previousRank : index + 1
    previous = entry
    previousRank = rank

    return {
      ...entry,
      rank,
    }
  })
}

function countCategories(
  members: CompanyMemberMetric[],
  key: 'weakestCategory' | 'strongestCategory',
) {
  const counts = new Map<SimulationCategory, number>()

  members.forEach((member) => {
    const category = member[key]

    if (!category) {
      return
    }

    counts.set(category, (counts.get(category) ?? 0) + 1)
  })

  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((left, right) => right.count - left.count)
}

async function getOrganizationAttempts(
  supabase: AppSupabaseClient,
  members: OrganizationMemberRecord[],
) {
  const userIds = members.map((member) => member.membership.user_id)

  if (!userIds.length) {
    return [] as OrganizationAttempt[]
  }

  const { data, error } = await supabase
    .from('user_attempts')
    .select('*, simulation:simulations(*)')
    .in('user_id', userIds)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  const joinedAtByUser = new Map(
    members.map((member) => [member.membership.user_id, member.membership.joined_at]),
  )

  return ((data ?? []) as unknown as OrganizationAttempt[]).filter((attempt) => {
    const joinedAt = joinedAtByUser.get(attempt.user_id)
    return joinedAt ? attempt.created_at >= joinedAt : true
  })
}

function groupAccuracyBy<T extends string>(
  attempts: OrganizationAttempt[],
  getKey: (attempt: OrganizationAttempt) => T | null | undefined,
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

  return Array.from(groups.entries())
    .map(([key, value]) => ({
      key,
      attempts: value.total,
      correctRate: ratioToPercent(safeDivide(value.correct, value.total)),
    }))
    .sort((left, right) => right.attempts - left.attempts)
}

function buildTrend(attempts: OrganizationAttempt[]) {
  const daily = new Map<string, { attempts: number; correct: number; score: number }>()

  attempts.forEach((attempt) => {
    const day = attempt.created_at.slice(0, 10)
    const current = daily.get(day) ?? { attempts: 0, correct: 0, score: 0 }
    current.attempts += 1
    current.correct += attempt.is_correct ? 1 : 0
    current.score += attempt.is_correct ? 10 : 0
    daily.set(day, current)
  })

  return Array.from(daily.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({
      date,
      attempts: value.attempts,
      correctRate: ratioToPercent(safeDivide(value.correct, value.attempts)),
      score: value.score,
    }))
}

function buildRecentActivity(attempts: OrganizationAttempt[], members: CompanyMemberMetric[]) {
  const membersByUser = new Map(members.map((member) => [member.userId, member]))

  return attempts.slice(0, 12).map((attempt) => ({
    id: attempt.id,
    createdAt: attempt.created_at,
    isCorrect: attempt.is_correct,
    channel: attempt.simulation?.channel ?? null,
    category: attempt.simulation?.category ?? null,
    title:
      attempt.simulation?.title ||
      (attempt.simulation
        ? `${attempt.simulation.channel.toUpperCase()} ${attempt.simulation.category}`
        : 'Attempt'),
    employeeName: membersByUser.get(attempt.user_id)?.fullName ?? 'Team member',
    employeeEmail: membersByUser.get(attempt.user_id)?.email ?? '',
  }))
}

function buildMostImprovedEmployees(
  attempts: OrganizationAttempt[],
  members: CompanyMemberMetric[],
) {
  const attemptsByUser = new Map<string, OrganizationAttempt[]>()

  attempts.forEach((attempt) => {
    const current = attemptsByUser.get(attempt.user_id) ?? []
    current.push(attempt)
    attemptsByUser.set(attempt.user_id, current)
  })

  return members
    .filter(isActiveMember)
    .map((member) => {
      const userAttempts = attemptsByUser.get(member.userId) ?? []

      if (userAttempts.length < 4) {
        return null
      }

      const recent = userAttempts.slice(0, 4)
      const previous = userAttempts.slice(4, 8)

      if (!previous.length) {
        return null
      }

      const recentRate = ratioToPercent(
        safeDivide(recent.filter((attempt) => attempt.is_correct).length, recent.length),
      )
      const previousRate = ratioToPercent(
        safeDivide(previous.filter((attempt) => attempt.is_correct).length, previous.length),
      )

      return {
        userId: member.userId,
        fullName: member.fullName,
        email: member.email,
        improvement: recentRate - previousRate,
        recentRate,
        previousRate,
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => item.improvement > 0)
    .sort((left, right) => right.improvement - left.improvement)
    .slice(0, 5)
}

function buildLowEngagementMembers(members: CompanyMemberMetric[]) {
  return members
    .filter(isActiveMember)
    .map((member) => {
      const daysSinceLastActivity = getDaysSince(member.lastTrainedAt)

      return {
        userId: member.userId,
        fullName: member.fullName,
        email: member.email,
        totalAttempts: member.totalAttempts,
        lastTrainedAt: member.lastTrainedAt,
        daysSinceLastActivity,
      }
    })
    .filter((member) => member.totalAttempts === 0 || (member.daysSinceLastActivity ?? 999) >= 14)
    .sort((left, right) => (right.daysSinceLastActivity ?? 999) - (left.daysSinceLastActivity ?? 999))
    .slice(0, 8)
}

function buildEmployeesNeedingSupport(members: CompanyMemberMetric[]) {
  return [...members]
    .filter((member) => member.status === 'active' && member.totalAttempts > 0)
    .sort((left, right) => {
      if (left.accuracyRate !== right.accuracyRate) {
        return left.accuracyRate - right.accuracyRate
      }

      if (left.totalAttempts !== right.totalAttempts) {
        return right.totalAttempts - left.totalAttempts
      }

      return left.fullName.localeCompare(right.fullName)
    })
    .slice(0, 5)
    .map((member) => ({
      fullName: member.fullName,
      email: member.email,
      accuracyRate: member.accuracyRate,
      totalAttempts: member.totalAttempts,
      weakestCategory: member.weakestCategory,
    }))
}

function buildCompanyRecommendations(
  context: OrganizationContext,
  overview: {
    activeEmployees: number
    totalEmployees: number
    phishingDetectionRate: number
    safeDetectionRate: number
  },
  weakestCategories: Array<{ category: SimulationCategory; count: number }>,
  lowEngagement: ReturnType<typeof buildLowEngagementMembers>,
) {
  const recommendations: CompanyRecommendation[] = []

  if (weakestCategories[0]) {
    recommendations.push({
      kind: 'focus_category',
      category: weakestCategories[0].category,
      count: weakestCategories[0].count,
      organizationType: context.organization.organization_type,
    })
  }

  if (overview.safeDetectionRate < 70) {
    recommendations.push({
      kind: 'improve_safe_detection',
    })
  } else if (overview.phishingDetectionRate < 75) {
    recommendations.push({
      kind: 'increase_phishing_exposure',
    })
  }

  if (lowEngagement.length > 0) {
    recommendations.push({
      kind: 'reengage_low_activity',
      count: lowEngagement.length,
    })
  }

  const suggestedDomains = getOrganizationSuggestedDomains(
    context.organization.organization_type,
    context.organization.industry,
  )

  if (suggestedDomains.length) {
    recommendations.push({
      kind: 'segment_mix',
      organizationType: context.organization.organization_type,
      industry: context.organization.industry,
      domains: suggestedDomains,
    })
  }

  return recommendations.slice(0, 4)
}

function getCategoryFailureMap(attempts: OrganizationAttempt[]) {
  const perUser = new Map<
    string,
    Map<SimulationCategory, { total: number; incorrect: number }>
  >()

  attempts.forEach((attempt) => {
    const category = attempt.simulation?.category

    if (!category) {
      return
    }

    const userMap = perUser.get(attempt.user_id) ?? new Map()
    const entry = userMap.get(category) ?? { total: 0, incorrect: 0 }
    entry.total += 1
    entry.incorrect += attempt.is_correct ? 0 : 1
    userMap.set(category, entry)
    perUser.set(attempt.user_id, userMap)
  })

  return perUser
}

function buildAttentionFlags(
  members: CompanyMemberMetric[],
  attempts: OrganizationAttempt[],
) {
  const categoryFailuresByUser = getCategoryFailureMap(attempts)

  return members
    .filter(isActiveMember)
    .map((member) => {
      const reasons: CompanyAttentionFlag['reasons'] = []
      const daysSinceLastActivity = getDaysSince(member.lastTrainedAt)
      let repeatedCategory: SimulationCategory | null = null
      let repeatedIncorrectCount = 0

      if (member.totalAttempts >= 4 && member.accuracyRate < 65) {
        reasons.push('low_accuracy')
      }

      if (member.totalAttempts === 0 || (daysSinceLastActivity ?? 999) >= 14) {
        reasons.push('inactive')
      }

      const categoryFailures = Array.from(
        (categoryFailuresByUser.get(member.userId) ?? new Map()).entries(),
      )
        .map(([category, value]) => ({
          category,
          incorrect: value.incorrect,
          correctRate: ratioToPercent(safeDivide(value.total - value.incorrect, value.total)),
        }))
        .sort((left, right) => {
          if (left.incorrect !== right.incorrect) {
            return right.incorrect - left.incorrect
          }

          return left.correctRate - right.correctRate
        })

      const topFailure = categoryFailures[0]

      if (topFailure && topFailure.incorrect >= 3 && topFailure.correctRate < 60) {
        repeatedCategory = topFailure.category
        repeatedIncorrectCount = topFailure.incorrect
        reasons.push('repeated_category_failure')
      }

      if (!reasons.length) {
        return null
      }

      return {
        userId: member.userId,
        memberId: member.memberId,
        fullName: member.fullName,
        email: member.email,
        role: member.role,
        status: member.status,
        accuracyRate: member.accuracyRate,
        totalAttempts: member.totalAttempts,
        lastTrainedAt: member.lastTrainedAt,
        daysSinceLastActivity,
        repeatedCategory,
        repeatedIncorrectCount,
        reasons,
      } satisfies CompanyAttentionFlag
    })
    .filter((flag): flag is CompanyAttentionFlag => Boolean(flag))
    .sort((left, right) => {
      if (left.reasons.length !== right.reasons.length) {
        return right.reasons.length - left.reasons.length
      }

      if (left.accuracyRate !== right.accuracyRate) {
        return left.accuracyRate - right.accuracyRate
      }

      return (right.daysSinceLastActivity ?? 999) - (left.daysSinceLastActivity ?? 999)
    })
    .slice(0, 6)
}

function toIsoStart(date: string) {
  return new Date(`${date}T00:00:00.000Z`).toISOString()
}

function toIsoEnd(date: string) {
  return new Date(`${date}T23:59:59.999Z`).toISOString()
}

function applyAttemptFilters(attempts: OrganizationAttempt[], filters: CompanyReportFilters) {
  const start = filters.dateFrom ? toIsoStart(filters.dateFrom) : null
  const end = filters.dateTo ? toIsoEnd(filters.dateTo) : null

  return attempts.filter((attempt) => {
    if (filters.employeeId && attempt.user_id !== filters.employeeId) {
      return false
    }

    if (filters.category && attempt.simulation?.category !== filters.category) {
      return false
    }

    if (filters.channel && attempt.simulation?.channel !== filters.channel) {
      return false
    }

    if (start && attempt.created_at < start) {
      return false
    }

    if (end && attempt.created_at > end) {
      return false
    }

    return true
  })
}

function buildFilteredMemberMetrics(
  members: CompanyMemberMetric[],
  attempts: OrganizationAttempt[],
  filters: CompanyReportFilters,
) {
  const attemptsByUser = new Map<string, OrganizationAttempt[]>()

  attempts.forEach((attempt) => {
    const current = attemptsByUser.get(attempt.user_id) ?? []
    current.push(attempt)
    attemptsByUser.set(attempt.user_id, current)
  })

  return members
    .filter((member) => !filters.employeeId || member.userId === filters.employeeId)
    .map((member) => {
      const userAttempts = attemptsByUser.get(member.userId) ?? []
      const phishingAttempts = userAttempts.filter((attempt) => attempt.simulation?.is_phishing)
      const safeAttempts = userAttempts.filter(
        (attempt) => attempt.simulation && !attempt.simulation.is_phishing,
      )
      const categoryBreakdown = groupAccuracyBy(
        userAttempts,
        (attempt) => attempt.simulation?.category as SimulationCategory | undefined,
      )
      const strongestCategory = [...categoryBreakdown].sort((left, right) => {
        if (left.correctRate !== right.correctRate) {
          return right.correctRate - left.correctRate
        }

        return right.attempts - left.attempts
      })[0]?.key
      const weakestCategory = [...categoryBreakdown].sort((left, right) => {
        if (left.correctRate !== right.correctRate) {
          return left.correctRate - right.correctRate
        }

        return right.attempts - left.attempts
      })[0]?.key

      return {
        ...member,
        totalScore: userAttempts.filter((attempt) => attempt.is_correct).length * 10,
        totalAttempts: userAttempts.length,
        accuracyRate: ratioToPercent(
          safeDivide(userAttempts.filter((attempt) => attempt.is_correct).length, userAttempts.length),
        ),
        phishingDetectionRate: ratioToPercent(
          safeDivide(phishingAttempts.filter((attempt) => attempt.is_correct).length, phishingAttempts.length),
        ),
        safeDetectionRate: ratioToPercent(
          safeDivide(safeAttempts.filter((attempt) => attempt.is_correct).length, safeAttempts.length),
        ),
        weakestCategory: (weakestCategory as SimulationCategory | undefined) ?? member.weakestCategory,
        strongestCategory:
          (strongestCategory as SimulationCategory | undefined) ?? member.strongestCategory,
        lastTrainedAt: userAttempts[0]?.created_at ?? member.lastTrainedAt,
      }
    })
    .filter((member) => filters.employeeId || member.totalAttempts > 0 || member.status === 'suspended')
}

export async function getOrganizationLeaderboard(
  supabase: AppSupabaseClient,
  context: OrganizationContext,
  pagination: {
    page: number
    limit: number
  },
) {
  if (context.settings && !context.settings.allow_leaderboard) {
    return {
      organization: context.organization,
      membership: context.membership,
      settings: context.settings,
      pagination: {
        ...pagination,
        total: 0,
        totalPages: 1,
      },
      rows: [] as CompanyMemberMetric[],
    }
  }

  const { data, error } = await supabase.rpc('get_organization_leaderboard_rows', {
    target_organization_id: context.organization.id,
  })

  if (error) {
    throw error
  }

  const ranked = withRanks(((data ?? []) as LeaderboardRow[]).map(toLeaderboardMetric).sort(sortLeaderboard))
  const total = ranked.length
  const totalPages = Math.max(1, Math.ceil(total / pagination.limit))
  const start = (pagination.page - 1) * pagination.limit
  const rows = ranked.slice(start, start + pagination.limit)

  return {
    organization: context.organization,
    membership: context.membership,
    settings: context.settings,
    pagination: {
      ...pagination,
      total,
      totalPages,
    },
    rows,
  }
}

export async function getOrganizationDashboardData(
  supabase: AppSupabaseClient,
  context: OrganizationContext,
) {
  const [memberRecords, adminBundle] = await Promise.all([
    listOrganizationMembers(supabase, context.organization.id),
    getProfileBundle(supabase, context.membership.user_id),
  ])
  const memberMetrics = memberRecords.map(toMemberMetric)
  const activeMemberMetrics = memberMetrics.filter(isActiveMember)
  const attempts = await getOrganizationAttempts(supabase, memberRecords)

  const phishingAttempts = attempts.filter((attempt) => attempt.simulation?.is_phishing)
  const safeAttempts = attempts.filter((attempt) => attempt.simulation && !attempt.simulation.is_phishing)
  const activeEmployees = getRecentActiveEmployeeCount(memberMetrics)

  const weakestCategories = countCategories(activeMemberMetrics, 'weakestCategory').slice(0, 3)
  const strongestCategories = countCategories(activeMemberMetrics, 'strongestCategory').slice(0, 3)
  const leaderboardPreview = withRanks([...activeMemberMetrics].sort(sortLeaderboard)).slice(0, 5)
  const lowEngagement = buildLowEngagementMembers(memberMetrics)
  const employeesNeedingSupport = buildEmployeesNeedingSupport(activeMemberMetrics)
  const attentionFlags = buildAttentionFlags(activeMemberMetrics, attempts)
  const pendingInvites = (await listTeamInvites(supabase, context.organization.id, 5)).filter(
    (invite) => invite.status === 'pending',
  )
  const channelBreakdown = groupAccuracyBy(
    attempts,
    (attempt) => attempt.simulation?.channel as Channel | undefined,
  )

  const overview = {
    totalEmployees: memberMetrics.length,
    activeEmployees,
    totalSimulationsCompleted: attempts.length,
    phishingDetectionRate: ratioToPercent(
      safeDivide(
        phishingAttempts.filter((attempt) => attempt.is_correct).length,
        phishingAttempts.length,
      ),
    ),
    safeDetectionRate: ratioToPercent(
      safeDivide(safeAttempts.filter((attempt) => attempt.is_correct).length, safeAttempts.length),
    ),
  }
  const companyRecommendations = buildCompanyRecommendations(
    context,
    overview,
    weakestCategories,
    lowEngagement,
  )
  const aiSummary = await generateOrganizationRiskSummary({
    locale: adminBundle.profile.preferred_language,
    organizationName: context.organization.name,
    organizationType: context.organization.organization_type,
    industry: context.organization.industry,
    overview,
    weakestCategories,
    channelBreakdown,
    lowEngagement,
    employeesNeedingSupport,
    companyRecommendations,
    attentionFlags,
  })

  return {
    organization: context.organization,
    membership: context.membership,
    settings: context.settings,
    overview,
    channelBreakdown,
    weakestCategories,
    strongestCategories,
    recentActivity: buildRecentActivity(attempts, memberMetrics),
    companyRecommendations,
    aiSummary,
    leaderboardPreview,
    teamProgressTrend: buildTrend(attempts),
    lowEngagement,
    employeesNeedingSupport,
    pendingInvites,
    attentionFlags,
  }
}

export async function getOrganizationReportsData(
  supabase: AppSupabaseClient,
  context: OrganizationContext,
  filters: CompanyReportFilters = {},
) {
  const [memberRecords, adminBundle] = await Promise.all([
    listOrganizationMembers(supabase, context.organization.id),
    getProfileBundle(supabase, context.membership.user_id),
  ])
  const locale = adminBundle.profile.preferred_language
  const organizationProfile = getOrganizationSegmentProfile(
    context.organization.organization_type,
    context.organization.industry,
    locale,
  )
  const organizationExperience = getOrganizationExperienceProfile(
    context.organization.organization_type,
    locale,
  )
  const memberMetrics = memberRecords.map(toMemberMetric)
  const attempts = await getOrganizationAttempts(supabase, memberRecords)
  const filteredAttempts = applyAttemptFilters(attempts, filters)
  const filteredMemberMetrics = buildFilteredMemberMetrics(memberMetrics, filteredAttempts, filters)
  const categoryBreakdown = groupAccuracyBy(
    filteredAttempts,
    (attempt) => attempt.simulation?.category as SimulationCategory | undefined,
  )
  const channelBreakdown = groupAccuracyBy(
    filteredAttempts,
    (attempt) => attempt.simulation?.channel as Channel | undefined,
  )
  const weakestCategory = [...categoryBreakdown].sort((left, right) => {
    if (left.correctRate !== right.correctRate) {
      return left.correctRate - right.correctRate
    }

    return right.attempts - left.attempts
  })[0] ?? null
  const strongestCategory = [...categoryBreakdown].sort((left, right) => {
    if (left.correctRate !== right.correctRate) {
      return right.correctRate - left.correctRate
    }

    return right.attempts - left.attempts
  })[0] ?? null
  const riskiestChannel = [...channelBreakdown].sort((left, right) => {
    if (left.correctRate !== right.correctRate) {
      return left.correctRate - right.correctRate
    }

    return right.attempts - left.attempts
  })[0] ?? null
  const lowEngagement = buildLowEngagementMembers(filteredMemberMetrics)
  const employeesNeedingRefreshers = filteredMemberMetrics.filter(
    (member) => member.status === 'active' && member.totalAttempts >= 3 && member.accuracyRate < 65,
  )
  const newerEmployees = filteredMemberMetrics.filter(
    (member) => member.status === 'active' && member.totalAttempts > 0 && member.totalAttempts < 3,
  )
  const practicalRecommendations = [
    weakestCategory
      ? locale === 'he'
        ? `חזקו את ${formatCategoryLabel(
            weakestCategory.key,
            locale,
            context.organization.organization_type,
          )} דרך תרחישים כמו ${organizationProfile.focusTopics[0]}.`
        : `Reinforce ${formatCategoryLabel(
            weakestCategory.key,
            locale,
            context.organization.organization_type,
          )} with scenarios such as ${organizationProfile.focusTopics[0]}.`
      : '',
    riskiestChannel
      ? locale === 'he'
        ? `${formatChannelLabel(riskiestChannel.key, locale)} הוא כרגע הערוץ הכי מסוכן. הריצו עוד תרגול סביב ${organizationProfile.focusTopics[1] ?? organizationProfile.focusTopics[0]}.`
        : `${formatChannelLabel(riskiestChannel.key, locale)} is the riskiest channel right now. Run more practice around ${organizationProfile.focusTopics[1] ?? organizationProfile.focusTopics[0]}.`
      : '',
    employeesNeedingRefreshers.length
      ? locale === 'he'
        ? `${employeesNeedingRefreshers.length} עובדים עם דיוק נמוך צריכים רענון קצר וממוקד השבוע.`
        : `${employeesNeedingRefreshers.length} employees with lower accuracy should get a short targeted refresher this week.`
      : '',
    lowEngagement.length
      ? locale === 'he'
        ? `${lowEngagement.length} עובדים כמעט לא התאמנו לאחרונה. כדאי לשלוח להם חיזוק פשוט ולתאם סבב חזרה.`
        : `${lowEngagement.length} employees have little recent activity. Send a simple follow-up and restart their training cadence.`
      : '',
    ...organizationExperience.managerActions,
    locale === 'he'
      ? `לסבב הבא, התחילו עם ${organizationProfile.suggestedDomains
          .slice(0, 3)
          .map((domain) =>
            formatCategoryLabel(domain, locale, context.organization.organization_type),
          )
          .join(', ')}.`
      : `For the next cycle, start with ${organizationProfile.suggestedDomains
          .slice(0, 3)
          .map((domain) =>
            formatCategoryLabel(domain, locale, context.organization.organization_type),
          )
          .join(', ')}.`,
  ].filter(Boolean).slice(0, 5)
  const employeeGroupsNeedingRefreshers = [
    employeesNeedingRefreshers.length
      ? locale === 'he'
        ? `עובדים עם פחות מ-65% דיוק: ${employeesNeedingRefreshers.length}`
        : `Employees below 65% accuracy: ${employeesNeedingRefreshers.length}`
      : '',
    lowEngagement.length
      ? locale === 'he'
        ? `עובדים בלי פעילות עדכנית: ${lowEngagement.length}`
        : `Employees with low recent activity: ${lowEngagement.length}`
      : '',
    newerEmployees.length
      ? locale === 'he'
        ? `עובדים שצריכים קו בסיס ראשוני: ${newerEmployees.length}`
        : `Employees still building a baseline: ${newerEmployees.length}`
      : '',
  ].filter(Boolean)
  const plainLanguageSummary =
    locale === 'he'
      ? `${organizationProfile.label}: הדוח הזה שם דגש על ${weakestCategory ? formatCategoryLabel(weakestCategory.key, locale, context.organization.organization_type) : organizationProfile.focusTopics[0]}, על ${riskiestChannel ? formatChannelLabel(riskiestChannel.key, locale) : 'הערוצים המרכזיים'}, ועל צעדים מעשיים למנהלים לא טכניים. דוגמה רלוונטית: ${organizationExperience.scenarioExamples[0]}`
      : `${organizationProfile.label}: this report keeps the focus on ${weakestCategory ? formatCategoryLabel(weakestCategory.key, locale, context.organization.organization_type) : organizationProfile.focusTopics[0]}, the ${riskiestChannel ? formatChannelLabel(riskiestChannel.key, locale).toLowerCase() : 'main communication channels'}, and practical next steps for non-technical managers. Relevant example: ${organizationExperience.scenarioExamples[0]}`

  return {
    organization: context.organization,
    membership: context.membership,
    settings: context.settings,
    selectedFilters: filters,
    availableEmployees: memberMetrics.map((member) => ({
      userId: member.userId,
      fullName: member.fullName,
      email: member.email,
      role: member.role,
      status: member.status,
    })),
    overview: {
      totalEmployees: filteredMemberMetrics.length,
      totalAttempts: filteredAttempts.length,
      averageAccuracy: ratioToPercent(
        safeDivide(filteredAttempts.filter((attempt) => attempt.is_correct).length, filteredAttempts.length),
      ),
      activeEmployees: getRecentActiveEmployeeCount(filteredMemberMetrics),
    },
    employeePerformance: [...filteredMemberMetrics].sort(sortLeaderboard),
    categoryBreakdown,
    channelBreakdown,
    scoreTrend: buildTrend(filteredAttempts),
    weakestCategory,
    strongestCategory,
    plainLanguageSummary,
    practicalRecommendations,
    employeeGroupsNeedingRefreshers,
    mostImproved: buildMostImprovedEmployees(filteredAttempts, filteredMemberMetrics),
    lowEngagement,
    recentActivity: buildRecentActivity(filteredAttempts, filteredMemberMetrics),
  }
}
