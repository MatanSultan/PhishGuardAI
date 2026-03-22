import { NextResponse } from 'next/server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

function serializeSafeErrorDetails(details: unknown) {
  if (!details || process.env.NODE_ENV === 'production') {
    return undefined
  }

  if (details instanceof Error) {
    return {
      message: details.message,
      name: details.name,
    }
  }

  if (typeof details === 'string') {
    return {
      message: details,
    }
  }

  return undefined
}

export function jsonError(message: string, status = 400, details?: unknown) {
  const safeDetails = serializeSafeErrorDetails(details)

  return NextResponse.json(
    {
      error: message,
      ...(safeDetails ? { details: safeDetails } : {}),
    },
    { status },
  )
}

export async function getAuthenticatedRequestContext() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  return {
    supabase,
    user,
  }
}
