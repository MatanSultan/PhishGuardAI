import { redirect } from 'next/navigation'

import { Navbar } from '@/components/navbar'
import { HelpAssistant } from '@/components/assistant/help-assistant'
import type { AssistantRole, AssistantMode } from '@/lib/assistant/context'
import { getSessionUser } from '@/lib/auth'
import { getCurrentOrganizationContext } from '@/lib/organizations/service'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isOwnerEmail } from '@/lib/owner/auth'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const supabase = await createServerSupabaseClient()
  const organizationContext = await getCurrentOrganizationContext(supabase, user.id)
  const role: AssistantRole = organizationContext ? organizationContext.membership.role : 'individual'
  const mode: AssistantMode = organizationContext ? 'organization' : 'individual'
  const isPlatformOwner = isOwnerEmail(user.email)

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
        isPlatformOwner={isPlatformOwner}
      />
      <main className="flex-1 bg-muted/30">{children}</main>
      <HelpAssistant role={role} mode={mode} />
    </div>
  )
}
