import OwnerOrganizationsClient from './client'

import { requireSessionUser } from '@/lib/auth'
import { getOwnerBillingPayload } from '@/lib/billing/service'
import { getOwnerAccessDetails } from '@/lib/owner/auth'
import type { OwnerConsolePayload, OwnerOrganizationsPayload } from '@/lib/owner/service'
import { getOwnerOrganizationsPayload, getOwnerOrganizationsPayloadViaRpc } from '@/lib/owner/service'
import { AuthorizationError } from '@/lib/permissions'
import { getServiceSupabaseClient } from '@/lib/supabase/service'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function OwnerOrganizationsPage() {
  const user = await requireSessionUser('/owner/organizations')

  try {
    const access = await getOwnerAccessDetails(user.email)

    if (!access.allowed) {
      throw new AuthorizationError('Owner access is required.', 403)
    }

    const requestSupabase = await createServerSupabaseClient()
    const billingPromise = (async () => {
      try {
        const service = getServiceSupabaseClient()
        const billing = await getOwnerBillingPayload(service)

        return {
          billing,
          billingError: null as string | null,
        }
      } catch (billingError) {
        const message =
          billingError instanceof Error ? billingError.message : 'Unable to load billing activity.'

        console.warn('[owner-page] Unable to load billing payload.', {
          email: access.normalizedEmail,
          message,
        })

        return {
          billing: null,
          billingError: message,
        }
      }
    })()

    let payload: OwnerOrganizationsPayload
    let source: 'rpc' | 'service_query' = 'rpc'
    const canUseServiceFallback = access.viaEnv && !access.viaDatabase

    try {
      payload = await getOwnerOrganizationsPayloadViaRpc(requestSupabase)
    } catch (rpcError) {
      if (!canUseServiceFallback) {
        throw rpcError
      }

      const service = getServiceSupabaseClient()
      payload = await getOwnerOrganizationsPayload(service)
      source = 'service_query'

      console.warn('[owner-page] Falling back to service query after RPC failure.', {
        email: access.normalizedEmail,
        message: rpcError instanceof Error ? rpcError.message : 'Unknown RPC error',
      })
    }

    const billingState = await billingPromise
    const consolePayload: OwnerConsolePayload = {
      ...payload,
      billing: billingState.billing,
      billingError: billingState.billingError,
    }

    console.info('[owner-page] Loaded organizations.', {
      email: access.normalizedEmail,
      organizations: consolePayload.organizations.length,
      billingOrders: consolePayload.billing?.recentOrders.length ?? 0,
      source,
    })

    return (
      <OwnerOrganizationsClient
        initialOrganizations={consolePayload.organizations}
        initialBilling={consolePayload.billing}
        initialBillingError={consolePayload.billingError}
        initialError={null}
        initialOwnerEmail={access.normalizedEmail}
        initialDidLoad
      />
    )
  } catch (error) {
    const initialError =
      error instanceof AuthorizationError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Unable to load the owner console.'

    return (
      <OwnerOrganizationsClient
        initialOrganizations={[]}
        initialBilling={null}
        initialBillingError={null}
        initialError={initialError}
        initialOwnerEmail={user.email ?? null}
        initialDidLoad={false}
      />
    )
  }
}
