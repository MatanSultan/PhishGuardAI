import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'
import type { OrganizationType } from '@/lib/constants'
import { getProfileBundle, updateTrainingProfile } from '@/lib/profile/service'
import { getOrganizationSuggestedDomains } from '@/lib/organizations/segments'
import { normalizePreferredDomains } from '@/lib/training/domains'

export async function applyOrganizationStarterDomains(
  supabase: SupabaseClient<Database>,
  userId: string,
  organizationType: OrganizationType,
  industry?: string | null,
) {
  const bundle = await getProfileBundle(supabase, userId)
  const existingDomains = normalizePreferredDomains(bundle.trainingProfile.preferred_domains)

  if (existingDomains.length) {
    return bundle.trainingProfile
  }

  const suggestedDomains = getOrganizationSuggestedDomains(organizationType, industry)

  if (!suggestedDomains.length) {
    return bundle.trainingProfile
  }

  return updateTrainingProfile(supabase, userId, {
    preferred_domains: suggestedDomains,
  })
}

