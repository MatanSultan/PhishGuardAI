import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  GROQ_API_KEY: z.string().min(1).optional(),
  APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  OWNER_EMAILS: z.string().optional(),
  PAYPAL_CLIENT_ID: z.string().min(1).optional(),
  PAYPAL_CLIENT_SECRET: z.string().min(1).optional(),
  PAYPAL_ENVIRONMENT: z.string().optional(),
  PAYPAL_WEBHOOK_ID: z.string().min(1).optional(),
  PAYPAL_UPGRADE_AMOUNT: z.string().optional(),
  PAYPAL_UPGRADE_CURRENCY: z.string().optional(),
  PAYPAL_UPGRADE_PLAN_TYPE: z.string().optional(),
  PAYPAL_UPGRADE_PLAN_STATUS: z.string().optional(),
  PAYPAL_UPGRADE_MAX_MEMBERS: z.string().optional(),
})

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  APP_URL: process.env.APP_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  OWNER_EMAILS: process.env.OWNER_EMAILS,
  PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
  PAYPAL_ENVIRONMENT: process.env.PAYPAL_ENVIRONMENT,
  PAYPAL_WEBHOOK_ID: process.env.PAYPAL_WEBHOOK_ID,
  PAYPAL_UPGRADE_AMOUNT: process.env.PAYPAL_UPGRADE_AMOUNT,
  PAYPAL_UPGRADE_CURRENCY: process.env.PAYPAL_UPGRADE_CURRENCY,
  PAYPAL_UPGRADE_PLAN_TYPE: process.env.PAYPAL_UPGRADE_PLAN_TYPE,
  PAYPAL_UPGRADE_PLAN_STATUS: process.env.PAYPAL_UPGRADE_PLAN_STATUS,
  PAYPAL_UPGRADE_MAX_MEMBERS: process.env.PAYPAL_UPGRADE_MAX_MEMBERS,
})

export function getAppUrl() {
  return env.APP_URL ?? env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

export function hasGroqApiKey() {
  return Boolean(env.GROQ_API_KEY)
}

export function requireGroqApiKey() {
  if (!env.GROQ_API_KEY) {
    throw new Error('Missing GROQ_API_KEY. AI-backed simulation generation requires a Groq API key.')
  }

  return env.GROQ_API_KEY
}
