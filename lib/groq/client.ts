import Groq from 'groq-sdk'

import { requireGroqApiKey } from '@/lib/env'

let client: Groq | undefined

export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-20b'

export function createGroqClient() {
  if (!client) {
    client = new Groq({
      apiKey: requireGroqApiKey(),
      timeout: 20_000,
      maxRetries: 1,
    })
  }

  return client
}
