import { redirect } from 'next/navigation'

import { Navbar } from '@/components/navbar'
import { getSessionUser } from '@/lib/auth'
import { getCurrentOrganizationContext } from '@/lib/organizations/service'
import { isOwnerUser, syncOwnerRecord } from '@/lib/owner/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()

  if (!user) {
    redirect('/auth/signin?next=/owner')
  }

  const isPlatformOwner = await isOwnerUser(user.email)

  if (!isPlatformOwner) {
    redirect('/dashboard')
  }

  await syncOwnerRecord(user.email)

  const supabase = await createServerSupabaseClient()
  const organizationContext = await getCurrentOrganizationContext(supabase, user.id)

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        variant="app"
        organizationState={
          organizationContext
            ? {
                name: organizationContext.organization.name,
                role: organizationContext.membership.role,
                allowLeaderboard: organizationContext.settings?.allow_leaderboard ?? true,
              }
            : null
        }
        isPlatformOwner
      />
      <main className="flex-1 bg-muted/30">{children}</main>
    </div>
  )
}
