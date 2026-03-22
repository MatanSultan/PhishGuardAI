import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { formatTrainingContext, getTrainingContext } from '@/lib/memory/service'
import { getProfileBundle } from '@/lib/profile/service'

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext()

    if (!user) {
      return jsonError('Unauthorized', 401)
    }

    const bundle = await getProfileBundle(supabase, user.id)
    const context = await getTrainingContext(supabase, user.id, bundle)

    return NextResponse.json({
      ...context,
      summary: formatTrainingContext(context),
    })
  } catch (error) {
    return jsonError('Unable to load the memory profile.', 400, error)
  }
}
