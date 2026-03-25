import { NextResponse } from 'next/server'

import { getAuthenticatedRequestContext, jsonError } from '@/lib/api'
import { getOrganizationSimulationKeywords } from '@/lib/organizations/segments'
import { getCurrentOrganizationContext } from '@/lib/organizations/service'
import { AuthorizationError, requireOrganizationAdmin } from '@/lib/permissions'

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext()

    if (!user) {
      return jsonError('Unauthorized', 401)
    }

    await requireOrganizationAdmin(supabase, user.id)
    const organizationContext = await getCurrentOrganizationContext(supabase, user.id)

    const { data, error } = await supabase
      .from('simulations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(60)

    if (error) {
      throw error
    }

    const keywords = getOrganizationSimulationKeywords(
      organizationContext?.organization.organization_type,
    ).map((keyword) => keyword.toLowerCase())

    const scoredSimulations = [...(data ?? [])].sort((left, right) => {
      const leftText = [left.title, left.sender, left.content, left.explanation]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const rightText = [right.title, right.sender, right.content, right.explanation]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const leftScore = keywords.reduce(
        (score, keyword) => score + (leftText.includes(keyword) ? 1 : 0),
        0,
      )
      const rightScore = keywords.reduce(
        (score, keyword) => score + (rightText.includes(keyword) ? 1 : 0),
        0,
      )

      if (leftScore !== rightScore) {
        return rightScore - leftScore
      }

      return right.created_at.localeCompare(left.created_at)
    })

    return NextResponse.json({ simulations: scoredSimulations.slice(0, 30) })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, error.statusCode)
    }

    return jsonError('Unable to load simulations.', 400, error)
  }
}
