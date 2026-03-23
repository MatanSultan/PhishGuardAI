import {
  SIMULATION_CATEGORIES,
  STARTER_DOMAIN_SUGGESTIONS,
  type OrganizationType,
  type SimulationCategory,
} from '@/lib/constants'
import { getOrganizationSuggestedDomains } from '@/lib/organizations/segments'

export function normalizePreferredDomains(
  domains: readonly (SimulationCategory | string | null | undefined)[] | null | undefined,
) {
  if (!domains?.length) {
    return [] as SimulationCategory[]
  }

  const unique = new Set<SimulationCategory>()

  domains.forEach((domain) => {
    if (typeof domain === 'string' && SIMULATION_CATEGORIES.includes(domain as SimulationCategory)) {
      unique.add(domain as SimulationCategory)
    }
  })

  return Array.from(unique)
}

export function getSuggestedStarterDomains(
  organizationType?: OrganizationType | null,
  industry?: string | null,
) {
  if (organizationType) {
    return getOrganizationSuggestedDomains(organizationType, industry)
  }

  return [...STARTER_DOMAIN_SUGGESTIONS] as SimulationCategory[]
}
