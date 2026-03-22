import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { getNextTrainingSimulation } from '@/lib/training/service'
import { startTrainingSchema } from '@/lib/validators/training'

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext()

    if (!user) {
      return jsonError('Unauthorized', 401)
    }

    const body = startTrainingSchema.parse(await request.json().catch(() => ({})))
    const payload = await getNextTrainingSimulation(supabase, user.id, body)

    return NextResponse.json(payload)
  } catch (error) {
    return jsonError('Unable to start the training session.', 400, error)
  }
}
