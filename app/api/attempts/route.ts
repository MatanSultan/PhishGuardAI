import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { getRecentAttemptsWithSimulations } from '@/lib/training/repository'

export async function GET(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext()

    if (!user) {
      return jsonError('Unauthorized', 401)
    }

    const requestUrl = new URL(request.url)
    const limit = Number(requestUrl.searchParams.get('limit') ?? '10')
    const attempts = await getRecentAttemptsWithSimulations(supabase, user.id, Number.isNaN(limit) ? 10 : limit)

    return NextResponse.json({ attempts })
  } catch (error) {
    return jsonError('Unable to load recent attempts.', 400, error)
  }
}
