import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'
import {
  getCurrentOrganizationContext,
  type OrganizationContext,
} from '@/lib/organizations/service'

type AppSupabaseClient = SupabaseClient<Database>

export class AuthorizationError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 403) {
    super(message)
    this.name = 'AuthorizationError'
    this.statusCode = statusCode
  }
}

export function isOrganizationAdmin(context: OrganizationContext | null | undefined) {
  return context?.membership.role === 'admin' && context.membership.status === 'active'
}

export async function requireOrganizationContext(
  supabase: AppSupabaseClient,
  userId: string,
) {
  const context = await getCurrentOrganizationContext(supabase, userId)

  if (!context) {
    throw new AuthorizationError('Organization membership is required.', 403)
  }

  return context
}

export async function requireOrganizationAdmin(
  supabase: AppSupabaseClient,
  userId: string,
) {
  const context = await requireOrganizationContext(supabase, userId)

  if (!isOrganizationAdmin(context)) {
    throw new AuthorizationError('Organization admin access is required.', 403)
  }

  return context
}
