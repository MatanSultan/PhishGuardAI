import AdminReportsPageClient from './client'

import { requireSessionUser } from '@/lib/auth'
import { getServerOrganizationContext } from '@/lib/organizations/service'
import { AuthorizationError } from '@/lib/permissions'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getOrganizationReportsData } from '@/lib/company-analytics/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function AdminReportsPage() {
  const user = await requireSessionUser('/admin/reports')
  const supabase = await createServerSupabaseClient()
  const context = await getServerOrganizationContext(user.id)

  try {
    if (!context || context.membership.role !== 'admin' || context.membership.status !== 'active') {
      throw new AuthorizationError('Organization admin access is required.', 403)
    }

    const initialData = await getOrganizationReportsData(supabase, context)

    return (
      <AdminReportsPageClient
        initialData={initialData}
        initialError={null}
        initialRequiresAdmin={false}
      />
    )
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return (
        <AdminReportsPageClient
          initialData={null}
          initialError={error.message}
          initialRequiresAdmin={error.statusCode === 403}
        />
      )
    }

    return (
      <AdminReportsPageClient
        initialData={null}
        initialError={error instanceof Error ? error.message : 'Unable to load reports.'}
        initialRequiresAdmin={false}
      />
    )
  }
}
