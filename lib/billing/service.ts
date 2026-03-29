import { randomUUID } from 'crypto'

import type { SupabaseClient } from '@supabase/supabase-js'

import { requireBillingConfig } from '@/lib/billing/config'
import {
  capturePayPalOrder,
  createPayPalOrder,
  verifyPayPalWebhookSignature,
} from '@/lib/billing/paypal'
import type { Database, Json, TableInsert, TableRow } from '@/lib/database.types'

type AppSupabaseClient = SupabaseClient<Database>
type BillingOrderRow = TableRow<'billing_orders'>
type BillingPaymentRow = TableRow<'billing_payments'>
type BillingEventRow = TableRow<'billing_events'>
type BillingPlanChangeRow = TableRow<'organization_plan_changes'>

export interface OrganizationBillingSnapshot {
  latestOrder: BillingOrderRow | null
  latestPayment: BillingPaymentRow | null
  latestPlanChange: BillingPlanChangeRow | null
}

export interface OwnerBillingOrderItem {
  id: string
  organizationId: string
  organizationName: string
  amount: number
  currency: string
  status: string
  createdAt: string
  capturedAt: string | null
  payerEmail: string | null
  targetPlanType: string
  targetPlanStatus: string
  captureStatus: string | null
}

export interface OwnerBillingEventItem {
  id: string
  organizationId: string | null
  organizationName: string | null
  eventType: string
  source: string
  status: string | null
  summary: string
  createdAt: string
}

export interface OwnerPlanChangeItem {
  id: string
  organizationId: string
  organizationName: string
  previousPlanType: string
  previousPlanStatus: string
  nextPlanType: string
  nextPlanStatus: string
  source: string
  note: string | null
  createdAt: string
}

export interface OwnerBillingPayload {
  summary: {
    completedPayments: number
    pendingOrders: number
    failedPayments: number
    completedAmount: number
    currency: string
  }
  recentOrders: OwnerBillingOrderItem[]
  recentEvents: OwnerBillingEventItem[]
  recentPlanChanges: OwnerPlanChangeItem[]
}

async function insertBillingEventSafely(
  service: AppSupabaseClient,
  event: TableInsert<'billing_events'>,
) {
  if (event.provider_event_id) {
    const { data: existing, error: existingError } = await service
      .from('billing_events')
      .select('id')
      .eq('provider_event_id', event.provider_event_id)
      .limit(1)
      .maybeSingle()

    if (existingError) {
      throw existingError
    }

    if (existing) {
      return
    }

  }

  const { error } = await service.from('billing_events').insert(event)

  if (error) {
    throw error
  }
}

type PayPalWebhookEvent = {
  id?: string
  event_type?: string
  resource?: {
    id?: string
    status?: string
    amount?: {
      value?: string
      currency_code?: string
    }
    supplementary_data?: {
      related_ids?: {
        order_id?: string
      }
    }
    payer?: {
      email_address?: string
    }
  }
}

function getBillingDescription(organizationName: string) {
  return `PhishGuard AI upgrade for ${organizationName}`
}

function createBillingMetadata(input: {
  locale: 'he' | 'en'
  source: string
}) {
  return {
    locale: input.locale,
    source: input.source,
  } satisfies Json
}

async function getReusableCheckoutOrder(
  service: AppSupabaseClient,
  organizationId: string,
  initiatedBy: string,
) {
  const threshold = new Date(Date.now() - 15 * 60_000).toISOString()
  const { data, error } = await service
    .from('billing_orders')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('initiated_by', initiatedBy)
    .in('status', ['created', 'approved'])
    .gte('created_at', threshold)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as BillingOrderRow | null) ?? null
}

