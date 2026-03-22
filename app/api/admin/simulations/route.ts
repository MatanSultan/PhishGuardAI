import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { AuthorizationError, requireOrganizationAdmin } from '@/lib/permissions'

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext()

    if (!user) {
      return jsonError('Unauthorized', 401)
    }

    await requireOrganizationAdmin(supabase, user.id)

    const { data, error } = await supabase
      .from('simulations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) {
      throw error
    }

    return NextResponse.json({ simulations: data ?? [] })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, error.statusCode)
    }

    return jsonError('Unable to load simulations.', 400, error)
  }
}
