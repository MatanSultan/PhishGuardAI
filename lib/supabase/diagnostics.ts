import { env } from '@/lib/env'

interface SupabaseJwtClaims {
  ref?: string
  role?: string
  iss?: string
}

export interface SupabaseEnvDiagnostics {
  urlHost: string
  urlProjectRef: string | null
  anonKeyKind: 'publishable' | 'jwt' | 'unknown'
  anonKeyProjectRef: string | null
  anonKeyRole: string | null
  serviceKeyKind: 'jwt' | 'unknown'
  serviceKeyProjectRef: string | null
  serviceKeyRole: string | null
  serviceKeyMatchesUrl: boolean | null
  nodeEnv: string
}

function decodeBase64PayloadSegment(value: string) {
  try {
    return Buffer.from(value, 'base64').toString('utf8')
  } catch {
    return null
  }
}

function decodeSupabaseJwtClaims(token: string | null | undefined): SupabaseJwtClaims | null {
  if (!token) {
    return null
  }

  const segments = token.split('.')
  if (segments.length < 2) {
    return null
  }

  const payload = segments[1]?.replace(/-/g, '+').replace(/_/g, '/')
  if (!payload) {
    return null
  }

  const json = decodeBase64PayloadSegment(payload)
  if (!json) {
    return null
  }

  try {
    return JSON.parse(json) as SupabaseJwtClaims
  } catch {
    return null
  }
}

export function getSupabaseProjectRefFromUrl(url: string | null | undefined) {
  if (!url) {
    return null
  }

  try {
    const hostname = new URL(url).hostname
    if (hostname.endsWith('.supabase.co')) {
      return hostname.split('.')[0] ?? null
    }

    return hostname || null
  } catch {
    return null
  }
}

export function getSupabaseEnvDiagnostics(): SupabaseEnvDiagnostics {
  const urlHost = new URL(env.NEXT_PUBLIC_SUPABASE_URL).host
  const urlProjectRef = getSupabaseProjectRefFromUrl(env.NEXT_PUBLIC_SUPABASE_URL)
  const anonClaims = decodeSupabaseJwtClaims(env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const serviceClaims = decodeSupabaseJwtClaims(env.SUPABASE_SERVICE_ROLE_KEY)
  const anonKeyKind = env.NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWith('sb_publishable_')
    ? 'publishable'
    : anonClaims
      ? 'jwt'
      : 'unknown'
  const serviceKeyKind = serviceClaims ? 'jwt' : 'unknown'

  return {
    urlHost,
    urlProjectRef,
    anonKeyKind,
    anonKeyProjectRef: anonClaims?.ref ?? null,
    anonKeyRole: anonClaims?.role ?? null,
    serviceKeyKind,
    serviceKeyProjectRef: serviceClaims?.ref ?? null,
    serviceKeyRole: serviceClaims?.role ?? null,
    serviceKeyMatchesUrl:
      serviceClaims?.ref && urlProjectRef ? serviceClaims.ref === urlProjectRef : null,
    nodeEnv: process.env.NODE_ENV ?? 'development',
  }
}

export function assertServiceRoleConfiguration() {
  const diagnostics = getSupabaseEnvDiagnostics()

  if (diagnostics.serviceKeyKind === 'jwt' && diagnostics.serviceKeyRole !== 'service_role') {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY is misconfigured. Expected role "service_role" but received "${diagnostics.serviceKeyRole ?? 'unknown'}" for project "${diagnostics.serviceKeyProjectRef ?? diagnostics.urlProjectRef ?? diagnostics.urlHost}".`,
    )
  }

  if (diagnostics.serviceKeyMatchesUrl === false) {
    throw new Error(
      `Supabase project mismatch detected. NEXT_PUBLIC_SUPABASE_URL points to "${diagnostics.urlProjectRef ?? diagnostics.urlHost}" but SUPABASE_SERVICE_ROLE_KEY points to "${diagnostics.serviceKeyProjectRef ?? 'unknown'}".`,
    )
  }

  return diagnostics
}
