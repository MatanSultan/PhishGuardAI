import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { getDashboardData } from '@/lib/training/service'

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext()

    if (!user) {
      return jsonError('Unauthorized', 401)
    }

    const payload = await getDashboardData(supabase, user.id)
    return NextResponse.json(payload)
  } catch (error) {
    return jsonError('Unable to load the dashboard.', 400, error)
  }
}
