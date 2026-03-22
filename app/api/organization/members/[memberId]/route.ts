import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { requireOrganizationAdmin, AuthorizationError } from '@/lib/permissions'
import {
  OrganizationServiceError,
  removeOrganizationMember,
  updateOrganizationMemberStatus,
  updateOrganizationMemberRole,
} from '@/lib/organizations/service'
import {
  organizationMemberParamsSchema,
  updateOrganizationMemberSchema,
} from '@/lib/validators/organizations'

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      memberId: string
    }>
  },
) {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext()

    if (!user) {
      return jsonError('Unauthorized', 401)
    }

    await requireOrganizationAdmin(supabase, user.id)

    const params = organizationMemberParamsSchema.parse(await context.params)
    const body = updateOrganizationMemberSchema.parse(await request.json())
    const result = body.role
      ? await updateOrganizationMemberRole(supabase, {
          memberId: params.memberId,
          role: body.role,
        })
      : await updateOrganizationMemberStatus(supabase, {
          memberId: params.memberId,
          status: body.status!,
        })

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

    return jsonError('Unable to update the member.', 400, error)
  }
}

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{
      memberId: string
    }>
  },
) {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext()

    if (!user) {
      return jsonError('Unauthorized', 401)
    }

    await requireOrganizationAdmin(supabase, user.id)

    const params = organizationMemberParamsSchema.parse(await context.params)
    const result = await removeOrganizationMember(supabase, params.memberId)

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

    return jsonError('Unable to remove the member.', 400, error)
  }
}
