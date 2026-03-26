import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { getAdminOverviewPayload } from '@/lib/admin/service'
import { AuthorizationError } from '@/lib/permissions'
import { getSupabaseEnvDiagnostics } from '@/lib/supabase/diagnostics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isMissingAuthSession(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes('auth session missing')
}

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext()
    const diagnostics = getSupabaseEnvDiagnostics()

    if (!user) {
      return jsonError('Unauthorized', 401)
    }

    console.info('[admin-overview] route hit', {
      supabaseProjectRef: diagnostics.urlProjectRef,
      anonKeyRole: diagnostics.anonKeyRole,
      nodeEnv: diagnostics.nodeEnv,
    })

    const payload = await getAdminOverviewPayload(supabase, user.id)

    return NextResponse.json(payload)
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, error.statusCode)
    }

    if (isMissingAuthSession(error)) {
      return jsonError('Authentication is required.', 401, error)
    }

    return jsonError('Unable to load the admin overview.', 400, error)
  }
}
