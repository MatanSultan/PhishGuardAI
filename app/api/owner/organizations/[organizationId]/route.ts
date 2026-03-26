import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { AuthorizationError } from '@/lib/permissions'
import { requireOwnerUser } from '@/lib/owner/auth'
import { PLAN_STATUSES, PLAN_TYPES } from '@/lib/constants'
import { getServiceSupabaseClient } from '@/lib/supabase/service'

const updateSchema = z.object({
  plan_status: z.enum(PLAN_STATUSES).optional(),
  plan_type: z.enum(PLAN_TYPES).optional(),
  max_members_allowed: z.number().int().min(1).optional(),
  trial_ends_at: z.string().datetime().optional().or(z.literal(null)),
  access_blocked: z.boolean().optional(),
  billing_notes: z.string().max(500).optional(),
  follow_up_status: z.enum(['new', 'contacted', 'offered_discount', 'upgraded']).optional(),
  owner_note: z.string().max(1000).optional(),
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
    if (user?.email) {
      await service.from('platform_owners').upsert({ email: user.email.toLowerCase() })
    }

    const body = updateSchema.parse(await request.json())

    const { data, error } = await service.rpc('owner_update_org_plan', {
      org_id: params.organizationId,
      next_plan_status: body.plan_status ?? null,
      next_plan_type: body.plan_type ?? null,
      next_max_members: body.max_members_allowed ?? null,
      next_trial_ends_at: body.trial_ends_at ?? null,
      next_access_blocked: body.access_blocked ?? null,
      next_billing_notes: body.billing_notes ?? null,
      next_follow_up_status: body.follow_up_status ?? null,
      next_owner_note: body.owner_note ?? null,
      actor_id: user?.id ?? null,
    })

    if (error) {
      throw error
    }

    return NextResponse.json({
      organization: Array.isArray(data) ? data[0] : data,
    })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, error.statusCode)
    }

    const message = error instanceof Error ? error.message : 'Unable to update organization.'
    console.error('[owner-update]', message, error)
    return jsonError(message, 400, error)
  }
}
