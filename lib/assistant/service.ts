import { createGroqClient, DEFAULT_GROQ_MODEL } from '@/lib/groq/client'
import { hasGroqApiKey } from '@/lib/env'
import type { AssistantMode, AssistantRole } from './context'
import { resolvePageHelpContext } from './context'
import { buildAssistantSystemPrompt, buildAssistantUserPrompt } from './prompt'

interface AssistantRequest {
  locale: 'en' | 'he'
  role: AssistantRole
  mode: AssistantMode
  page: string | null
  message: string
}

export interface AssistantResponse {
  reply: string
  starterPrompts: string[]
}

export async function handleAssistantRequest(input: AssistantRequest): Promise<AssistantResponse> {
  const pageContext = resolvePageHelpContext(input.page, input.role)
  const systemPrompt = buildAssistantSystemPrompt(input.locale)
  const userPrompt = buildAssistantUserPrompt({
    role: input.role,
    mode: input.mode,
    locale: input.locale,
    pageContext,
    userQuestion: input.message,
  })

  const fallbackReply =
    input.locale === 'he'
      ? 'אפשר לסייע רק בהסברים על המוצר והניווט בו. נסה לשאול מה המשמעות של הדף, הכפתור או הציון שאתה רואה.'
      : 'I can help only with product navigation and explaining what you see. Try asking about the page, a button, or your score.'

  if (!hasGroqApiKey()) {
    return {
      reply: fallbackReply,
      starterPrompts: pageContext.starterPrompts[input.role === 'admin' ? 'admin' : 'employee'],
    }
  }

  const client = createGroqClient()
  const completion = await client.chat.completions.create({
    model: DEFAULT_GROQ_MODEL,
    temperature: 0.3,
    max_tokens: 320,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })

  const reply =
    completion.choices[0]?.message?.content?.trim() ||
    (input.locale === 'he'
      ? 'לא הצלחתי להשיב כרגע. נסו שוב בעוד רגע.'
      : 'I could not generate a reply right now. Please try again.')

  return {
    reply,
    starterPrompts: pageContext.starterPrompts[input.role === 'admin' ? 'admin' : 'employee'],
  }
}
