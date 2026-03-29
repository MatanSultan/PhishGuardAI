import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { AuthorizationError } from '@/lib/permissions'
import { requireOwnerUser } from '@/lib/owner/auth'
import type { OwnerOrganizationsPayload } from '@/lib/owner/service'
import { getOwnerOrganizationsPayload, getOwnerOrganizationsPayloadViaRpc } from '@/lib/owner/service'
import { getSupabaseEnvDiagnostics } from '@/lib/supabase/diagnostics'
import { getServiceSupabaseClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isMissingAuthSession(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes('auth session missing')
}

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext()
    const { access } = await requireOwnerUser(user)

    const ownerEmail = access.normalizedEmail
    const diagnostics = getSupabaseEnvDiagnostics()

    console.info('[owner-list] route hit', {
      email: ownerEmail,
      viaEnv: access.viaEnv,
      viaDatabase: access.viaDatabase,
      hasServiceKey: access.hasServiceRole,
      supabaseProjectRef: diagnostics.urlProjectRef,
      serviceKeyKind: diagnostics.serviceKeyKind,
      serviceKeyRole: diagnostics.serviceKeyRole,
      nodeEnv: diagnostics.nodeEnv,
    })

    let payload: OwnerOrganizationsPayload
    let source: 'rpc' | 'service_query' = 'rpc'
    const canUseServiceFallback = access.viaEnv && !access.viaDatabase

    try {
      payload = await getOwnerOrganizationsPayloadViaRpc(supabase)
    } catch (rpcError) {
      if (!canUseServiceFallback) {
        throw rpcError
      }

      const service = getServiceSupabaseClient()
      payload = await getOwnerOrganizationsPayload(service)
      source = 'service_query'

      console.warn('[owner-list] Falling back to service query after RPC failure.', {
        email: ownerEmail,
        message: rpcError instanceof Error ? rpcError.message : 'Unknown RPC error',
      })
    }

    console.info('[owner-list] response ready', {
      email: ownerEmail,
      source,
      organizations: payload.organizations.length,
      recent: payload.stats.recent,
    })

    return NextResponse.json(payload)
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