export async function createPayPalUpgradeCheckout(
  service: AppSupabaseClient,
  input: {
    organization: Pick<TableRow<'organizations'>, 'id' | 'name'>
    initiatedBy: string
    locale: 'he' | 'en'
    source: string
  },
) {
  const config = requireBillingConfig()
  const existingOrder = await getReusableCheckoutOrder(service, input.organization.id, input.initiatedBy)

  if (existingOrder?.approval_url) {
    return {
      approvalUrl: existingOrder.approval_url,
      providerOrderId: existingOrder.provider_order_id,
      reused: true,
    }
  }

  const idempotencyKey = randomUUID()
  const returnUrl = `${config.appUrl}/api/billing/paypal/return`
  const cancelUrl = `${config.appUrl}/upgrade?checkout=canceled`
  const customId = `${input.organization.id}:${input.initiatedBy}:${idempotencyKey}`

  const paypalOrder = await createPayPalOrder({
    amount: config.upgradeAmount,
    currency: config.upgradeCurrency,
    description: getBillingDescription(input.organization.name),
    customId,
    requestId: idempotencyKey,
    returnUrl,
    cancelUrl,
    locale: input.locale,
  })

  const orderInsert: TableInsert<'billing_orders'> = {
    organization_id: input.organization.id,
    initiated_by: input.initiatedBy,
    provider: 'paypal',
    provider_order_id: paypalOrder.id,
    idempotency_key: idempotencyKey,
    target_plan_type: config.targetPlanType,
    target_plan_status: config.targetPlanStatus,
    target_max_members: config.targetMaxMembers,
    amount: Number(config.upgradeAmount),
    currency: config.upgradeCurrency,
    status: paypalOrder.status.toLowerCase() === 'approved' ? 'approved' : 'created',
    approval_url: paypalOrder.approvalUrl,
    metadata: createBillingMetadata({ locale: input.locale, source: input.source }),
    provider_payload: {
      orderId: paypalOrder.id,
      orderStatus: paypalOrder.status,
    },
  }

  const { data: order, error } = await service
    .from('billing_orders')
    .insert(orderInsert)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  const eventInsert: TableInsert<'billing_events'> = {
    billing_order_id: order.id,
    organization_id: input.organization.id,
    actor_user_id: input.initiatedBy,
    provider: 'paypal',
    source: 'checkout',
    event_type: 'paypal.order_created',
    status: order.status,
    summary: `PayPal checkout created for ${input.organization.name}`,
    payload: {
      providerOrderId: order.provider_order_id,
      approvalUrl: order.approval_url,
      targetPlanType: order.target_plan_type,
      amount: order.amount,
      currency: order.currency,
    },
  }

  await insertBillingEventSafely(service, eventInsert)

  return {
    approvalUrl: paypalOrder.approvalUrl,
    providerOrderId: paypalOrder.id,
    reused: false,
  }
}

async function getBillingOrderByProviderOrderId(
  service: AppSupabaseClient,
  providerOrderId: string,
) {
  const { data, error } = await service
    .from('billing_orders')
    .select('*')
    .eq('provider_order_id', providerOrderId)
    .eq('provider', 'paypal')
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as BillingOrderRow | null) ?? null
}

async function applyVerifiedCapture(
  service: AppSupabaseClient,
  input: {
    providerOrderId: string
    captureId: string
    captureStatus: string
    amount: string
    currency: string
    payerEmail: string | null
    paymentSource: 'capture' | 'webhook'
    eventSource: 'capture' | 'webhook'
    eventType?: string | null
    eventSummary?: string | null
    providerEventId?: string | null
    orderPayload?: Json
    capturePayload?: Json
  },
) {
  const { data, error } = await service.rpc('record_verified_billing_payment', {
    p_provider: 'paypal',
    p_provider_order_id: input.providerOrderId,
    p_provider_capture_id: input.captureId,
    p_capture_status: input.captureStatus,
    p_amount: Number(input.amount),
    p_currency: input.currency,
    p_payer_email: input.payerEmail,
    p_payment_source: input.paymentSource,
    p_event_source: input.eventSource,
    p_event_type: input.eventType ?? null,
    p_event_summary: input.eventSummary ?? null,
    p_provider_event_id: input.providerEventId ?? null,
    p_order_payload: input.orderPayload ?? {},
    p_capture_payload: input.capturePayload ?? {},
  })

  if (error) {
    throw error
  }

  return (data ?? [])[0] ?? null
}

