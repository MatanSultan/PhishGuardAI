import DashboardPageClient from './client'

import { requireSessionUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getDashboardData } from '@/lib/training/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await requireSessionUser('/dashboard')
  const supabase = await createServerSupabaseClient()

  try {
    const initialData = await getDashboardData(supabase, user.id)

    return <DashboardPageClient initialData={initialData} initialError={null} />
  } catch (error) {
    return (
      <DashboardPageClient
        initialData={null}
        initialError={error instanceof Error ? error.message : 'Unable to load the dashboard.'}
      />
    )
  }
}
