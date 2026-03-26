import OwnerOrganizationsClient from './client'

import { requireSessionUser } from '@/lib/auth'
import { getOwnerAccessDetails } from '@/lib/owner/auth'
import { getServiceSupabaseClient } from '@/lib/supabase/service'
import { getOwnerOrganizationsPayload } from '@/lib/owner/service'
import { AuthorizationError } from '@/lib/permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function OwnerOrganizationsPage() {
  const user = await requireSessionUser('/owner/organizations')

  try {
    const access = await getOwnerAccessDetails(user.email)

    if (!access.allowed) {
      throw new AuthorizationError('Owner access is required.', 403)
    }

    const payload = await getOwnerOrganizationsPayload(getServiceSupabaseClient())

    return (
      <OwnerOrganizationsClient
        initialOrganizations={payload.organizations}
        initialError={null}
        initialOwnerEmail={access.normalizedEmail}
        initialDidLoad
      />
    )
  } catch (error) {
    const initialError =
      error instanceof AuthorizationError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Unable to load the owner console.'

    return (
      <OwnerOrganizationsClient
        initialOrganizations={[]}
        initialError={initialError}
        initialOwnerEmail={user.email ?? null}
        initialDidLoad={false}
      />
    )
  }
}
