import type { SupabaseClient } from '@supabase/supabase-js'

import { getOrganizationDashboardData } from '@/lib/company-analytics/service'
import type { Database, TableRow } from '@/lib/database.types'
import { getOrganizationSimulationKeywords } from '@/lib/organizations/segments'
import {
  listOrganizationMembers,
  listTeamInvites,
  type OrganizationContext,
  type OrganizationMemberRecord,
} from '@/lib/organizations/service'
import { requireOrganizationAdmin } from '@/lib/permissions'

type AppSupabaseClient = SupabaseClient<Database>

export interface AdminSimulationPreview {
  id: string
  title: string | null
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
  created_at: string
}

export interface AdminOverviewPayload {
  dashboard: Awaited<ReturnType<typeof getOrganizationDashboardData>>
  simulations: AdminSimulationPreview[]
  members: OrganizationMemberRecord[]
  invites: TableRow<'team_invites'>[]
}

export async function listAdminSimulationPreviews(
  supabase: AppSupabaseClient,
  organizationType: TableRow<'organizations'>['organization_type'],
) {
  const { data, error } = await supabase
    .from('simulations')
    .select('id, title, difficulty, category, created_at, sender, content, explanation')
    .order('created_at', { ascending: false })
    .limit(60)

  if (error) {
    throw error
  }

  const keywords = getOrganizationSimulationKeywords(organizationType).map((keyword) =>
    keyword.toLowerCase(),
  )

  const scoredSimulations = [...(data ?? [])].sort((left, right) => {
    const leftText = [left.title, left.sender, left.content, left.explanation]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    const rightText = [right.title, right.sender, right.content, right.explanation]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    const leftScore = keywords.reduce(
      (score, keyword) => score + (leftText.includes(keyword) ? 1 : 0),
      0,
    )
    const rightScore = keywords.reduce(
      (score, keyword) => score + (rightText.includes(keyword) ? 1 : 0),
      0,
    )

    if (leftScore !== rightScore) {
      return rightScore - leftScore
    }

    return right.created_at.localeCompare(left.created_at)
  })

  return scoredSimulations.slice(0, 30).map((simulation) => ({
    id: simulation.id,
    title: simulation.title,
    difficulty: simulation.difficulty,
    category: simulation.category,
    created_at: simulation.created_at,
  }))
}

export async function getAdminOverviewPayload(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<AdminOverviewPayload> {
  const context = await requireOrganizationAdmin(supabase, userId)

  return getAdminOverviewPayloadFromContext(supabase, context)
}

export async function getAdminOverviewPayloadFromContext(
  supabase: AppSupabaseClient,
  context: OrganizationContext,
): Promise<AdminOverviewPayload> {

  const [members, invites, simulations] = await Promise.all([
    listOrganizationMembers(supabase, context.organization.id),
    listTeamInvites(supabase, context.organization.id),
    listAdminSimulationPreviews(supabase, context.organization.organization_type),
  ])
  const dashboard = await getOrganizationDashboardData(supabase, context, {
    memberRecords: members,
    invites,
  })

  return {
    dashboard,
    simulations,
    members,
    invites,
  }
}
