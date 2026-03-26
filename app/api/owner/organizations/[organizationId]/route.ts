import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { AuthorizationError } from '@/lib/permissions'
import { requireOwnerUser } from '@/lib/owner/auth'
import { PLAN_STATUSES, PLAN_TYPES } from '@/lib/constants'
import { getSupabaseEnvDiagnostics } from '@/lib/supabase/diagnostics'
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

function isMissingAuthSession(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes('auth session missing')
}

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

    const { access } = await requireOwnerUser(user)

    const service = getServiceSupabaseClient()
    const body = updateSchema.parse(await request.json())
    const diagnostics = getSupabaseEnvDiagnostics()

    console.info('[owner-update] request', {
      organizationId: params.organizationId,
      email: access.normalizedEmail,
      viaEnv: access.viaEnv,
      viaDatabase: access.viaDatabase,
      payloadKeys: Object.keys(body),
      supabaseProjectRef: diagnostics.urlProjectRef,
      serviceKeyRole: diagnostics.serviceKeyRole,
      nodeEnv: diagnostics.nodeEnv,
    })

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

    console.info('[owner-update] success', {
      organizationId: params.organizationId,
      email: access.normalizedEmail,
      updated: Array.isArray(data) ? data.length : Number(Boolean(data)),
    })

    return NextResponse.json({
      organization: Array.isArray(data) ? data[0] : data,
    })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, error.statusCode)
    }

    if (isMissingAuthSession(error)) {
      return jsonError('Authentication is required.', 401, error)
    }

    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? 'Invalid organization update payload.', 400, error)
    }

    const message = error instanceof Error ? error.message : 'Unable to update organization.'
    console.error('[owner-update]', message, error)
    return jsonError(message, 400, error)
  }
}
