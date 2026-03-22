import type { SimulationCategory } from '@/lib/constants'

const INDUSTRY_DOMAIN_MAP: Array<{
  keywords: string[]
  domains: SimulationCategory[]
}> = [
  {
    keywords: ['finance', 'bank', 'fintech', 'insurance', 'payments'],
    domains: ['bank', 'account_security', 'government'],
  },
  {
    keywords: ['retail', 'commerce', 'shopping', 'e-commerce'],
    domains: ['shopping', 'delivery', 'account_security'],
  },
  {
    keywords: ['logistics', 'delivery', 'transport', 'supply'],
    domains: ['delivery', 'workplace', 'account_security'],
  },
  {
    keywords: ['technology', 'software', 'saas', 'it'],
    domains: ['account_security', 'workplace', 'social'],
  },
  {
    keywords: ['health', 'medical', 'healthcare'],
    domains: ['government', 'account_security', 'delivery'],
  },
  {
    keywords: ['public', 'government', 'municipal', 'education'],
    domains: ['government', 'workplace', 'account_security'],
  },
]

export function getIndustrySuggestedDomains(industry: string | null | undefined): SimulationCategory[] {
  const normalized = industry?.trim().toLowerCase()

  if (!normalized) {
    return []
  }

  return (
    INDUSTRY_DOMAIN_MAP.find((entry) =>
      entry.keywords.some((keyword) => normalized.includes(keyword)),
    )?.domains ?? []
  )
}
