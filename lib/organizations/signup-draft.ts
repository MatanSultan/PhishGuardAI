import { DEFAULT_ORGANIZATION_TYPE, type OrganizationType } from '@/lib/constants'
import { normalizeOrganizationType } from '@/lib/organizations/segments'

export interface OrganizationSignupDraft {
  name: string
  organizationType: OrganizationType
  industry: string
}

function readTrimmedString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export function extractOrganizationSignupDraft(
  metadata: Record<string, unknown> | null | undefined,
) {
  const name = readTrimmedString(metadata?.organization)
  const organizationType = normalizeOrganizationType(
    readTrimmedString(metadata?.organization_type),
  )
  const industry = readTrimmedString(metadata?.organization_industry)

  if (!name && !industry && organizationType === DEFAULT_ORGANIZATION_TYPE) {
    return null
  }

  return {
    name,
    organizationType,
    industry,
  } satisfies OrganizationSignupDraft
}
