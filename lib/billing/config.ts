import { z } from 'zod'

import { APP_NAME, PLAN_STATUSES, PLAN_TYPES } from '@/lib/constants'
import { env } from '@/lib/env'

const billingConfigSchema = z.object({
  clientId: z.string().min(1, 'PAYPAL_CLIENT_ID is required'),
  clientSecret: z.string().min(1, 'PAYPAL_CLIENT_SECRET is required'),
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
  upgradeAmount: z
    .string()
    .refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, 'PAYPAL_UPGRADE_AMOUNT must be a positive number')
    .transform((value) => Number(value).toFixed(2)),
  upgradeCurrency: z.string().trim().min(3).transform((value) => value.toUpperCase()),
  targetPlanType: z.enum(PLAN_TYPES).default('growth'),
  targetPlanStatus: z.enum(PLAN_STATUSES).default('active_paid'),
  targetMaxMembers: z
    .string()
    .refine((value) => Number.isFinite(Number(value)) && Number(value) >= 1, 'PAYPAL_UPGRADE_MAX_MEMBERS must be at least 1')
    .transform((value) => Math.round(Number(value))),
  appUrl: z.string().url(),
})

type BillingConfig = z.infer<typeof billingConfigSchema> & {
  baseUrl: string
  brandName: string
}

function buildBillingConfig(): BillingConfig {
  const appUrl = env.APP_URL ?? env.NEXT_PUBLIC_APP_URL

  if (!appUrl) {
    throw new Error('APP_URL or NEXT_PUBLIC_APP_URL is required for PayPal billing callbacks.')
  }

  const parsed = billingConfigSchema.parse({
    clientId: env.PAYPAL_CLIENT_ID,
    clientSecret: env.PAYPAL_CLIENT_SECRET,
    environment: env.PAYPAL_ENVIRONMENT ?? 'sandbox',
    upgradeAmount: env.PAYPAL_UPGRADE_AMOUNT ?? '0.01',
    upgradeCurrency: env.PAYPAL_UPGRADE_CURRENCY ?? 'ILS',
    targetPlanType: env.PAYPAL_UPGRADE_PLAN_TYPE ?? 'growth',
    targetPlanStatus: env.PAYPAL_UPGRADE_PLAN_STATUS ?? 'active_paid',
    targetMaxMembers: env.PAYPAL_UPGRADE_MAX_MEMBERS ?? '25',
    appUrl,
  })

  return {
    ...parsed,
    baseUrl:
      parsed.environment === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com',
    brandName: APP_NAME,
  }
}

export function requireBillingConfig() {
  return buildBillingConfig()
}

export function requirePayPalWebhookId() {
  if (!env.PAYPAL_WEBHOOK_ID) {
    throw new Error('PAYPAL_WEBHOOK_ID is required for webhook verification.')
  }

  return env.PAYPAL_WEBHOOK_ID
}
