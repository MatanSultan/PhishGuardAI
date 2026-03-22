import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { requireOrganizationAdmin, AuthorizationError } from '@/lib/permissions'
import { listOrganizationMembers } from '@/lib/organizations/service'

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext()

    if (!user) {
      return jsonError('Unauthorized', 401)
    }

    const context = await requireOrganizationAdmin(supabase, user.id)
    const members = await listOrganizationMembers(supabase, context.organization.id)

    return NextResponse.json({
      organization: context.organization,
      members,
    })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, error.statusCode)
    }

    return jsonError('Unable to load organization members.', 400, error)
  }
}
