import { z } from 'zod'

import { SIMULATION_CATEGORIES } from '@/lib/constants'

export const updatePreferredDomainsSchema = z.object({
  domains: z.array(z.enum(SIMULATION_CATEGORIES)).max(SIMULATION_CATEGORIES.length).default([]),
})
