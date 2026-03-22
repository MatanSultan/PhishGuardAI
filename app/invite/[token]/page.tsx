import { getSessionUser } from '@/lib/auth'

import InvitePanel from './panel'

export default async function InvitePage({
  params,
}: {
  params: Promise<{
    token: string
  }>
}) {
  const user = await getSessionUser()
  const { token } = await params

  return <InvitePanel token={token} isAuthenticated={Boolean(user)} />
}
