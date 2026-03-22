'use client'

import { createBrowserClient } from '@supabase/ssr'

import type { Database } from '@/lib/database.types'
import { env } from '@/lib/env'

let client: ReturnType<typeof createBrowserClient<Database>> | undefined

export function createBrowserSupabaseClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    )
  }

  return client
}
