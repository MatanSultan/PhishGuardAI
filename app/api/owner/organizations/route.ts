import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { AuthorizationError } from '@/lib/permissions'
import { requireOwnerUser } from '@/lib/owner/auth'
import { getOwnerOrganizationsPayload } from '@/lib/owner/service'
import { getSupabaseEnvDiagnostics } from '@/lib/supabase/diagnostics'
import { getServiceSupabaseClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isMissingAuthSession(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes('auth session missing')
}

export async function GET() {
  try {
    const { user } = await getAuthenticatedRequestContext()
    const { access } = await requireOwnerUser(user)

    const service = getServiceSupabaseClient()
    const ownerEmail = access.normalizedEmail
    const diagnostics = getSupabaseEnvDiagnostics()

    console.info('[owner-list] route hit', {
      email: ownerEmail,
      viaEnv: access.viaEnv,
      viaDatabase: access.viaDatabase,
      hasServiceKey: access.hasServiceRole,
      supabaseProjectRef: diagnostics.urlProjectRef,
      serviceKeyRole: diagnostics.serviceKeyRole,
      nodeEnv: diagnostics.nodeEnv,
    })

    const payload = await getOwnerOrganizationsPayload(service)

    console.info('[owner-list] response ready', {
      email: ownerEmail,
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
