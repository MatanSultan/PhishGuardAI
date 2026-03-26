import { redirect } from 'next/navigation'

import { Navbar } from '@/components/navbar'
import { getSessionUser } from '@/lib/auth'
import { isOwnerEmail } from '@/lib/owner/auth'

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()

  if (!user) {
    redirect('/auth/signin?next=/owner')
  }

  if (!isOwnerEmail(user.email)) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="app" />
      <main className="flex-1 bg-muted/30">{children}</main>
    </div>
  )
}
