import { redirect } from 'next/navigation'

import { Navbar } from '@/components/navbar'
import { getSessionUser } from '@/lib/auth'
import { getServerOrganizationContext } from '@/lib/organizations/service'
import { getOwnerAccessDetails, syncOwnerRecord } from '@/lib/owner/auth'

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()

  if (!user) {
    redirect('/auth/signin?next=/owner')
  }

  const [ownerAccess, organizationContext] = await Promise.all([
    getOwnerAccessDetails(user.email),
    getServerOrganizationContext(user.id),
  ])
  const isPlatformOwner = ownerAccess.allowed

  if (!isPlatformOwner) {
    redirect('/dashboard')
  }

  if (ownerAccess.viaEnv && !ownerAccess.viaDatabase) {
    await syncOwnerRecord(user.email)
  }

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