function isAlreadyProcessedOrder(order: BillingOrderRow | null) {
  return Boolean(order?.plan_applied_at || order?.status === 'completed')
}

export async function capturePayPalUpgradeForOrder(
  service: AppSupabaseClient,
  providerOrderId: string,
) {
  const existingOrder = await getBillingOrderByProviderOrderId(service, providerOrderId)

  if (!existingOrder) {
    throw new Error('Billing order not found for PayPal capture.')
  }

  if (isAlreadyProcessedOrder(existingOrder)) {
    return {
      alreadyProcessed: true,
      providerOrderId,
      organizationId: existingOrder.organization_id,
      billingOrderId: existingOrder.id,
    }
  }

  try {
    const captured = await capturePayPalOrder(providerOrderId, `capture:${existingOrder.id}`)
    const processed = await applyVerifiedCapture(service, {
      providerOrderId,
      captureId: captured.captureId,
      captureStatus: captured.captureStatus,
      amount: captured.amount,
      currency: captured.currency,
      payerEmail: captured.payerEmail,
      paymentSource: 'capture',
      eventSource: 'capture',
      eventType: 'paypal.capture.completed',
      eventSummary: `Verified PayPal capture for ${existingOrder.organization_id}`,
      orderPayload: captured.raw,
      capturePayload: captured.raw.purchase_units?.[0]?.payments?.captures?.[0] ?? captured.raw,
    })

    return {
      alreadyProcessed: false,
      providerOrderId,
      organizationId: processed?.organization_id ?? existingOrder.organization_id,
      billingOrderId: processed?.billing_order_id ?? existingOrder.id,
      planApplied: Boolean(processed?.plan_applied),
    }
  } catch (error) {
    const freshOrder = await getBillingOrderByProviderOrderId(service, providerOrderId)

    if (isAlreadyProcessedOrder(freshOrder)) {
      return {
        alreadyProcessed: true,
        providerOrderId,
        organizationId: freshOrder!.organization_id,
        billingOrderId: freshOrder!.id,
      }
    }

    throw error
  }
}

async function updateBillingOrderApprovalState(
  service: AppSupabaseClient,
  providerOrderId: string,
  status: BillingOrderRow['status'],
  event: PayPalWebhookEvent,
) {
  const order = await getBillingOrderByProviderOrderId(service, providerOrderId)

  if (!order) {
    return null
  }

  const { data, error } = await service
    .from('billing_orders')
    .update({
      status,
      provider_payload: {
        ...(typeof order.provider_payload === 'object' && order.provider_payload ? order.provider_payload : {}),
        latestWebhook: event,
      },
      updated_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
    })
    .eq('id', order.id)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data as BillingOrderRow
}

function getWebhookOrderId(event: PayPalWebhookEvent) {
  return (
    event.resource?.supplementary_data?.related_ids?.order_id ??
    (event.event_type?.startsWith('CHECKOUT.ORDER') ? event.resource?.id : null) ??
    null
  )
}

