import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { updatePreferredDomains } from '@/lib/profile/service'
import { normalizePreferredDomains } from '@/lib/training/domains'
import { updatePreferredDomainsSchema } from '@/lib/validators/profile'

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext()

    if (!user) {
      return jsonError('Unauthorized', 401)
    }

    const body = updatePreferredDomainsSchema.parse(await request.json())
    const domains = normalizePreferredDomains(body.domains)
    const trainingProfile = await updatePreferredDomains(supabase, user.id, domains)

    return NextResponse.json({
      ok: true,
      preferredDomains: trainingProfile.preferred_domains,
    })
  } catch (error) {
    return jsonError('Unable to update preferred domains.', 400, error)
  }
}
