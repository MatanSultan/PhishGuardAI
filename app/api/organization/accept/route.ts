import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import {
  acceptOrganizationInvite,
  OrganizationServiceError,
} from '@/lib/organizations/service'
import { acceptInviteSchema } from '@/lib/validators/organizations'

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext()

    if (!user) {
      return jsonError('Unauthorized', 401)
    }

    const body = acceptInviteSchema.parse(await request.json())
    const context = await acceptOrganizationInvite(supabase, user.id, user.email ?? null, body.token)

    return NextResponse.json({
      organization: context.organization,
      membership: context.membership,
      settings: context.settings,
    })
  } catch (error) {
    if (error instanceof OrganizationServiceError) {
      return jsonError(error.message, error.statusCode)
    }

    return jsonError('Unable to accept the invite.', 400, error)
  }
}
