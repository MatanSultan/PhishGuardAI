import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { getProfileBundle } from '@/lib/profile/service'

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext()

    if (!user) {
      return jsonError('Unauthorized', 401)
    }

    const profile = await getProfileBundle(supabase, user.id)
    return NextResponse.json(profile)
  } catch (error) {
    return jsonError('Unable to load the current profile.', 400, error)
  }
}
