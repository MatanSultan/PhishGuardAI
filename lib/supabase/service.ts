import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'
import { env } from '@/lib/env'
import { assertServiceRoleConfiguration } from '@/lib/supabase/diagnostics'

let serviceClient: ReturnType<typeof createClient<Database>> | null = null

export function getServiceSupabaseClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for owner operations.')
  }

  assertServiceRoleConfiguration()

  if (!serviceClient) {
    serviceClient = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  return serviceClient
}
