import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { APP_ROUTES, DEFAULT_APP_REDIRECT, authRoutePrefixes, protectedRoutePrefixes } from '@/lib/constants'
import type { Database } from '@/lib/database.types'
import { env } from '@/lib/env'
import { sanitizeRedirect } from '@/lib/auth'

function startsWithAny(pathname: string, prefixes: readonly string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

          response = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname, searchParams } = request.nextUrl
  const isProtectedRoute = startsWithAny(pathname, protectedRoutePrefixes)
  const isAuthRoute = startsWithAny(pathname, authRoutePrefixes)

  if (!user && isProtectedRoute) {
    const signInUrl = request.nextUrl.clone()
    signInUrl.pathname = APP_ROUTES.signIn
    signInUrl.searchParams.set('next', sanitizeRedirect(`${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`))
    return NextResponse.redirect(signInUrl)
  }

  if (user && isAuthRoute && pathname !== APP_ROUTES.authCallback) {
    const next = sanitizeRedirect(searchParams.get('next'), DEFAULT_APP_REDIRECT)
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = next
    dashboardUrl.search = ''
    return NextResponse.redirect(dashboardUrl)
  }

  return response
}
