import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import type { TableRow } from '@/lib/database.types'
import { AuthorizationError } from '@/lib/permissions'
import { requireOwnerUser } from '@/lib/owner/auth'
import { getServiceSupabaseClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type OwnerListOrganization = Pick<
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

function buildOwnerStats(organizations: OwnerListOrganization[]) {
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

function isMissingAuthSession(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes('auth session missing')
}

export async function GET() {
  try {
    const { user } = await getAuthenticatedRequestContext()
    const { access } = await requireOwnerUser(user)

    const service = getServiceSupabaseClient()
    const ownerEmail = access.normalizedEmail

    console.info('[owner-list] route hit', {
      email: ownerEmail,
      viaEnv: access.viaEnv,
      viaDatabase: access.viaDatabase,
      hasServiceKey: access.hasServiceRole,
    })

    const [
      organizationsResult,
      membersResult,
      attemptsResult,
      invitesResult,
      notesResult,
    ] = await Promise.all([
      service.from('organizations').select('*').order('created_at', { ascending: false }),
      service.from('organization_members').select('organization_id, status, user_id'),
      service
        .from('user_attempts')
        .select('created_at, user_id')
        .gte('created_at', new Date(Date.now() - 30 * 86_400_000).toISOString()),
      service.from('team_invites').select('organization_id, status').eq('status', 'pending'),
      service.from('owner_org_notes').select('*'),
    ])

    if (organizationsResult.error) {
      throw organizationsResult.error
    }

    if (membersResult.error) {
      throw membersResult.error
    }

    if (attemptsResult.error) {
      throw attemptsResult.error
    }

    if (invitesResult.error) {
      throw invitesResult.error
    }

    if (notesResult.error) {
      console.warn('[owner-list] owner_org_notes query failed.', {
        email: ownerEmail,
        message: notesResult.error.message,
      })
    }

    const organizations = (organizationsResult.data ?? []) as TableRow<'organizations'>[]
    const members = (membersResult.data ?? []) as Array<
      Pick<TableRow<'organization_members'>, 'organization_id' | 'status' | 'user_id'>
    >
    const attempts = (attemptsResult.data ?? []) as Array<
      Pick<TableRow<'user_attempts'>, 'created_at' | 'user_id'>
    >
    const invites = (invitesResult.data ?? []) as Array<
      Pick<TableRow<'team_invites'>, 'organization_id' | 'status'>
    >
    const notes = notesResult.error ? [] : ((notesResult.data ?? []) as TableRow<'owner_org_notes'>[])

    const memberCounts = new Map<string, { active: number; total: number }>()
    const userOrganizationMap = new Map<string, string>()

    for (const member of members) {
      userOrganizationMap.set(member.user_id, member.organization_id)

      const current = memberCounts.get(member.organization_id) ?? { active: 0, total: 0 }
      current.total += 1
      if (member.status === 'active') {
        current.active += 1
      }
      memberCounts.set(member.organization_id, current)
    }

    const attemptsByOrganization = new Map<
      string,
      { attempts7: number; attempts30: number; lastActivity: string | null }
    >()

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

      if (timestamp >= Date.now() - 7 * 86_400_000) {
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
          new Date(organization.trial_ends_at).getTime() < Date.now() + 5 * 86_400_000) ||
        organization.plan_status === 'past_due' ||
        (organization.plan_status === 'blocked' && activity.attempts30 > 0)

      return {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        organization_type: organization.organization_type,
        plan_type: organization.plan_type,
        plan_status: organization.plan_status,
        max_members_allowed: maxMembersAllowed,
        trial_ends_at: organization.trial_ends_at,
        access_blocked: organization.access_blocked,
        billing_notes: organization.billing_notes,
        created_at: organization.created_at,
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

    const stats = buildOwnerStats(enriched)

    console.info('[owner-list] response ready', {
      email: ownerEmail,
      organizations: enriched.length,
      recent: stats.recent,
    })

    return NextResponse.json({
      organizations: enriched,
      stats,
    })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, error.statusCode)
    }

    if (isMissingAuthSession(error)) {
      return jsonError('Authentication is required.', 401, error)
    }

    const message = error instanceof Error ? error.message : 'Unable to load organizations.'
    console.error('[owner-list] failed', message, error)
    return jsonError(message, 400, error)
  }
}
