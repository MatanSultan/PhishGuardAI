import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import {
  getCurrentOrganizationContext,
  createOrganization,
  OrganizationServiceError,
} from '@/lib/organizations/service'
import { getSupabaseEnvDiagnostics } from '@/lib/supabase/diagnostics'
import { createOrganizationSchema } from '@/lib/validators/organizations'

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext()

    if (!user) {
      return jsonError('Unauthorized', 401)
    }

    const context = await getCurrentOrganizationContext(supabase, user.id)

    return NextResponse.json({
      organization: context?.organization ?? null,
      membership: context?.membership ?? null,
      settings: context?.settings ?? null,
    })
  } catch (error) {
    return jsonError('Unable to load the current organization.', 400, error)
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext()

    if (!user) {
      return jsonError('Unauthorized', 401)
    }

    const body = createOrganizationSchema.parse(await request.json())
    const context = await createOrganization(supabase, user.id, body)
    const diagnostics = getSupabaseEnvDiagnostics()

    console.info('[organization-create] created', {
      organizationId: context.organization.id,
      organizationName: context.organization.name,
      organizationSlug: context.organization.slug,
      createdBy: user.email ?? user.id,
      supabaseProjectRef: diagnostics.urlProjectRef,
      anonKeyKind: diagnostics.anonKeyKind,
      nodeEnv: diagnostics.nodeEnv,
    })

    return NextResponse.json({
      organization: context.organization,
      membership: context.membership,
      settings: context.settings,
    })
  } catch (error) {
    if (error instanceof OrganizationServiceError) {
      return jsonError(error.message, error.statusCode)
    }

    return jsonError('Unable to create the organization.', 400, error)
  }
}