export async function processPayPalWebhook(
  service: AppSupabaseClient,
  headers: Headers,
  event: unknown,
) {
  const isValid = await verifyPayPalWebhookSignature(headers, event)

  if (!isValid) {
    throw new Error('Invalid PayPal webhook signature.')
  }

  const typedEvent = (event ?? {}) as PayPalWebhookEvent
  const eventType = typedEvent.event_type ?? 'paypal.unknown'
  const providerEventId = typedEvent.id ?? null
  const providerOrderId = getWebhookOrderId(typedEvent)
  const resource = typedEvent.resource

  if (!providerOrderId) {
    return {
      handled: false,
      reason: 'missing_order_id',
      eventType,
    }
  }

  if (eventType === 'CHECKOUT.ORDER.APPROVED') {
    const updated = await updateBillingOrderApprovalState(service, providerOrderId, 'approved', typedEvent)

    if (updated) {
      const eventInsert: TableInsert<'billing_events'> = {
        billing_order_id: updated.id,
        organization_id: updated.organization_id,
        actor_user_id: updated.initiated_by,
        provider: 'paypal',
        source: 'webhook',
        event_type: eventType,
        status: updated.status,
        summary: 'PayPal order approved',
        provider_event_id: providerEventId,
        payload: typedEvent as Json,
      }
      await insertBillingEventSafely(service, eventInsert)
    }

    return {
      handled: true,
      eventType,
      providerOrderId,
      action: 'order_approved',
    }
  }

  if (eventType.startsWith('PAYMENT.CAPTURE.')) {
    const captureId = resource?.id
    const captureStatus = resource?.status ?? eventType.replace('PAYMENT.CAPTURE.', '')
    const amount = resource?.amount?.value
    const currency = resource?.amount?.currency_code

    if (!captureId || !amount || !currency) {
      return {
        handled: false,
        reason: 'missing_capture_fields',
        eventType,
        providerOrderId,
      }
    }

    const processed = await applyVerifiedCapture(service, {
      providerOrderId,
      captureId,
      captureStatus,
      amount,
      currency,
      payerEmail: resource?.payer?.email_address ?? null,
      paymentSource: 'webhook',
      eventSource: 'webhook',
      eventType,
      eventSummary: `PayPal webhook ${eventType}`,
      providerEventId,
      orderPayload: typedEvent as Json,
      capturePayload: resource as Json,
    })

    return {
      handled: true,
      eventType,
      providerOrderId,
      action: 'capture_processed',
      planApplied: Boolean(processed?.plan_applied),
    }
  }

  const order = await getBillingOrderByProviderOrderId(service, providerOrderId)

  if (order && providerEventId) {
    const eventInsert: TableInsert<'billing_events'> = {
      billing_order_id: order.id,
      organization_id: order.organization_id,
      actor_user_id: order.initiated_by,
      provider: 'paypal',
      source: 'webhook',
      event_type: eventType,
      status: resource?.status ?? order.status,
      summary: `PayPal webhook ${eventType}`,
      provider_event_id: providerEventId,
      payload: typedEvent as Json,
    }
    await insertBillingEventSafely(service, eventInsert)
  }

  return {
    handled: true,
    eventType,
    providerOrderId,
    action: 'event_logged',
  }
}

