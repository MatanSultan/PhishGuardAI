import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { createPayPalUpgradeCheckout } from '@/lib/billing/service'
import { getCookieLocale } from '@/lib/i18n-server'
import { AuthorizationError, requireOrganizationAdmin } from '@/lib/permissions'
import { getSupabaseEnvDiagnostics } from '@/lib/supabase/diagnostics'
import { getServiceSupabaseClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const checkoutSchema = z.object({
  locale: z.enum(['he', 'en']).optional(),
})

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext()

    if (!user) {
      return jsonError('Authentication is required.', 401)
    }

    const body = checkoutSchema.parse(await request.json().catch(() => ({})))
    const locale = body.locale ?? (await getCookieLocale())
    const context = await requireOrganizationAdmin(supabase, user.id)

    if (context.organization.plan_status === 'active_paid' && !context.organization.access_blocked) {
      return jsonError('Your organization is already on a paid plan.', 409)
    }

    const service = getServiceSupabaseClient()
    const checkout = await createPayPalUpgradeCheckout(service, {
      organization: {
        id: context.organization.id,
        name: context.organization.name,
      },
      initiatedBy: user.id,
      locale: locale === 'he' ? 'he' : 'en',
      source: 'upgrade_page',
    })
    const diagnostics = getSupabaseEnvDiagnostics()

    console.info('[billing-checkout] created', {
      userId: user.id,
      organizationId: context.organization.id,
      organizationName: context.organization.name,
      providerOrderId: checkout.providerOrderId,
      reused: checkout.reused,
      supabaseProjectRef: diagnostics.urlProjectRef,
      serviceKeyKind: diagnostics.serviceKeyKind,
      serviceKeyRole: diagnostics.serviceKeyRole,
    })

    return NextResponse.json(checkout)
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, error.statusCode, error)
    }

    const message = error instanceof Error ? error.message : 'Unable to create PayPal checkout.'
    console.error('[billing-checkout] failed', message, error)
    return jsonError(message, 400, error)
  }
}
