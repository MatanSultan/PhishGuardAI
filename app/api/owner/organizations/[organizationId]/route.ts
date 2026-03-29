import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { AuthorizationError } from '@/lib/permissions'
import { requireOwnerUser } from '@/lib/owner/auth'
import type { OwnerListOrganization } from '@/lib/owner/service'
import { updateOwnerOrganizationViaRpc } from '@/lib/owner/service'
import { PLAN_STATUSES, PLAN_TYPES } from '@/lib/constants'
import { assertServiceRoleConfiguration, getSupabaseEnvDiagnostics } from '@/lib/supabase/diagnostics'
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

function getErrorInfo(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      code: null as string | null,
      details: null as string | null,
      hint: null as string | null,
    }
  }

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>
    return {
      message: typeof record.message === 'string' ? record.message : null,
      name: typeof record.name === 'string' ? record.name : null,
      code: typeof record.code === 'string' ? record.code : null,
      details: typeof record.details === 'string' ? record.details : null,
      hint: typeof record.hint === 'string' ? record.hint : null,
    }
  }

  return {
    message: null,
    name: null,
    code: null,
    details: null,
    hint: null,
  }
}

function buildSafeErrorMessage(error: unknown, fallback: string) {
  const info = getErrorInfo(error)
  const parts = [info.message, info.details, info.hint].filter(
    (value): value is string => Boolean(value && value.trim()),
  )

  if (!parts.length) {
    return fallback
  }

  return parts.join(' ')
}

function getErrorStatus(error: unknown) {
  const info = getErrorInfo(error)
  const message = info.message?.toLowerCase() ?? ''

  if (info.code === '42501' || message.includes('owner access required')) {
    return 403
  }

  if (info.code === '23505') {
    return 409
  }

  if (info.code === '23503' || info.code === '23514' || info.code === '22P02' || info.code === '22007') {
    return 400
  }

  if (message.includes('not found')) {
    return 404
  }

  return 400
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      organizationId: string
    }>
  },
) {
  let organizationIdForLog = 'unknown'

  try {
    const { supabase, user } = await getAuthenticatedRequestContext()
    const params = await context.params
    organizationIdForLog = params.organizationId

    const { access } = await requireOwnerUser(user)

    const body = updateSchema.parse(await request.json())
    const diagnostics = getSupabaseEnvDiagnostics()
    let serviceRoleValidationPassed = false
    let serviceRoleValidationError: string | null = null

    try {
      assertServiceRoleConfiguration()
      serviceRoleValidationPassed = true
    } catch (validationError) {
      serviceRoleValidationError = buildSafeErrorMessage(
        validationError,
        'Service-role validation failed.',
      )
    }

    console.info('[owner-update] request', {
      organizationId: params.organizationId,
      email: access.normalizedEmail,
      ownerAccessPassed: true,
      viaEnv: access.viaEnv,
      viaDatabase: access.viaDatabase,
      payload: body,
      supabaseProjectRef: diagnostics.urlProjectRef,
      serviceKeyKind: diagnostics.serviceKeyKind,
      serviceKeyRole: diagnostics.serviceKeyRole,
      serviceRoleValidationPassed,
      serviceRoleValidationError,
      nodeEnv: diagnostics.nodeEnv,
    })

    const rpcArgs = {
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
    }

    let updated: OwnerListOrganization | null = null
    let source: 'rpc' | 'service_rpc' = 'rpc'
    const canUseServiceFallback = access.viaEnv && !access.viaDatabase

    try {
      updated = await updateOwnerOrganizationViaRpc(supabase, rpcArgs)
    } catch (rpcError) {
      console.warn('[owner-update] Authenticated RPC failed.', {
        organizationId: params.organizationId,
        email: access.normalizedEmail,
        source: 'rpc',
        error: getErrorInfo(rpcError),
      })

      if (!canUseServiceFallback) {
        throw rpcError
      }

      try {
        const service = getServiceSupabaseClient()
        updated = await updateOwnerOrganizationViaRpc(service, rpcArgs)
        source = 'service_rpc'

        console.warn('[owner-update] Falling back to service RPC after authenticated RPC failure.', {
          organizationId: params.organizationId,
          email: access.normalizedEmail,
          error: getErrorInfo(rpcError),
        })
      } catch (serviceRpcError) {
        console.error('[owner-update] Service RPC fallback failed.', {
          organizationId: params.organizationId,
          email: access.normalizedEmail,
          source: 'service_rpc',
          error: getErrorInfo(serviceRpcError),
        })

        throw serviceRpcError
      }
    }

    console.info('[owner-update] success', {
      organizationId: params.organizationId,
      email: access.normalizedEmail,
      source,
      updated: Number(Boolean(updated)),
      responseKeys: updated ? Object.keys(updated) : [],
    })

    return NextResponse.json({
      organization: updated,
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

    const message = buildSafeErrorMessage(error, 'Unable to update organization.')
    const status = getErrorStatus(error)

    console.error('[owner-update] failed', {
      organizationId: organizationIdForLog,
      message,
      status,
      error: getErrorInfo(error),
    })

    return jsonError(message, status, error)
  }
}
