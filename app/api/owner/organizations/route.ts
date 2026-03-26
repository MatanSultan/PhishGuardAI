import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { AuthorizationError } from '@/lib/permissions'
import { requireOwnerUser } from '@/lib/owner/auth'
import { getServiceSupabaseClient } from '@/lib/supabase/service'

export async function GET() {
  try {
    const { user, supabase } = await getAuthenticatedRequestContext()

    requireOwnerUser(user)

    // Ensure caller exists in platform_owners allowlist (service role bypasses RLS)
    if (user?.email) {
      const service = getServiceSupabaseClient()
      await service.from('platform_owners').upsert({ email: user.email.toLowerCase() })
    }

    // @ts-expect-error custom RPC not in generated types
    const { data: enriched, error } = await supabase.rpc('owner_list_organizations')

    if (error) {
      throw error
    }

    type OwnerOrgRow = {
      plan_status: string
      access_blocked: boolean
      limit_reached?: boolean
      attempts_7d?: number
      likely_to_convert?: boolean
      name: string
    }

    const orgs = (enriched ?? []) as unknown as OwnerOrgRow[]

    const stats = {
      total: orgs.length,
      free: orgs.filter((org) => org.plan_status === 'free').length,
      trial: orgs.filter((org) => org.plan_status === 'trial').length,
      paid: orgs.filter((org) => org.plan_status === 'active_paid').length,
      blocked: orgs.filter((org) => org.plan_status === 'blocked' || org.access_blocked).length,
      hittingLimits: orgs.filter((org) => org.limit_reached).length,
      likelyToConvert: orgs.filter((org) => org.likely_to_convert).length,
      activeLast7: orgs.filter((org) => (org.attempts_7d ?? 0) > 0).length,
      recent: orgs.slice(0, 5).map((org) => org.name),
    }

    return NextResponse.json({
      organizations: orgs,
      stats,
    })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, error.statusCode)
    }

    return jsonError('Unable to load organizations.', 400, error)
  }
}
