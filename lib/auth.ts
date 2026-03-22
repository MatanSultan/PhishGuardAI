import { redirect } from 'next/navigation'

import { APP_ROUTES, DEFAULT_APP_REDIRECT } from '@/lib/constants'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export function sanitizeRedirect(target: string | null | undefined, fallback = DEFAULT_APP_REDIRECT) {
  if (!target) {
    return fallback
  }

  if (!target.startsWith('/') || target.startsWith('//')) {
    return fallback
  }

  if (target.startsWith(APP_ROUTES.authCallback)) {
    return fallback
  }

  return target
}

export async function getSessionUser() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user ?? null
}

export async function requireSessionUser(next = DEFAULT_APP_REDIRECT) {
  const user = await getSessionUser()

  if (!user) {
    redirect(`${APP_ROUTES.signIn}?next=${encodeURIComponent(next)}`)
  }

  return user
}
