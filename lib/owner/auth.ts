import type { User } from '@supabase/supabase-js'

import { AuthorizationError } from '@/lib/permissions'
import { env } from '@/lib/env'

const ownerEmails = (env.OWNER_EMAILS ?? '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean)

export function isOwnerEmail(email: string | null | undefined) {
  if (!email) {
    return false
  }

  return ownerEmails.includes(email.trim().toLowerCase())
}

export function requireOwnerUser(user: User | null | undefined) {
  if (!user) {
    throw new AuthorizationError('Owner access is required.', 401)
  }

  if (!isOwnerEmail(user.email)) {
    throw new AuthorizationError('Owner access is required.', 403)
  }

  return user
}
