import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  GROQ_API_KEY: z.string().min(1).optional(),
  APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
})

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  APP_URL: process.env.APP_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
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
