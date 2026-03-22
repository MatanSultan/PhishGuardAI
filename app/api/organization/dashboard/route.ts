import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { getOrganizationDashboardData } from '@/lib/company-analytics/service'
import { requireOrganizationAdmin, AuthorizationError } from '@/lib/permissions'

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext()

    if (!user) {
      return jsonError('Unauthorized', 401)
    }

    const context = await requireOrganizationAdmin(supabase, user.id)
    const payload = await getOrganizationDashboardData(supabase, context)

    return NextResponse.json(payload)
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, error.statusCode)
    }

    return jsonError('Unable to load the organization dashboard.', 400, error)
  }
}
