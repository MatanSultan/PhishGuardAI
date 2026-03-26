import { cache } from 'react'
import type { User } from '@supabase/supabase-js'

import { AuthorizationError } from '@/lib/permissions'
import { env } from '@/lib/env'
import { getServiceSupabaseClient } from '@/lib/supabase/service'

const ownerEmails = (env.OWNER_EMAILS ?? '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean)

function normalizeOwnerEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase() ?? ''
  return normalized || null
}

export interface OwnerAccessDetails {
  normalizedEmail: string | null
  viaEnv: boolean
  viaDatabase: boolean
  allowed: boolean
  hasServiceRole: boolean
}

export function isOwnerEmail(email: string | null | undefined) {
  const normalizedEmail = normalizeOwnerEmail(email)

  if (!normalizedEmail) {
    return false
  }

  return ownerEmails.includes(normalizedEmail)
}

export const getOwnerAccessDetails = cache(async function getOwnerAccessDetails(
  email: string | null | undefined,
): Promise<OwnerAccessDetails> {
  const normalizedEmail = normalizeOwnerEmail(email)
  const viaEnv = isOwnerEmail(normalizedEmail)
  const hasServiceRole = Boolean(env.SUPABASE_SERVICE_ROLE_KEY)

  if (viaEnv) {
    return {
      normalizedEmail,
      viaEnv: true,
      viaDatabase: false,
      allowed: true,
      hasServiceRole,
    }
  }

  if (!normalizedEmail || !hasServiceRole) {
    return {
      normalizedEmail,
      viaEnv,
      viaDatabase: false,
      allowed: viaEnv,
      hasServiceRole,
    }
  }

  try {
    const service = getServiceSupabaseClient()
    const { data, error } = await service
      .from('platform_owners')
      .select('email')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (error) {
      console.warn('[owner-auth] Unable to read platform_owners.', {
        email: normalizedEmail,
        message: error.message,
      })
    }

    const viaDatabase = Boolean(data?.email)

    return {
      normalizedEmail,
      viaEnv,
      viaDatabase,
      allowed: viaEnv || viaDatabase,
      hasServiceRole,
    }
  } catch (error) {
    console.warn('[owner-auth] Owner database check failed.', {
      email: normalizedEmail,
      message: error instanceof Error ? error.message : 'Unknown error',
    })

    return {
      normalizedEmail,
      viaEnv,
      viaDatabase: false,
      allowed: viaEnv,
      hasServiceRole,
    }
  }
})

export async function syncOwnerRecord(email: string | null | undefined) {
  const normalizedEmail = normalizeOwnerEmail(email)

  if (!normalizedEmail || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return
  }

  try {
    const service = getServiceSupabaseClient()
    const { error } = await service.from('platform_owners').upsert({ email: normalizedEmail })

    if (error) {
      console.warn('[owner-auth] Unable to sync platform_owners.', {
        email: normalizedEmail,
        message: error.message,
      })
    }
  } catch (error) {
    console.warn('[owner-auth] Owner sync failed.', {
      email: normalizedEmail,
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

export async function isOwnerUser(email: string | null | undefined) {
  const access = await getOwnerAccessDetails(email)
  return access.allowed
}

export async function requireOwnerUser(user: User | null | undefined) {
  if (!user) {
    throw new AuthorizationError('Owner access is required.', 401)
  }

  const access = await getOwnerAccessDetails(user.email)

  if (!access.allowed) {
    throw new AuthorizationError('Owner access is required.', 403)
  }

  await syncOwnerRecord(access.normalizedEmail)

  return {
    user,
    access,
  }
}
