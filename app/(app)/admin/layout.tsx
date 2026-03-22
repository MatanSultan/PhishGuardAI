import { redirect } from 'next/navigation'

import { requireSessionUser } from '@/lib/auth'
import { getCurrentOrganizationContext } from '@/lib/organizations/service'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireSessionUser('/admin')
  const supabase = await createServerSupabaseClient()
  const context = await getCurrentOrganizationContext(supabase, user.id)

  if (!context || context.membership.role !== 'admin') {
    redirect('/dashboard')
  }

  return children
}
