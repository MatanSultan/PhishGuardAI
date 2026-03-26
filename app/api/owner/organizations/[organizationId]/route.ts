import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { AuthorizationError } from '@/lib/permissions'
import { requireOwnerUser } from '@/lib/owner/auth'
import { getServiceSupabaseClient } from '@/lib/supabase/service'
import { PLAN_STATUSES, PLAN_TYPES } from '@/lib/constants'

const updateSchema = z.object({
  plan_status: z.enum(PLAN_STATUSES).optional(),
  plan_type: z.enum(PLAN_TYPES).optional(),
  max_members_allowed: z.number().int().min(1).optional(),
  trial_ends_at: z.string().datetime().optional().or(z.literal(null)),
  access_blocked: z.boolean().optional(),
  billing_notes: z.string().max(500).optional(),
})

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      organizationId: string
    }>
  },
) {
  try {
    const { user } = await getAuthenticatedRequestContext()
    const params = await context.params

    requireOwnerUser(user)

    const service = getServiceSupabaseClient()
    const body = updateSchema.parse(await request.json())

    const { data, error } = await service
      .from('organizations')
      .update(body)
      .eq('id', params.organizationId)
      .select(
        'id, name, slug, organization_type, plan_type, plan_status, max_members_allowed, trial_ends_at, access_blocked, billing_notes, created_at',
      )
      .single()

    if (error) {
      throw error
    }

    const { count: activeMembers } = await service
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', params.organizationId)
      .eq('status', 'active')

    const { count: totalMembers } = await service
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', params.organizationId)

    return NextResponse.json({
      organization: {
        ...data,
        active_members: activeMembers ?? 0,
        total_members: totalMembers ?? 0,
      },
    })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, error.statusCode)
    }

    return jsonError('Unable to update organization.', 400, error)
  }
}
