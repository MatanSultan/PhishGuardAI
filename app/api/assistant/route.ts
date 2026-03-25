import { NextResponse } from 'next/server'
import { z } from 'zod'

import type { AssistantMode, AssistantRole } from '@/lib/assistant/context'
import { handleAssistantRequest } from '@/lib/assistant/service'
import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { getCurrentOrganizationContext } from '@/lib/organizations/service'

const schema = z.object({
  message: z.string().min(2).max(500),
  page: z.string().max(120).optional().nullable(),
  locale: z.enum(['en', 'he']).optional().default('en'),
})

const ADMIN_ONLY_PREFIXES = ['admin', 'leaderboard', 'organization']

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return jsonError('Invalid request.', 400, parsed.error.flatten())
    }

    const { message, page, locale } = parsed.data
    const { supabase, user } = await getAuthenticatedRequestContext()

    if (!user) {
      return jsonError('Unauthorized', 401)
    }

    const orgContext = await getCurrentOrganizationContext(supabase, user.id)
    const role: AssistantRole = orgContext ? orgContext.membership.role : 'individual'
    const mode: AssistantMode = orgContext ? 'organization' : 'individual'

    const normalizedPage = page ? page.replace(/^\/+|\/+$/g, '') : null
    if (
      role !== 'admin' &&
      normalizedPage &&
      ADMIN_ONLY_PREFIXES.some((prefix) => normalizedPage.startsWith(prefix))
    ) {
      return NextResponse.json({
        reply:
          locale === 'he'
            ? 'העוזר לא יכול לשתף מידע ניהולי. פנה למנהל מערכת.'
            : 'This help is only available to admins. Please ask an organization admin.',
        starterPrompts: [],
      })
    }

    const response = await handleAssistantRequest({
      locale,
      role,
      mode,
      page: normalizedPage,
      message,
    })

    return NextResponse.json(response)
  } catch (error) {
    return jsonError('Unable to process assistant request.', 400, error)
  }
}
