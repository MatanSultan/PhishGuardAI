import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { submitTrainingAttempt } from '@/lib/training/service'
import { submitAttemptSchema } from '@/lib/validators/training'

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext()

    if (!user) {
      return jsonError('Unauthorized', 401)
    }

    const body = submitAttemptSchema.parse(await request.json())
    const payload = await submitTrainingAttempt(supabase, user.id, body)

    return NextResponse.json(payload)
  } catch (error) {
    return jsonError('Unable to submit the attempt.', 400, error)
  }
}
