import { NextResponse } from 'next/server'

import { jsonError } from '@/lib/api'
import { resetPasswordSchema } from '@/lib/validators/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = resetPasswordSchema.parse(await request.json())
    const supabase = await createServerSupabaseClient()

    const { error } = await supabase.auth.updateUser({
      password: body.password,
    })

    if (error) {
      return jsonError(error.message, 400)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return jsonError('Unable to update the password.', 400, error)
  }
}
