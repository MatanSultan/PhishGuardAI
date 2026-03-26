import { redirect } from 'next/navigation'

import { requireSessionUser } from '@/lib/auth'
import { getServerOrganizationContext } from '@/lib/organizations/service'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireSessionUser('/admin')
  const context = await getServerOrganizationContext(user.id)

  if (!context || context.membership.role !== 'admin' || context.membership.status !== 'active') {
    redirect('/dashboard')
  }

  return children
}
