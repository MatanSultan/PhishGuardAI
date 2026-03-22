import { NextResponse } from 'next/server'

import { sanitizeRedirect } from '@/lib/auth'
import { APP_ROUTES } from '@/lib/constants'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = sanitizeRedirect(requestUrl.searchParams.get('next'))
  const redirectUrl = new URL(next, requestUrl.origin)

  if (!code) {
    return NextResponse.redirect(new URL(APP_ROUTES.signIn, requestUrl.origin))
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL(APP_ROUTES.signIn, requestUrl.origin))
  }

  return NextResponse.redirect(redirectUrl)
}
