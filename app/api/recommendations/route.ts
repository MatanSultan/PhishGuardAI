import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { getRecommendations } from '@/lib/training/repository'

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext()

    if (!user) {
      return jsonError('Unauthorized', 401)
    }

    const recommendations = await getRecommendations(supabase, user.id, 8)
    return NextResponse.json({ recommendations })
  } catch (error) {
    return jsonError('Unable to load recommendations.', 400, error)
  }
}
