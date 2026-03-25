import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { extractOrganizationSignupDraft } from '@/lib/organizations/signup-draft'
import { getCurrentOrganizationContext } from '@/lib/organizations/service'
import { getProfileBundle } from '@/lib/profile/service'

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext()

    if (!user) {
      return jsonError('Unauthorized', 401)
    }

    const [profile, organizationContext] = await Promise.all([
      getProfileBundle(supabase, user.id),
      getCurrentOrganizationContext(supabase, user.id),
    ])

    return NextResponse.json({
      ...profile,
      organization: organizationContext?.organization ?? null,
      signupDraft: organizationContext ? null : extractOrganizationSignupDraft(user.user_metadata),
    })
  } catch (error) {
    return jsonError('Unable to load the current profile.', 400, error)
  }
}
