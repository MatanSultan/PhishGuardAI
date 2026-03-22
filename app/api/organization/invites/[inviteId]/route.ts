import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { requireOrganizationAdmin, AuthorizationError } from '@/lib/permissions'
import {
  cancelOrganizationInvite,
  OrganizationServiceError,
} from '@/lib/organizations/service'
import { organizationInviteParamsSchema } from '@/lib/validators/organizations'

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{
      inviteId: string
    }>
  },
) {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext()

    if (!user) {
      return jsonError('Unauthorized', 401)
    }

    await requireOrganizationAdmin(supabase, user.id)

    const params = organizationInviteParamsSchema.parse(await context.params)
    const result = await cancelOrganizationInvite(supabase, params.inviteId)

    return NextResponse.json({
      result,
    })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, error.statusCode)
    }

    if (error instanceof OrganizationServiceError) {
      return jsonError(error.message, error.statusCode)
    }

    return jsonError('Unable to cancel the invite.', 400, error)
  }
}
