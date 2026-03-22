import { NextResponse } from 'next/server'

import { sanitizeRedirect } from '@/lib/auth'
import { jsonError } from '@/lib/api'
import { signInSchema } from '@/lib/validators/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = signInSchema.parse(await request.json())
    const supabase = await createServerSupabaseClient()

    const { error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    })

    if (error) {
      return jsonError(error.message, 400)
    }

    return NextResponse.json({
      ok: true,
      redirectTo: sanitizeRedirect(body.next),
    })
  } catch (error) {
    return jsonError('Unable to sign in.', 400, error)
  }
}
