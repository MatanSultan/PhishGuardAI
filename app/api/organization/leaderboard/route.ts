import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { getOrganizationLeaderboard } from '@/lib/company-analytics/service'
import { requireOrganizationAdmin, AuthorizationError } from '@/lib/permissions'
import { leaderboardQuerySchema } from '@/lib/validators/organizations'

export async function GET(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext()

    if (!user) {
      return jsonError('Unauthorized', 401)
    }

    const context = await requireOrganizationAdmin(supabase, user.id)
    const { searchParams } = new URL(request.url)
    const pagination = leaderboardQuerySchema.parse({
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    })
    const payload = await getOrganizationLeaderboard(supabase, context, pagination)

    return NextResponse.json(payload)
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, error.statusCode)
    }

    return jsonError('Unable to load the leaderboard.', 400, error)
  }
}
