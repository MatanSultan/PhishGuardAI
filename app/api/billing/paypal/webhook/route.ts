import { NextResponse } from 'next/server'

import { processPayPalWebhook } from '@/lib/billing/service'
import { jsonError } from '@/lib/api'
import { getSupabaseEnvDiagnostics } from '@/lib/supabase/diagnostics'
import { getServiceSupabaseClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const event = await request.json()
    const service = getServiceSupabaseClient()
    const result = await processPayPalWebhook(service, request.headers, event)
    const diagnostics = getSupabaseEnvDiagnostics()

    console.info('[billing-webhook] processed', {
      result,
      supabaseProjectRef: diagnostics.urlProjectRef,
      serviceKeyKind: diagnostics.serviceKeyKind,
      serviceKeyRole: diagnostics.serviceKeyRole,
    })

    return NextResponse.json({ ok: true, result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to process PayPal webhook.'
    console.error('[billing-webhook] failed', message, error)
    return jsonError(message, 400, error)
  }
}
