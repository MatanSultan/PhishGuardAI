import { NextResponse } from 'next/server'

import { capturePayPalUpgradeForOrder } from '@/lib/billing/service'
import { getSupabaseEnvDiagnostics } from '@/lib/supabase/diagnostics'
import { getServiceSupabaseClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function buildUpgradeRedirect(request: Request, status: 'success' | 'failed', params?: Record<string, string>) {
  const url = new URL('/upgrade', request.url)
  url.searchParams.set('checkout', status)

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
  }

  return NextResponse.redirect(url)
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const providerOrderId = requestUrl.searchParams.get('token')

  if (!providerOrderId) {
    return buildUpgradeRedirect(request, 'failed', { reason: 'missing_token' })
  }

  try {
    const service = getServiceSupabaseClient()
    const result = await capturePayPalUpgradeForOrder(service, providerOrderId)
    const diagnostics = getSupabaseEnvDiagnostics()

    console.info('[billing-capture] processed', {
      providerOrderId,
      billingOrderId: result.billingOrderId,
      organizationId: result.organizationId,
      alreadyProcessed: result.alreadyProcessed,
      planApplied: result.planApplied ?? false,
      supabaseProjectRef: diagnostics.urlProjectRef,
      serviceKeyKind: diagnostics.serviceKeyKind,
      serviceKeyRole: diagnostics.serviceKeyRole,
    })

    return buildUpgradeRedirect(request, 'success', {
      order: providerOrderId,
      state: result.alreadyProcessed ? 'already_processed' : result.planApplied ? 'upgraded' : 'verified',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to verify the PayPal payment.'
    console.error('[billing-capture] failed', { providerOrderId, message, error })
    return buildUpgradeRedirect(request, 'failed', { reason: 'capture_failed' })
  }
}
