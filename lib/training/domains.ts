import {
  SIMULATION_CATEGORIES,
  STARTER_DOMAIN_SUGGESTIONS,
  type SimulationCategory,
} from '@/lib/constants'

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

export function getSuggestedStarterDomains() {
  return [...STARTER_DOMAIN_SUGGESTIONS] as SimulationCategory[]
}
