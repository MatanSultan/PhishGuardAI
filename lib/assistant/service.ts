import { createGroqClient, DEFAULT_GROQ_MODEL } from '@/lib/groq/client'
import { hasGroqApiKey } from '@/lib/env'
import type { AssistantMode, AssistantRole, PageHelpContext } from './context'
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

type DetectedIntent =
  | 'invite'
  | 'risk_score'
  | 'improve'
  | 'start_training'
  | 'reports'
  | null

function detectIntent(message: string, locale: 'en' | 'he'): DetectedIntent {
  const text = message.toLowerCase()
  const match = (patterns: string[]) => patterns.some((p) => text.includes(p))

  if (match(['invite', 'invites', 'הזמן', 'להזמין', 'הזמנה', 'לצרף', 'להוסיף עובד', 'להוסיף עובדים'])) {
    return 'invite'
  }
  if (match(['risk score', 'risk', 'ציון סיכון', 'סיכון ארגוני', 'riskscore'])) {
    return 'risk_score'
  }
  if (match(['improve', 'improvement', 'improve score', 'להשתפר', 'שיפור', 'איך משתפר'])) {
    return 'improve'
  }
  if (
    match(['start training', 'begin training', 'training', 'אימון', 'להתחיל אימון', 'תרגיל']) &&
    !match(['report', 'דוח', 'דוחות'])
  ) {
    return 'start_training'
  }
  if (match(['report', 'reports', 'דוח', 'דוחות'])) {
    return 'reports'
  }
  return null
}

function intentReply(
  intent: DetectedIntent,
  input: AssistantRequest,
  pageContext: PageHelpContext,
): AssistantResponse | null {
  if (!intent) return null
  const isAdmin = input.role === 'admin'
  const starterPrompts = pageContext.starterPrompts[isAdmin ? 'admin' : 'employee']

  const replyByIntent: Partial<Record<NonNullable<DetectedIntent>, string>> = {
    invite: isAdmin
      ? input.locale === 'he'
        ? 'להזמין עובדים: Admin → Invites, לחצו "Invite", העתקו את הקישור ושלחו. אחרי ההצטרפות הפעילו סימולציה ראשונה.'
        : 'To invite employees: go to Admin → Invites, click "Invite", copy the link and send it. After they join, launch the first simulation.'
      : input.locale === 'he'
        ? 'רק מנהל יכול להזמין. פנה למנהל שיכנס ל-Admin → Invites וישלח לך קישור.'
        : 'Only an admin can send invites. Ask an admin to open Admin → Invites and send you the link.',

    risk_score: isAdmin
      ? input.locale === 'he'
        ? 'Risk Score הוא 0–100. Admin → Reports, סננו לפי ערוץ חלש והקצו רענון למי שמופיע שם.'
        : 'Risk Score is 0–100. Admin → Reports, filter by weakest channel and assign refreshers to those listed.'
      : input.locale === 'he'
        ? 'הציון האישי משקף דיוק בזיהוי. Dashboard → Start training, השלימו שני תרגילים בערוץ שבו טעיתם.'
        : 'Your personal score reflects detection accuracy. Dashboard → Start training and do two drills in the channel you missed.',

    improve: isAdmin
      ? input.locale === 'he'
        ? 'לשפר ביצועים: Admin → Reports, בחרו ערוץ חלש, הקצו רענון ממוקד ואז בדקו שוב את Risk Score.'
        : 'To improve: Admin → Reports, pick the weakest channel, assign a targeted refresher, then recheck the Risk Score.'
      : input.locale === 'he'
        ? 'כדי להשתפר: Training → בחרו את הערוץ שבו טעיתם, השלימו שני תרגילים וקראו את המשוב.'
        : 'To improve: go to Training, choose the channel you missed, complete two drills, and read the feedback.',

    start_training:
      input.locale === 'he'
        ? 'להתחיל אימון: Dashboard → Start training, פתחו סימולציה, סמנו בטוח/פישינג וקראו את המשוב.'
        : 'To start training: Dashboard → Start training, open a simulation, mark safe/phishing, and read the feedback.',

    reports: isAdmin
      ? input.locale === 'he'
        ? 'דוחות: Admin → Reports. סננו לפי צוות/ערוץ, פתחו דוח והשתמשו בהמלצות לרענון.'
        : 'Reports: Admin → Reports. Filter by team/channel, open a report, and use the refresher recommendations.'
      : input.locale === 'he'
        ? 'הדוח האישי ב-Reports. פתחו את הניסיון האחרון וקראו את המשוב כדי לדעת מה לתקן.'
        : 'Your personal report is in Reports. Open your latest attempt and read the feedback to know what to fix.',
  }

  const reply = replyByIntent[intent]
  if (!reply) return null

  return {
    reply,
    starterPrompts,
  }
}

export async function handleAssistantRequest(input: AssistantRequest): Promise<AssistantResponse> {
  const pageContext = resolvePageHelpContext(input.page, input.role)
  const systemPrompt = buildAssistantSystemPrompt(input.locale)
  const nextAction =
    pageContext.actions[0] ||
    (input.locale === 'he' ? 'פתחו את לוח הבקרה והתחילו אימון' : 'Open the dashboard and start training')

  const intent = detectIntent(input.message, input.locale)
  console.log('[assistant]', { intent, page: input.page, role: input.role, locale: input.locale })

  const intentResponse = intentReply(intent, input, pageContext)
  if (intentResponse) {
    return intentResponse
  }

  const userPrompt = buildAssistantUserPrompt({
    role: input.role,
    mode: input.mode,
    locale: input.locale,
    pageContext,
    userQuestion: input.message,
  })

  const fallbackReply =
    input.locale === 'he'
      ? `אני כאן כדי לכוון בתוך PhishGuard AI. צעד מומלץ: ${nextAction}.`
      : `I’m here to guide you inside PhishGuard AI. Suggested next step: ${nextAction}.`

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
    max_tokens: 300,
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
