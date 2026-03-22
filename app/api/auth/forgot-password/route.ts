import { NextResponse } from 'next/server'

import { APP_ROUTES } from '@/lib/constants'
import { getAppUrl } from '@/lib/env'
import { jsonError } from '@/lib/api'
import { forgotPasswordSchema } from '@/lib/validators/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = forgotPasswordSchema.parse(await request.json())
    const supabase = await createServerSupabaseClient()

    const { error } = await supabase.auth.resetPasswordForEmail(body.email, {
      redirectTo: `${getAppUrl()}${APP_ROUTES.authCallback}?next=${encodeURIComponent(APP_ROUTES.resetPassword)}`,
    })

    if (error) {
      return jsonError(error.message, 400)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return jsonError('Unable to send the reset email.', 400, error)
  }
}
