import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database, TableRow } from '@/lib/database.types'

type AppSupabaseClient = SupabaseClient<Database>

export type OwnerListOrganization = Pick<
  TableRow<'organizations'>,
  | 'id'
  | 'name'
  | 'slug'
  | 'organization_type'
  | 'plan_type'
  | 'plan_status'
  | 'max_members_allowed'
  | 'trial_ends_at'
  | 'access_blocked'
  | 'billing_notes'
  | 'created_at'
> & {
  active_members: number
  total_members: number
  attempts_7d: number
  attempts_30d: number
  last_activity: string | null
  pending_invites: number
  limit_reached: boolean
  likely_to_convert: boolean
  follow_up_status: TableRow<'owner_org_notes'>['follow_up_status']
  owner_note: string | null
}

export interface OwnerListStats {
  total: number
  free: number
  trial: number
  paid: number
  blocked: number
  hittingLimits: number
  likelyToConvert: number
  activeLast7: number
  recent: string[]
}

export interface OwnerOrganizationsPayload {
  organizations: OwnerListOrganization[]
  stats: OwnerListStats
}

export function buildOwnerStats(organizations: OwnerListOrganization[]): OwnerListStats {
  return {
    total: organizations.length,
    free: organizations.filter((org) => org.plan_status === 'free').length,
    trial: organizations.filter((org) => org.plan_status === 'trial').length,
    paid: organizations.filter((org) => org.plan_status === 'active_paid').length,
    blocked: organizations.filter((org) => org.plan_status === 'blocked' || org.access_blocked).length,
    hittingLimits: organizations.filter((org) => org.limit_reached).length,
    likelyToConvert: organizations.filter((org) => org.likely_to_convert).length,
    activeLast7: organizations.filter((org) => org.attempts_7d > 0).length,
    recent: organizations.slice(0, 5).map((org) => org.name),
  }
}

