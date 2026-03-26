import ReportsPageClient from './client'

import { requireSessionUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getReportsData } from '@/lib/training/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const user = await requireSessionUser('/reports')
  const supabase = await createServerSupabaseClient()

  try {
    const initialData = await getReportsData(supabase, user.id)

    return <ReportsPageClient initialData={initialData} initialError={null} />
  } catch (error) {
    return (
      <ReportsPageClient
        initialData={null}
        initialError={error instanceof Error ? error.message : 'Unable to load analytics.'}
      />
    )
  }
}
