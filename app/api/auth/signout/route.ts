import { NextResponse } from 'next/server'

import { jsonError } from '@/lib/api'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return jsonError(error.message, 400)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return jsonError('Unable to sign out.', 400, error)
  }
}
