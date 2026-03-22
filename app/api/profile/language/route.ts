import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { LOCALE_COOKIE_NAME } from '@/lib/constants'
import { updatePreferredLanguage } from '@/lib/profile/service'
import { updateLanguageSchema } from '@/lib/validators/auth'

export async function POST(request: Request) {
  try {
    const body = updateLanguageSchema.parse(await request.json())
    const { supabase, user } = await getAuthenticatedRequestContext()

    const cookieStore = await cookies()
    cookieStore.set(LOCALE_COOKIE_NAME, body.locale, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    })

    if (!user) {
      return NextResponse.json({ ok: true, locale: body.locale })
    }

    await updatePreferredLanguage(supabase, user.id, body.locale)
    await supabase.auth.updateUser({
      data: {
        preferred_language: body.locale,
      },
    })

    return NextResponse.json({ ok: true, locale: body.locale })
  } catch (error) {
    return jsonError('Unable to update the language.', 400, error)
  }
}
