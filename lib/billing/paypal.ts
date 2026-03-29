import { requireBillingConfig, requirePayPalWebhookId } from '@/lib/billing/config'

type PayPalLink = {
  href: string
  rel: string
  method?: string
}

type PayPalAmount = {
  currency_code: string
  value: string
}

type PayPalCapture = {
  id: string
  status: string
  amount?: PayPalAmount
}

type PayPalCreateOrderResponse = {
  id: string
  status: string
  links?: PayPalLink[]
}

type PayPalCaptureOrderResponse = {
  id: string
  status: string
  payer?: {
    email_address?: string
  }
  purchase_units?: Array<{
    payments?: {
      captures?: PayPalCapture[]
    }
  }>
}

type PayPalVerificationResponse = {
  verification_status?: string
}

export interface PayPalOrderResult {
  id: string
  status: string
  approvalUrl: string
}

export interface PayPalCaptureResult {
  orderId: string
  orderStatus: string
  captureId: string
  captureStatus: string
  amount: string
  currency: string
  payerEmail: string | null
  raw: PayPalCaptureOrderResponse
}

export class PayPalApiError extends Error {
  statusCode: number
  details?: unknown

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message)
    this.name = 'PayPalApiError'
    this.statusCode = statusCode
    this.details = details
  }
}

let accessTokenCache: { token: string; expiresAt: number } | null = null

function serializePayPalError(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return undefined
  }

  return payload
}

async function getAccessToken() {
  const config = requireBillingConfig()

  if (accessTokenCache && accessTokenCache.expiresAt > Date.now() + 10_000) {
    return accessTokenCache.token
  }

  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')
  const response = await fetch(`${config.baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number; error_description?: string; error?: string }
    | null

  if (!response.ok || !payload?.access_token) {
    throw new PayPalApiError(
      payload?.error_description || payload?.error || 'Unable to authenticate with PayPal.',
      response.status || 500,
      payload,
    )
  }

  accessTokenCache = {
    token: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 300) * 1000,
  }

  return payload.access_token
}

async function paypalRequest<T>(
  path: string,
  init: RequestInit,
  options?: {
    requestId?: string
  },
) {
  const config = requireBillingConfig()
  const token = await getAccessToken()

  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options?.requestId ? { 'PayPal-Request-Id': options.requestId } : {}),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => null)) as T | null

  if (!response.ok) {
    const details = serializePayPalError(payload)
    const message =
      (details &&
      typeof details === 'object' &&
      'message' in details &&
      typeof details.message === 'string'
        ? details.message
        : null) || 'PayPal request failed.'

    throw new PayPalApiError(message, response.status || 500, details)
  }

  if (!payload) {
    throw new PayPalApiError('PayPal returned an empty response.', response.status || 500)
  }

  return payload
}

export async function createPayPalOrder(input: {
  amount: string
  currency: string
  description: string
  customId: string
  requestId: string
  returnUrl: string
  cancelUrl: string
  locale: 'he' | 'en'
}) {
  const config = requireBillingConfig()

  const payload = await paypalRequest<PayPalCreateOrderResponse>(
    '/v2/checkout/orders',
    {
      method: 'POST',
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: input.customId,
            custom_id: input.customId,
            description: input.description,
            amount: {
              currency_code: input.currency,
              value: input.amount,
            },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: config.brandName,
              user_action: 'PAY_NOW',
              shipping_preference: 'NO_SHIPPING',
              locale: input.locale === 'he' ? 'he-IL' : 'en-US',
              return_url: input.returnUrl,
              cancel_url: input.cancelUrl,
            },
          },
        },
      }),
    },
    { requestId: input.requestId },
  )

  const approvalUrl =
    payload.links?.find((link) => link.rel === 'payer-action' || link.rel === 'approve')?.href ?? null

  if (!approvalUrl) {
    throw new PayPalApiError('PayPal did not return an approval URL.', 500, payload)
  }

  return {
    id: payload.id,
    status: payload.status,
    approvalUrl,
  } satisfies PayPalOrderResult
}

export async function capturePayPalOrder(orderId: string, requestId: string) {
  const payload = await paypalRequest<PayPalCaptureOrderResponse>(
    `/v2/checkout/orders/${orderId}/capture`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
    { requestId },
  )

  const capture = payload.purchase_units?.[0]?.payments?.captures?.[0]

  if (!capture?.id || !capture.amount?.value || !capture.amount.currency_code) {
    throw new PayPalApiError('PayPal capture response was missing capture details.', 500, payload)
  }

  return {
    orderId: payload.id,
    orderStatus: payload.status,
    captureId: capture.id,
    captureStatus: capture.status,
    amount: capture.amount.value,
    currency: capture.amount.currency_code,
    payerEmail: payload.payer?.email_address ?? null,
    raw: payload,
  } satisfies PayPalCaptureResult
}

export async function verifyPayPalWebhookSignature(headers: Headers, event: unknown) {
  const webhookId = requirePayPalWebhookId()

  const payload = await paypalRequest<PayPalVerificationResponse>('/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    body: JSON.stringify({
      auth_algo: headers.get('paypal-auth-algo'),
      cert_url: headers.get('paypal-cert-url'),
      transmission_id: headers.get('paypal-transmission-id'),
      transmission_sig: headers.get('paypal-transmission-sig'),
      transmission_time: headers.get('paypal-transmission-time'),
      webhook_id: webhookId,
      webhook_event: event,
    }),
  })

  return payload.verification_status === 'SUCCESS'
}
