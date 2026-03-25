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
  const nextAction =
    pageContext.actions[0] ||
    (input.locale === 'he' ? 'פתחו את לוח הבקרה והתחילו אימון' : 'Open the dashboard and start training')

  const userPrompt = buildAssistantUserPrompt({
    role: input.role,
    mode: input.mode,
    locale: input.locale,
    pageContext,
    userQuestion: input.message,
  })

  const fallbackReply =
    input.locale === 'he'
      ? `אני כאן כדי לכוון בתוך PhishGuard AI. אני יכול להסביר את הדף ולהציע צעד הבא. צעד מומלץ: ${nextAction}.`
      : `I’m here to guide you inside PhishGuard AI. I can explain this page and suggest what to do next. Recommended next step: ${nextAction}.`

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
      ? `לא הצלחתי להשיב כרגע. נסו את הצעד הבא: ${nextAction}.`
      : `I could not generate a reply right now. Try this next: ${nextAction}.`)

  return {
    reply,
    starterPrompts: pageContext.starterPrompts[input.role === 'admin' ? 'admin' : 'employee'],
  }
}
