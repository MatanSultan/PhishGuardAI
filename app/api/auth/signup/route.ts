import { NextResponse } from 'next/server'

import { APP_ROUTES } from '@/lib/constants'
import { getAppUrl } from '@/lib/env'
import { jsonError } from '@/lib/api'
import { sanitizeRedirect } from '@/lib/auth'
import { signUpSchema } from '@/lib/validators/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = signUpSchema.parse(await request.json())
    const supabase = await createServerSupabaseClient()
    const next = sanitizeRedirect(body.next)

    const { data, error } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        data: {
          full_name: body.fullName,
          preferred_language: body.preferredLanguage,
          organization: body.organization || null,
          organization_type: body.organizationType,
          organization_industry: body.organizationIndustry || null,
        },
        emailRedirectTo: `${getAppUrl()}${APP_ROUTES.authCallback}?next=${encodeURIComponent(next)}`,
      },
    })

    if (error) {
      return jsonError(error.message, 400)
    }

    return NextResponse.json({
      ok: true,
      redirectTo: next,
      needsEmailVerification: !data.session,
    })
  } catch (error) {
    return jsonError('Unable to create the account.', 400, error)
  }
}
