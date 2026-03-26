import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { AuthorizationError } from '@/lib/permissions'
import { requireOwnerUser } from '@/lib/owner/auth'
import { getServiceSupabaseClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { user } = await getAuthenticatedRequestContext()

    requireOwnerUser(user)

    const service = getServiceSupabaseClient()
    const ownerEmail = user?.email?.toLowerCase() ?? ''

    // Ensure owner is whitelisted (best-effort)
    if (ownerEmail) {
      await service.from('platform_owners').upsert({ email: ownerEmail })
    }

    // Direct, non-RPC listing to avoid auth-context edge cases
    const { data: organizations, error: orgError } = await service
      .from('organizations')
      .select(
        'id, name, slug, organization_type, plan_type, plan_status, max_members_allowed, trial_ends_at, access_blocked, billing_notes, created_at',
      )
      .order('created_at', { ascending: false })

    if (orgError) {
      throw orgError
    }

    let orgRows = organizations ?? []

    // Fallback: if nothing returned (unexpected), try RPC to detect policy/env issues
    if (orgRows.length === 0) {
      const { data: rpcData, error: rpcError } = await service.rpc('owner_list_organizations')
      if (rpcError) {
        console.error('[owner-list][rpc]', rpcError)
      } else if (rpcData && rpcData.length > 0) {
        console.warn('[owner-list] primary query empty, RPC returned rows — using RPC result')
        orgRows = rpcData as typeof orgRows
      }
    }

    // Members
    const { data: members } = await service
      .from('organization_members')
      .select('organization_id, status, user_id')

    // Attempts for activity windows
    const { data: attempts } = await service
      .from('user_attempts')
      .select('created_at, user_id')
      .gte('created_at', new Date(Date.now() - 30 * 86_400_000).toISOString())

    // Map user -> org
    const userOrgMap = new Map<string, string>()
    ;(members ?? []).forEach((m) => {
      userOrgMap.set((m as any).user_id, (m as any).organization_id)
    })

    const attemptsByOrg = new Map<
      string,
      { attempts7: number; attempts30: number; lastActivity: string | null }
    >()
    ;(attempts ?? []).forEach((att) => {
      const orgId = userOrgMap.get((att as any).user_id)
      if (!orgId) return
      const entry = attemptsByOrg.get(orgId) ?? { attempts7: 0, attempts30: 0, lastActivity: null }
      const ts = (att as any).created_at as string
      const t = new Date(ts).getTime()
      if (t >= Date.now() - 7 * 86_400_000) entry.attempts7 += 1
      entry.attempts30 += 1
      entry.lastActivity = entry.lastActivity && new Date(entry.lastActivity).getTime() > t ? entry.lastActivity : ts
      attemptsByOrg.set(orgId, entry)
    })

    // Pending invites
    const { data: invites } = await service
      .from('team_invites')
      .select('organization_id, status')
      .eq('status', 'pending')

    const pendingInvites = new Map<string, number>()
    ;(invites ?? []).forEach((inv) => {
      const orgId = (inv as any).organization_id
      pendingInvites.set(orgId, (pendingInvites.get(orgId) ?? 0) + 1)
    })

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

    const enriched = orgRows.map((org) => {
      const counts = memberCounts.get(org.id) ?? { active: 0, total: 0 }
      const activity = attemptsByOrg.get(org.id) ?? { attempts7: 0, attempts30: 0, lastActivity: null }
      const limitReached =
        (org.max_members_allowed ?? 1) > 0 ? counts.active >= (org.max_members_allowed ?? 1) : false
      const likelyToConvert =
        (org.plan_status === 'free' && limitReached) ||
        (org.plan_status === 'free' && activity.attempts7 >= 5) ||
        (org.plan_status === 'trial' &&
          org.trial_ends_at &&
          new Date(org.trial_ends_at).getTime() < Date.now() + 5 * 86_400_000) ||
        org.plan_status === 'past_due' ||
        (org.plan_status === 'blocked' && activity.attempts30 > 0)

      return {
        ...org,
        active_members: counts.active,
        total_members: counts.total,
        attempts_7d: activity.attempts7,
        attempts_30d: activity.attempts30,
        last_activity: activity.lastActivity,
        pending_invites: pendingInvites.get(org.id) ?? 0,
        limit_reached: limitReached,
        likely_to_convert: likelyToConvert,
      }
    })

    const stats = {
      total: enriched.length,
      free: enriched.filter((org) => org.plan_status === 'free').length,
      trial: enriched.filter((org) => org.plan_status === 'trial').length,
      paid: enriched.filter((org) => org.plan_status === 'active_paid').length,
      blocked: enriched.filter((org) => org.plan_status === 'blocked' || org.access_blocked).length,
      hittingLimits: enriched.filter((org) => org.limit_reached).length,
      likelyToConvert: enriched.filter((org) => org.likely_to_convert).length,
      activeLast7: enriched.filter((org) => (org.attempts_7d ?? 0) > 0).length,
      recent: enriched.slice(0, 5).map((org) => org.name),
    }

    console.info('[owner-list]', {
      user: ownerEmail,
      hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      orgCount: enriched.length,
      stats,
    })

    return NextResponse.json({
      organizations: enriched,
      stats,
    })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, error.statusCode)
    }

    const message = error instanceof Error ? error.message : 'Unable to load organizations.'
    console.error('[owner-list]', message, error)
    return jsonError(message, 400, error)
  }
}
