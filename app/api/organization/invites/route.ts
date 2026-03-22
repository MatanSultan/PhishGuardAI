import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { requireOrganizationAdmin, AuthorizationError } from '@/lib/permissions'
import {
  inviteOrganizationMember,
  listTeamInvites,
  OrganizationServiceError,
} from '@/lib/organizations/service'
import { inviteMemberSchema } from '@/lib/validators/organizations'

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext()

    if (!user) {
      return jsonError('Unauthorized', 401)
    }

    const context = await requireOrganizationAdmin(supabase, user.id)
    const invites = await listTeamInvites(supabase, context.organization.id)

    return NextResponse.json({
      organization: context.organization,
      invites,
    })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, error.statusCode)
    }

    return jsonError('Unable to load team invites.', 400, error)
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext()

    if (!user) {
      return jsonError('Unauthorized', 401)
    }

    const context = await requireOrganizationAdmin(supabase, user.id)
    const body = inviteMemberSchema.parse(await request.json())
    const result = await inviteOrganizationMember(supabase, {
      organizationId: context.organization.id,
      invitedBy: user.id,
      email: body.email,
      role: body.role,
      expiresInDays: body.expiresInDays,
    })

    return NextResponse.json({
      invite: result.invite,
      inviteUrl: result.inviteUrl,
      isExisting: result.isExisting,
    })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, error.statusCode)
    }

    if (error instanceof OrganizationServiceError) {
      return jsonError(error.message, error.statusCode)
    }

    return jsonError('Unable to create the invite.', 400, error)
  }
}
