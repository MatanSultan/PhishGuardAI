import AdminPageClient from './client'

import { requireSessionUser } from '@/lib/auth'
import { getAdminOverviewPayloadFromContext } from '@/lib/admin/service'
import { getServerOrganizationContext } from '@/lib/organizations/service'
import { AuthorizationError } from '@/lib/permissions'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const user = await requireSessionUser('/admin')
  const supabase = await createServerSupabaseClient()
  const context = await getServerOrganizationContext(user.id)

  try {
    if (!context || context.membership.role !== 'admin' || context.membership.status !== 'active') {
      throw new AuthorizationError('Organization admin access is required.', 403)
    }

    const initialData = await getAdminOverviewPayloadFromContext(supabase, context)

    return (
      <AdminPageClient
        initialData={initialData}
        initialError={null}
        initialRequiresAdmin={false}
      />
    )
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return (
        <AdminPageClient
          initialData={null}
          initialError={error.message}
          initialRequiresAdmin={error.statusCode === 403}
        />
      )
    }

    return (
      <AdminPageClient
        initialData={null}
        initialError={error instanceof Error ? error.message : 'Unable to load the admin page.'}
        initialRequiresAdmin={false}
      />
    )
  }
}
