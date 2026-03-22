import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { getOrganizationReportsData } from '@/lib/company-analytics/service'
import { requireOrganizationAdmin, AuthorizationError } from '@/lib/permissions'
import { organizationReportsQuerySchema } from '@/lib/validators/organizations'

export async function GET(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext()

    if (!user) {
      return jsonError('Unauthorized', 401)
    }

    const context = await requireOrganizationAdmin(supabase, user.id)
    const { searchParams } = new URL(request.url)
    const filters = organizationReportsQuerySchema.parse({
      category: searchParams.get('category') ?? undefined,
      channel: searchParams.get('channel') ?? undefined,
      employeeId: searchParams.get('employeeId') ?? undefined,
      dateFrom: searchParams.get('dateFrom') ?? undefined,
      dateTo: searchParams.get('dateTo') ?? undefined,
    })
    const payload = await getOrganizationReportsData(supabase, context, filters)

    return NextResponse.json(payload)
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, error.statusCode)
    }

    return jsonError('Unable to load team reports.', 400, error)
  }
}
