import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { AuthorizationError } from '@/lib/permissions'
import { requireOwnerUser } from '@/lib/owner/auth'
import { getServiceSupabaseClient } from '@/lib/supabase/service'

export async function GET() {
  try {
    const { user } = await getAuthenticatedRequestContext()

    requireOwnerUser(user)

    const service = getServiceSupabaseClient()
    const { data: organizations, error } = await service
      .from('organizations')
      .select(
        'id, name, slug, organization_type, plan_type, plan_status, max_members_allowed, trial_ends_at, access_blocked, billing_notes, created_at',
      )
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    const { data: members, error: memberError } = await service
      .from('organization_members')
      .select('organization_id, status')

    if (memberError) {
      throw memberError
    }

    const memberCounts = new Map<
      string,
      {
        active: number
        total: number
      }
    >()

    ;(members ?? []).forEach((member) => {
      const key = (member as { organization_id: string }).organization_id
      const status = (member as { status: string }).status
      const record = memberCounts.get(key) ?? { active: 0, total: 0 }
      record.total += 1
      if (status === 'active') {
        record.active += 1
      }
      memberCounts.set(key, record)
    })

    const enriched = (organizations ?? []).map((org) => {
      const counts = memberCounts.get(org.id) ?? { active: 0, total: 0 }
      return {
        ...org,
        active_members: counts.active,
        total_members: counts.total,
        limit_reached:
          (org.max_members_allowed ?? 1) > 0
            ? counts.active >= (org.max_members_allowed ?? 1)
            : false,
      }
    })

    const stats = {
      total: enriched.length,
      free: enriched.filter((org) => org.plan_status === 'free').length,
      trial: enriched.filter((org) => org.plan_status === 'trial').length,
      paid: enriched.filter((org) => org.plan_status === 'active_paid').length,
      blocked: enriched.filter((org) => org.plan_status === 'blocked' || org.access_blocked).length,
      hittingLimits: enriched.filter((org) => org.limit_reached).length,
      recent: enriched.slice(0, 5).map((org) => org.name),
    }

    return NextResponse.json({
      organizations: enriched,
      stats,
    })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, error.statusCode)
    }

    return jsonError('Unable to load organizations.', 400, error)
  }
}