export async function getOwnerOrganizationsPayload(
  service: AppSupabaseClient,
): Promise<OwnerOrganizationsPayload> {
  const [organizationsResult, membersResult, notesResult] = await Promise.all([
    service
      .from('organizations')
      .select(
        'id, name, slug, organization_type, plan_type, plan_status, max_members_allowed, trial_ends_at, access_blocked, billing_notes, created_at',
      )
      .order('created_at', { ascending: false }),
    service.from('organization_members').select('organization_id, status, user_id'),
    service.from('owner_org_notes').select('organization_id, follow_up_status, note'),
  ])

  if (organizationsResult.error) {
    throw organizationsResult.error
  }

  if (membersResult.error) {
    throw membersResult.error
  }

  if (notesResult.error) {
    console.warn('[owner-data] owner_org_notes query failed.', {
      message: notesResult.error.message,
    })
  }

  const organizations = (organizationsResult.data ?? []) as Array<
    Pick<
      TableRow<'organizations'>,
      | 'id'
      | 'name'
      | 'slug'
      | 'organization_type'
      | 'plan_type'
      | 'plan_status'
      | 'max_members_allowed'
      | 'trial_ends_at'
      | 'access_blocked'
      | 'billing_notes'
      | 'created_at'
    >
  >
  const members = (membersResult.data ?? []) as Array<
    Pick<TableRow<'organization_members'>, 'organization_id' | 'status' | 'user_id'>
  >
  const notes = notesResult.error
    ? []
    : ((notesResult.data ?? []) as Array<
        Pick<TableRow<'owner_org_notes'>, 'organization_id' | 'follow_up_status' | 'note'>
      >)

  const userOrganizationMap = new Map<string, string>()
  const memberCounts = new Map<string, { active: number; total: number }>()

  for (const member of members) {
    userOrganizationMap.set(member.user_id, member.organization_id)

    const current = memberCounts.get(member.organization_id) ?? { active: 0, total: 0 }
    current.total += 1
    if (member.status === 'active') {
      current.active += 1
    }
    memberCounts.set(member.organization_id, current)
  }

  const organizationIds = organizations.map((organization) => organization.id)
  const userIds = Array.from(userOrganizationMap.keys())

  const [attemptsResult, invitesResult] = await Promise.all([
    userIds.length
      ? service
          .from('user_attempts')
          .select('created_at, user_id')
          .in('user_id', userIds)
          .gte('created_at', new Date(Date.now() - 30 * 86_400_000).toISOString())
      : Promise.resolve({ data: [], error: null }),
    organizationIds.length
      ? service
          .from('team_invites')
          .select('organization_id, status')
          .in('organization_id', organizationIds)
          .eq('status', 'pending')
      : Promise.resolve({ data: [], error: null }),
  ])

  if (attemptsResult.error) {
    throw attemptsResult.error
  }

  if (invitesResult.error) {
    throw invitesResult.error
  }

  const attempts = (attemptsResult.data ?? []) as Array<
    Pick<TableRow<'user_attempts'>, 'created_at' | 'user_id'>
  >
  const invites = (invitesResult.data ?? []) as Array<
    Pick<TableRow<'team_invites'>, 'organization_id' | 'status'>
  >

  const attemptsByOrganization = new Map<
    string,
    { attempts7: number; attempts30: number; lastActivity: string | null }
  >()

  const now = Date.now()
  const last7 = now - 7 * 86_400_000

  for (const attempt of attempts) {
    const organizationId = userOrganizationMap.get(attempt.user_id)
    if (!organizationId) {
      continue
    }

    const current = attemptsByOrganization.get(organizationId) ?? {
      attempts7: 0,
      attempts30: 0,
      lastActivity: null,
    }
    const timestamp = new Date(attempt.created_at).getTime()

    if (timestamp >= last7) {
      current.attempts7 += 1
    }

    current.attempts30 += 1

    if (!current.lastActivity || new Date(current.lastActivity).getTime() < timestamp) {
      current.lastActivity = attempt.created_at
    }

    attemptsByOrganization.set(organizationId, current)
  }

  const pendingInvites = new Map<string, number>()
  for (const invite of invites) {
    pendingInvites.set(invite.organization_id, (pendingInvites.get(invite.organization_id) ?? 0) + 1)
  }

  const notesByOrganization = new Map<
    string,
    Pick<TableRow<'owner_org_notes'>, 'follow_up_status' | 'note'>
  >()
  for (const note of notes) {
    notesByOrganization.set(note.organization_id, {
      follow_up_status: note.follow_up_status,
      note: note.note,
    })
  }

  const enriched: OwnerListOrganization[] = organizations.map((organization) => {
    const counts = memberCounts.get(organization.id) ?? { active: 0, total: 0 }
    const activity = attemptsByOrganization.get(organization.id) ?? {
      attempts7: 0,
      attempts30: 0,
      lastActivity: null,
    }
    const organizationNotes = notesByOrganization.get(organization.id)
    const maxMembersAllowed = organization.max_members_allowed ?? 1
    const limitReached = maxMembersAllowed > 0 ? counts.active >= maxMembersAllowed : false
    const likelyToConvert =
      (organization.plan_status === 'free' && limitReached) ||
      (organization.plan_status === 'free' && activity.attempts7 >= 5) ||
      (organization.plan_status === 'trial' &&
        organization.trial_ends_at !== null &&
        new Date(organization.trial_ends_at).getTime() < now + 5 * 86_400_000) ||
      organization.plan_status === 'past_due' ||
      (organization.plan_status === 'blocked' && activity.attempts30 > 0)

    return {
      ...organization,
      max_members_allowed: maxMembersAllowed,
      active_members: counts.active,
      total_members: counts.total,
      attempts_7d: activity.attempts7,
      attempts_30d: activity.attempts30,
      last_activity: activity.lastActivity,
      pending_invites: pendingInvites.get(organization.id) ?? 0,
      limit_reached: limitReached,
      likely_to_convert: likelyToConvert,
      follow_up_status: organizationNotes?.follow_up_status ?? 'new',
      owner_note: organizationNotes?.note ?? null,
    }
  })

  return {
    organizations: enriched,
    stats: buildOwnerStats(enriched),
  }
}