export async function getOrganizationBillingSnapshot(
  service: AppSupabaseClient,
  organizationId: string,
): Promise<OrganizationBillingSnapshot> {
  const [latestOrderResult, latestPlanChangeResult] = await Promise.all([
    service
      .from('billing_orders')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    service
      .from('organization_plan_changes')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (latestOrderResult.error) {
    throw latestOrderResult.error
  }

  if (latestPlanChangeResult.error) {
    throw latestPlanChangeResult.error
  }

  const latestOrder = (latestOrderResult.data as BillingOrderRow | null) ?? null

  if (!latestOrder) {
    return {
      latestOrder: null,
      latestPayment: null,
      latestPlanChange: (latestPlanChangeResult.data as BillingPlanChangeRow | null) ?? null,
    }
  }

  const { data: latestPaymentData, error: latestPaymentError } = await service
    .from('billing_payments')
    .select('*')
    .eq('billing_order_id', latestOrder.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestPaymentError) {
    throw latestPaymentError
  }

  return {
    latestOrder,
    latestPayment: (latestPaymentData as BillingPaymentRow | null) ?? null,
    latestPlanChange: (latestPlanChangeResult.data as BillingPlanChangeRow | null) ?? null,
  }
}

export async function getOwnerBillingPayload(
  service: AppSupabaseClient,
  limit = 12,
): Promise<OwnerBillingPayload> {
  const [ordersResult, eventsResult, planChangesResult, organizationsResult] = await Promise.all([
    service
      .from('billing_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit),
    service
      .from('billing_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit),
    service
      .from('organization_plan_changes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit),
    service.from('organizations').select('id, name'),
  ])

  if (ordersResult.error) {
    throw ordersResult.error
  }

  if (eventsResult.error) {
    throw eventsResult.error
  }

  if (planChangesResult.error) {
    throw planChangesResult.error
  }

  if (organizationsResult.error) {
    throw organizationsResult.error
  }

  const orders = (ordersResult.data ?? []) as BillingOrderRow[]
  const events = (eventsResult.data ?? []) as BillingEventRow[]
  const planChanges = (planChangesResult.data ?? []) as BillingPlanChangeRow[]
  const organizationMap = new Map(
    ((organizationsResult.data ?? []) as Array<Pick<TableRow<'organizations'>, 'id' | 'name'>>).map((organization) => [
      organization.id,
      organization.name,
    ]),
  )

  const orderIds = orders.map((order) => order.id)
  const paymentsResult = orderIds.length
    ? await service.from('billing_payments').select('*').in('billing_order_id', orderIds)
    : { data: [], error: null }

  if (paymentsResult.error) {
    throw paymentsResult.error
  }

  const payments = (paymentsResult.data ?? []) as BillingPaymentRow[]
  const latestPaymentByOrder = new Map<string, BillingPaymentRow>()

  for (const payment of payments) {
    const current = latestPaymentByOrder.get(payment.billing_order_id)

    if (!current || new Date(current.created_at).getTime() < new Date(payment.created_at).getTime()) {
      latestPaymentByOrder.set(payment.billing_order_id, payment)
    }
  }

  const summaryCurrency = orders[0]?.currency ?? 'ILS'
  const completedOrders = orders.filter((order) => order.status === 'completed')

  return {
    summary: {
      completedPayments: completedOrders.length,
      pendingOrders: orders.filter((order) => order.status === 'created' || order.status === 'approved').length,
      failedPayments: orders.filter((order) => order.status === 'failed' || order.status === 'canceled').length,
      completedAmount: completedOrders.reduce((sum, order) => sum + Number(order.amount ?? 0), 0),
      currency: summaryCurrency,
    },
    recentOrders: orders.map((order) => {
      const payment = latestPaymentByOrder.get(order.id)

      return {
        id: order.id,
        organizationId: order.organization_id,
        organizationName: organizationMap.get(order.organization_id) ?? order.organization_id,
        amount: Number(order.amount),
        currency: order.currency,
        status: order.status,
        createdAt: order.created_at,
        capturedAt: order.captured_at,
        payerEmail: order.payer_email,
        targetPlanType: order.target_plan_type,
        targetPlanStatus: order.target_plan_status,
        captureStatus: payment?.status ?? null,
      }
    }),
    recentEvents: events.map((event) => ({
      id: event.id,
      organizationId: event.organization_id,
      organizationName: event.organization_id ? organizationMap.get(event.organization_id) ?? event.organization_id : null,
      eventType: event.event_type,
      source: event.source,
      status: event.status,
      summary: event.summary,
      createdAt: event.created_at,
    })),
    recentPlanChanges: planChanges.map((change) => ({
      id: change.id,
      organizationId: change.organization_id,
      organizationName: organizationMap.get(change.organization_id) ?? change.organization_id,
      previousPlanType: change.previous_plan_type,
      previousPlanStatus: change.previous_plan_status,
      nextPlanType: change.next_plan_type,
      nextPlanStatus: change.next_plan_status,
      source: change.source,
      note: change.note,
      createdAt: change.created_at,
    })),
  }
}
